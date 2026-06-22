import { act, renderHook } from "@testing-library/react-native";

import {
  cancelLearningReminderNotification,
  cancelLearningReminderNotificationsForDate,
  getReminderPermissionState,
  requestReminderPermissions,
  scheduleLearningReminderNotifications,
} from "@/src/features/notifications";
import { useLearningReminderSettings } from "../useLearningReminderSettings";
import { countDueReviewsAt } from "@/src/services/dueReviewCount";
import {
  hasDailyStreakProgressOnDate,
  getLearningEventsHourlyDistribution,
  getLearningEventsSummary,
} from "@/src/db/sqlite/db";
import {
  buildDueReminderSeriesEntries,
  buildEndOfDayReminderEntries,
  buildReviewReminderEntries,
  computeSmartReminderPlan,
  inferSmartReminderProfileForTargetMinutes,
} from "@/src/services/smartReminders";

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

jest.mock("@/src/i18n", () => ({
  __esModule: true,
  default: {
    language: "pl",
  },
}));

jest.mock("@/src/db/sqlite/db", () => ({
  hasDailyStreakProgressOnDate: jest.fn(),
  getLearningEventsHourlyDistribution: jest.fn(),
  getLearningEventsSummary: jest.fn(),
}));

jest.mock("@/src/features/notifications", () => ({
  END_OF_DAY_REMINDER_KIND: "end_of_day_reminder",
  REVIEW_REMINDER_KIND: "review_reminder",
  cancelLearningReminderNotification: jest.fn(async () => {}),
  cancelLearningReminderNotificationsForDate: jest.fn(),
  getEndOfDayReminderNotificationTitle: jest.fn(() => "end title"),
  getLearningReminderNotificationTitle: jest.fn(() => "learning title"),
  getReminderPermissionState: jest.fn(),
  getReviewReminderNotificationTitle: jest.fn(() => "review title"),
  requestReminderPermissions: jest.fn(),
  scheduleLearningReminderNotifications: jest.fn(async () => {}),
  selectEndOfDayReminderNotificationBody: jest.fn(() => "end body"),
  selectLearningReminderNotificationBody: jest.fn(() => "learning body"),
  selectReviewReminderNotificationBody: jest.fn(() => "review body"),
}));

jest.mock("@/src/services/dueReviewCount", () => ({
  countDueReviewsAt: jest.fn(),
}));

jest.mock("@/src/services/smartReminders", () => ({
  buildDueReminderSeriesEntries: jest.fn(),
  buildEndOfDayReminderEntries: jest.fn(),
  buildReviewReminderEntries: jest.fn(),
  computeSmartReminderPlan: jest.fn(),
  DEFAULT_MANUAL_REMINDER_HOUR: 19,
  inferSmartReminderProfileForTargetMinutes: jest.fn(),
  normalizeManualReminderHour: jest.fn((value: number) => {
    if (!Number.isFinite(value)) {
      return 19;
    }
    return Math.min(23, Math.max(0, Math.round(value)));
  }),
}));

const mockedCancelLearningReminderNotification = jest.mocked(
  cancelLearningReminderNotification
);
const mockedCancelLearningReminderNotificationsForDate = jest.mocked(
  cancelLearningReminderNotificationsForDate
);
const mockedGetReminderPermissionState = jest.mocked(getReminderPermissionState);
const mockedRequestReminderPermissions = jest.mocked(requestReminderPermissions);
const mockedScheduleLearningReminderNotifications = jest.mocked(
  scheduleLearningReminderNotifications
);
const mockedCountDueReviewsAt = jest.mocked(countDueReviewsAt);
const mockedHasDailyStreakProgressOnDate = jest.mocked(
  hasDailyStreakProgressOnDate
);
const mockedGetLearningEventsHourlyDistribution = jest.mocked(
  getLearningEventsHourlyDistribution
);
const mockedGetLearningEventsSummary = jest.mocked(getLearningEventsSummary);
const mockedBuildDueReminderSeriesEntries = jest.mocked(
  buildDueReminderSeriesEntries
);
const mockedBuildEndOfDayReminderEntries = jest.mocked(
  buildEndOfDayReminderEntries
);
const mockedBuildReviewReminderEntries = jest.mocked(buildReviewReminderEntries);
const mockedComputeSmartReminderPlan = jest.mocked(computeSmartReminderPlan);
const mockedInferSmartReminderProfileForTargetMinutes = jest.mocked(
  inferSmartReminderProfileForTargetMinutes
);

const now = new Date("2026-01-10T12:00:00.000Z");
const learningAt = new Date("2026-01-10T13:00:00.000Z").getTime();
const reviewAt = new Date("2026-01-10T14:00:00.000Z").getTime();
const endOfDayAt = new Date("2026-01-10T23:00:00.000Z").getTime();

function setPersistedState(values: Record<string, unknown>) {
  mockPersistedValues.clear();
  for (const [key, value] of Object.entries(values)) {
    mockPersistedValues.set(key, value);
  }
}

function getPersistedSetter(key: string) {
  return mockPersistedSetters.get(key) ?? jest.fn();
}

