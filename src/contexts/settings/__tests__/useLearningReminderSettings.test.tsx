import { act, renderHook } from "@testing-library/react-native";

import {
  cancelLearningReminderNotification,
  reconcileReminders,
  requestReminderPermissions,
} from "@/src/features/notifications";
import { useLearningReminderSettings } from "../useLearningReminderSettings";

const mockPersistedValues = new Map<string, unknown>();
const mockPersistedSetters = new Map<string, jest.Mock>();

jest.mock("@/src/hooks/usePersistedState", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  return {
    usePersistedState: jest.fn((key: string, initialValue: unknown) => {
      const [value, setValue] = React.useState(() =>
        mockPersistedValues.has(key) ? mockPersistedValues.get(key) : initialValue
      );
      const setter = mockPersistedSetters.get(key) ?? jest.fn();
      mockPersistedSetters.set(key, setter);
      return [
        value,
        async (nextValue: unknown) => {
          mockPersistedValues.set(key, nextValue);
          setter(nextValue);
          setValue(nextValue);
        },
      ];
    }),
  };
});

jest.mock("@/src/features/notifications", () => ({
  cancelLearningReminderNotification: jest.fn(async () => {}),
  reconcileReminders: jest.fn(async () => ({
    permissionState: "granted",
    plan: [],
    nextAt: new Date("2026-01-10T18:00:00.000Z").getTime(),
    profile: "evening",
  })),
  requestReminderPermissions: jest.fn(),
}));

const mockedCancelLearningReminderNotification = jest.mocked(
  cancelLearningReminderNotification
);
const mockedReconcileReminders = jest.mocked(reconcileReminders);
const mockedRequestReminderPermissions = jest.mocked(requestReminderPermissions);

function setPersistedState(values: Record<string, unknown>) {
  mockPersistedValues.clear();
  for (const [key, value] of Object.entries(values)) {
    mockPersistedValues.set(key, value);
  }
}

function getPersistedSetter(key: string) {
  return mockPersistedSetters.get(key) ?? jest.fn();
}