function mockSchedulableReminderState() {
  mockedRequestReminderPermissions.mockResolvedValue("granted");
  mockedGetReminderPermissionState.mockResolvedValue("granted");
  mockedGetLearningEventsHourlyDistribution.mockResolvedValue(Array(24).fill(0));
  mockedGetLearningEventsSummary.mockResolvedValue({
    totalEvents: 20,
    activeDays: 5,
  });
  mockedComputeSmartReminderPlan.mockReturnValue({
    profile: "evening",
    targetMinutes: 18 * 60,
    usingFallback: false,
  });
  mockedInferSmartReminderProfileForTargetMinutes.mockReturnValue("morning");
  mockedHasDailyStreakProgressOnDate.mockResolvedValue(false);
  mockedBuildDueReminderSeriesEntries.mockReturnValue([
    { scheduledAt: learningAt, slot: "due" },
  ]);
  mockedCountDueReviewsAt.mockResolvedValue(12);
  mockedBuildReviewReminderEntries.mockImplementation(async (input) => [
    {
      scheduledAt: reviewAt,
      dueReviewCount: await input.countDueReviewsAt(reviewAt),
    },
  ]);
  mockedBuildEndOfDayReminderEntries.mockReturnValue([
    { scheduledAt: endOfDayAt },
  ]);
}

describe("useLearningReminderSettings", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
    jest.clearAllMocks();
    mockPersistedSetters.clear();
    setPersistedState({});
    mockSchedulableReminderState();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("enables granted reminders and schedules learning, review, and end-of-day requests", async () => {
    const { result } = renderHook(() =>
      useLearningReminderSettings({ pinnedOfficialCourseIds: [101, 202] })
    );

    await act(async () => {
      await result.current.setLearningRemindersEnabled(true);
    });

    expect(mockedRequestReminderPermissions).toHaveBeenCalledTimes(1);
    expect(mockedGetReminderPermissionState).toHaveBeenCalledTimes(1);
    expect(getPersistedSetter("learningRemindersEnabled")).toHaveBeenCalledWith(
      true
    );
    expect(mockedCountDueReviewsAt).toHaveBeenCalledWith(
      [101, 202],
      reviewAt
    );
    expect(mockedBuildEndOfDayReminderEntries).toHaveBeenCalledWith(
      expect.objectContaining({
        skipScheduledAt: [learningAt, reviewAt],
      })
    );
    expect(mockedScheduleLearningReminderNotifications).toHaveBeenCalledWith([
      expect.objectContaining({
        when: new Date(learningAt),
        kind: "learning_reminder",
      }),
      expect.objectContaining({
        when: new Date(reviewAt),
        kind: "review_reminder",
        data: {
          dueReviewCount: 12,
          route: "/review",
        },
      }),
      expect.objectContaining({
        when: new Date(endOfDayAt),
        kind: "end_of_day_reminder",
        data: {
          route: "/flashcards",
        },
      }),
    ]);
    expect(result.current.learningReminderNextAt).toBe(learningAt);
    expect(result.current.learningReminderProfile).toBe("evening");
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
    expect(mockedScheduleLearningReminderNotifications).not.toHaveBeenCalled();
  });

  it("disables reminders by cancelling schedule and clearing next date/profile", async () => {
    setPersistedState({
      learningRemindersEnabled: true,
      "learningReminder.nextAt": learningAt,
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

  it("normalizes manual hour and reschedules only when enabled manual mode is active", async () => {
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
    expect(mockedBuildDueReminderSeriesEntries).toHaveBeenCalledWith(
      expect.objectContaining({
        targetMinutes: 9 * 60,
      })
    );
    expect(mockedInferSmartReminderProfileForTargetMinutes).toHaveBeenCalledWith(
      9 * 60
    );
    expect(mockedScheduleLearningReminderNotifications).toHaveBeenCalledTimes(1);

    mockedScheduleLearningReminderNotifications.mockClear();
    setPersistedState({
      learningRemindersEnabled: false,
      "learningReminder.automaticEnabled": false,
      "learningReminder.manualHour": 19,
    });
    const disabledHook = renderHook(() =>
      useLearningReminderSettings({ pinnedOfficialCourseIds: [] })
    );

    await act(async () => {
      await disabledHook.result.current.setLearningReminderManualHour(10);
    });

    expect(mockedScheduleLearningReminderNotifications).not.toHaveBeenCalled();
  });

  it("reschedules automatic-mode changes only when reminders are enabled", async () => {
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
    expect(mockedScheduleLearningReminderNotifications).toHaveBeenCalledTimes(1);

    mockedScheduleLearningReminderNotifications.mockClear();
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

    expect(mockedScheduleLearningReminderNotifications).not.toHaveBeenCalled();
  });

  it("updates next scheduled reminder after cancelling today's reminders", async () => {
    const remainingAt = new Date("2026-01-11T13:00:00.000Z");
    mockedCancelLearningReminderNotificationsForDate.mockResolvedValue([
      new Date("2026-01-10T11:00:00.000Z"),
      remainingAt,
    ]);
    const { result } = renderHook(() =>
      useLearningReminderSettings({ pinnedOfficialCourseIds: [] })
    );

    await act(async () => {
      await result.current.cancelTodayLearningReminderSchedule();
    });

    expect(mockedCancelLearningReminderNotificationsForDate).toHaveBeenCalledWith(
      now
    );
    expect(getPersistedSetter("learningReminder.nextAt")).toHaveBeenCalledWith(
      remainingAt.getTime()
    );
  });
});