describe("useLearningReminderSettings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPersistedSetters.clear();
    setPersistedState({});
    mockedRequestReminderPermissions.mockResolvedValue("granted");
    mockedReconcileReminders.mockResolvedValue({
      permissionState: "granted",
      plan: [],
      nextAt: new Date("2026-01-10T18:00:00.000Z").getTime(),
      profile: "evening",
    });
  });

  it("enables granted reminders and reconciles settings", async () => {
    const { result } = renderHook(() =>
      useLearningReminderSettings({ pinnedOfficialCourseIds: [101, 202] })
    );

    await act(async () => {
      await result.current.setLearningRemindersEnabled(true);
    });

    expect(mockedRequestReminderPermissions).toHaveBeenCalledTimes(1);
    expect(getPersistedSetter("learningRemindersEnabled")).toHaveBeenCalledWith(
      true
    );
    expect(mockedReconcileReminders).toHaveBeenCalledWith(
      "settings_changed",
      {
        enabled: true,
        pinnedOfficialCourseIds: [101, 202],
        automaticEnabled: true,
        manualHour: 19,
      }
    );
    expect(getPersistedSetter("learningReminder.nextAt")).toHaveBeenCalledWith(
      new Date("2026-01-10T18:00:00.000Z").getTime()
    );
    expect(getPersistedSetter("learningReminder.permissionState")).toHaveBeenCalledWith(
      "granted"
    );
  });

  it("keeps reminders disabled when permission request is denied", async () => {
    mockedRequestReminderPermissions.mockResolvedValue("denied");
    const { result } = renderHook(() =>
      useLearningReminderSettings({ pinnedOfficialCourseIds: [] })
    );

    await act(async () => {
      await result.current.setLearningRemindersEnabled(true);
    });

    expect(getPersistedSetter("learningReminder.permissionState")).toHaveBeenCalledWith(
      "denied"
    );
    expect(getPersistedSetter("learningRemindersEnabled")).toHaveBeenCalledWith(
      false
    );
    expect(mockedCancelLearningReminderNotification).toHaveBeenCalledTimes(1);
    expect(getPersistedSetter("learningReminder.nextAt")).toHaveBeenCalledWith(null);
    expect(mockedReconcileReminders).not.toHaveBeenCalled();
  });

  it("disables reminders by cancelling schedule and clearing next date/profile", async () => {
    setPersistedState({
      learningRemindersEnabled: true,
      "learningReminder.nextAt": new Date("2026-01-10T18:00:00.000Z").getTime(),
      "learningReminder.profile": "evening",
    });
    const { result } = renderHook(() =>
      useLearningReminderSettings({ pinnedOfficialCourseIds: [] })
    );

    await act(async () => {
      await result.current.setLearningRemindersEnabled(false);
    });

    expect(getPersistedSetter("learningRemindersEnabled")).toHaveBeenCalledWith(
      false
    );
    expect(mockedCancelLearningReminderNotification).toHaveBeenCalledTimes(1);
    expect(getPersistedSetter("learningReminder.nextAt")).toHaveBeenCalledWith(null);
    expect(getPersistedSetter("learningReminder.profile")).toHaveBeenCalledWith(
      "unknown"
    );
  });

  it("normalizes manual hour and reconciles when enabled", async () => {
    setPersistedState({
      learningRemindersEnabled: true,
      "learningReminder.automaticEnabled": false,
      "learningReminder.manualHour": 19,
    });
    const { result } = renderHook(() =>
      useLearningReminderSettings({ pinnedOfficialCourseIds: [] })
    );

    await act(async () => {
      await result.current.setLearningReminderManualHour(8.6);
    });

    expect(getPersistedSetter("learningReminder.manualHour")).toHaveBeenCalledWith(
      9
    );
    expect(mockedReconcileReminders).toHaveBeenCalledWith(
      "settings_changed",
      {
        enabled: true,
        pinnedOfficialCourseIds: [],
        automaticEnabled: false,
        manualHour: 9,
      }
    );
  });

  it("reconciles automatic-mode changes only when reminders are enabled", async () => {
    setPersistedState({
      learningRemindersEnabled: true,
      "learningReminder.automaticEnabled": true,
    });
    const { result } = renderHook(() =>
      useLearningReminderSettings({ pinnedOfficialCourseIds: [] })
    );

    await act(async () => {
      await result.current.setLearningReminderAutomaticEnabled(false);
    });

    expect(getPersistedSetter("learningReminder.automaticEnabled")).toHaveBeenCalledWith(
      false
    );
    expect(mockedReconcileReminders).toHaveBeenCalledTimes(1);

    mockedReconcileReminders.mockClear();
    setPersistedState({
      learningRemindersEnabled: false,
      "learningReminder.automaticEnabled": true,
    });
    const disabledHook = renderHook(() =>
      useLearningReminderSettings({ pinnedOfficialCourseIds: [] })
    );

    await act(async () => {
      await disabledHook.result.current.setLearningReminderAutomaticEnabled(false);
    });

    expect(mockedReconcileReminders).not.toHaveBeenCalled();
  });

  it("reconciles completion and stores the next reminder date", async () => {
    setPersistedState({
      learningRemindersEnabled: true,
    });
    const nextAt = new Date("2026-01-10T22:00:00.000Z").getTime();
    mockedReconcileReminders.mockResolvedValueOnce({
      permissionState: "granted",
      plan: [],
      nextAt,
      profile: "night",
    });
    const { result } = renderHook(() =>
      useLearningReminderSettings({ pinnedOfficialCourseIds: [101] })
    );

    await act(async () => {
      await result.current.cancelTodayLearningReminderSchedule("review_completed");
    });

    expect(mockedReconcileReminders).toHaveBeenCalledWith("review_completed", {
      enabled: true,
      pinnedOfficialCourseIds: [101],
      automaticEnabled: true,
      manualHour: 19,
    });
    expect(getPersistedSetter("learningReminder.nextAt")).toHaveBeenCalledWith(
      nextAt
    );
    expect(getPersistedSetter("learningReminder.profile")).toHaveBeenCalledWith(
      "night"
    );
  });
});
