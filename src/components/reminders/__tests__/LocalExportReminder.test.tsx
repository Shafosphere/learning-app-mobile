import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { AppState, type AppStateStatus } from "react-native";
import LocalExportReminder from "@/src/components/reminders/LocalExportReminder";
import { exportAndShareUserData } from "@/src/services/exportUserData";
import {
  ensureLocalExportReminderFirstSeenAt,
  getLocalExportReminderState,
  LOCAL_EXPORT_REMINDER_INTERVAL_MS,
  markLocalExportReminderShown,
} from "@/src/services/localExportReminder";
import {
  setOnboardingCheckpoint,
  type OnboardingCheckpoint,
} from "@/src/services/onboardingCheckpoint";

jest.mock("@/src/services/exportUserData", () => ({
  exportAndShareUserData: jest.fn(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}));

jest.mock("@/src/components/nudge/NudgeModal", () => {
  const React = jest.requireActual("react");
  const { Pressable, Text, View } = jest.requireActual("react-native");

  return {
    NudgeModal: ({
      visible,
      title,
      confirmLabel,
      onConfirm,
      onClose,
      secondaryLabel,
      onSecondaryPress,
    }: {
      visible: boolean;
      title: string;
      confirmLabel: string;
      onConfirm: () => void;
      onClose: () => void;
      secondaryLabel?: string;
      onSecondaryPress?: () => void;
    }) =>
      visible ? (
        <View testID={`nudge-${title}`}>
          <Text>{title}</Text>
          <Pressable testID={`close-${title}`} onPress={onClose}>
            <Text>close</Text>
          </Pressable>
          {secondaryLabel && onSecondaryPress ? (
            <Pressable testID={`secondary-${title}`} onPress={onSecondaryPress}>
              <Text>{secondaryLabel}</Text>
            </Pressable>
          ) : null}
          <Pressable testID={`confirm-${title}`} onPress={onConfirm}>
            <Text>{confirmLabel}</Text>
          </Pressable>
        </View>
      ) : null,
  };
});

const mockedExportAndShareUserData = jest.mocked(exportAndShareUserData);
const REMINDER_TEST_ID = "nudge-localExportReminder.title";
const REMINDER_CONFIRM_ID = "confirm-localExportReminder.title";
const REMINDER_SECONDARY_ID = "secondary-localExportReminder.title";

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

async function updateCheckpoint(checkpoint: OnboardingCheckpoint) {
  await act(async () => {
    await setOnboardingCheckpoint(checkpoint);
    await flushPromises();
  });
}

describe("LocalExportReminder", () => {
  const appStateListeners: ((state: AppStateStatus) => void)[] = [];

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(1_000);
    await AsyncStorage.clear();
    appStateListeners.length = 0;
    mockedExportAndShareUserData.mockReset();
    jest.spyOn(AppState, "addEventListener").mockImplementation(
      (_type, listener) => {
        appStateListeners.push(listener);
        return {
          remove: jest.fn(),
        };
      }
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("does not show or seed the reminder before onboarding is done", async () => {
    const screen = render(<LocalExportReminder />);

    await act(async () => {
      jest.advanceTimersByTime(LOCAL_EXPORT_REMINDER_INTERVAL_MS * 2);
      appStateListeners.forEach((listener) => listener("active"));
      await flushPromises();
    });

    await waitFor(() => {
      expect(screen.queryByTestId(REMINDER_TEST_ID)).toBeNull();
    });

    const state = await getLocalExportReminderState();
    expect(state.firstSeenAt).toBeNull();
  });

  it("evaluates after onboarding is done and shows from the scheduled timer", async () => {
    const screen = render(<LocalExportReminder />);

    await updateCheckpoint("done");

    await waitFor(async () => {
      const state = await getLocalExportReminderState();
      expect(state.firstSeenAt).not.toBeNull();
    });
    expect(screen.queryByTestId(REMINDER_TEST_ID)).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(LOCAL_EXPORT_REMINDER_INTERVAL_MS);
      await flushPromises();
    });

    await waitFor(() => {
      expect(screen.getByTestId(REMINDER_TEST_ID)).toBeTruthy();
    });
  });

  it("re-evaluates when the app returns to active state", async () => {
    await updateCheckpoint("done");
    await ensureLocalExportReminderFirstSeenAt(1_000);
    const screen = render(<LocalExportReminder />);

    expect(screen.queryByTestId(REMINDER_TEST_ID)).toBeNull();

    jest.setSystemTime(1_000 + LOCAL_EXPORT_REMINDER_INTERVAL_MS);
    await act(async () => {
      appStateListeners.forEach((listener) => listener("active"));
      await flushPromises();
    });

    await waitFor(() => {
      expect(screen.getByTestId(REMINDER_TEST_ID)).toBeTruthy();
    });
  });

  it("does not hide an already visible modal when a later evaluation returns false", async () => {
    await updateCheckpoint("done");
    await ensureLocalExportReminderFirstSeenAt(1_000);
    jest.setSystemTime(1_000 + LOCAL_EXPORT_REMINDER_INTERVAL_MS);
    const screen = render(<LocalExportReminder />);

    await waitFor(() => {
      expect(screen.getByTestId(REMINDER_TEST_ID)).toBeTruthy();
    });

    await markLocalExportReminderShown(Date.now());
    await act(async () => {
      appStateListeners.forEach((listener) => listener("active"));
      await flushPromises();
    });

    expect(screen.getByTestId(REMINDER_TEST_ID)).toBeTruthy();
  });

  it("hides the reminder and clears timers when onboarding is no longer done", async () => {
    await updateCheckpoint("done");
    await ensureLocalExportReminderFirstSeenAt(1_000);
    jest.setSystemTime(1_000 + LOCAL_EXPORT_REMINDER_INTERVAL_MS);
    const screen = render(<LocalExportReminder />);

    await waitFor(() => {
      expect(screen.getByTestId(REMINDER_TEST_ID)).toBeTruthy();
    });

    await updateCheckpoint("language_required");

    await waitFor(() => {
      expect(screen.queryByTestId(REMINDER_TEST_ID)).toBeNull();
    });

    await act(async () => {
      jest.runOnlyPendingTimers();
      await flushPromises();
    });
    expect(screen.queryByTestId(REMINDER_TEST_ID)).toBeNull();
  });

  it("records later and schedules the next reminder", async () => {
    await updateCheckpoint("done");
    await ensureLocalExportReminderFirstSeenAt(1_000);
    jest.setSystemTime(1_000 + LOCAL_EXPORT_REMINDER_INTERVAL_MS);
    const screen = render(<LocalExportReminder />);

    await waitFor(() => {
      expect(screen.getByTestId(REMINDER_TEST_ID)).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId(REMINDER_SECONDARY_ID));
      await flushPromises();
    });

    await waitFor(() => {
      expect(screen.queryByTestId(REMINDER_TEST_ID)).toBeNull();
    });
    const state = await getLocalExportReminderState();
    expect(state.lastPromptShownAt).toBe(Date.now());

    await act(async () => {
      jest.advanceTimersByTime(LOCAL_EXPORT_REMINDER_INTERVAL_MS);
      await flushPromises();
    });

    await waitFor(() => {
      expect(screen.getByTestId(REMINDER_TEST_ID)).toBeTruthy();
    });
  });

  it("hides after a successful export and schedules the next reminder", async () => {
    await updateCheckpoint("done");
    await ensureLocalExportReminderFirstSeenAt(1_000);
    jest.setSystemTime(1_000 + LOCAL_EXPORT_REMINDER_INTERVAL_MS);
    mockedExportAndShareUserData.mockResolvedValue({
      fileUri: "file:///export.json",
      fileName: "export.json",
      bytesWritten: 2048,
      payload: {} as Awaited<
        ReturnType<typeof exportAndShareUserData>
      >["payload"],
      delivery: "saved_to_selected_folder",
      sharingSupported: true,
      shared: true,
    });
    const screen = render(<LocalExportReminder />);

    await waitFor(() => {
      expect(screen.getByTestId(REMINDER_TEST_ID)).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId(REMINDER_CONFIRM_ID));
      await flushPromises();
    });

    await waitFor(() => {
      expect(screen.queryByTestId(REMINDER_TEST_ID)).toBeNull();
    });

    await act(async () => {
      jest.advanceTimersByTime(LOCAL_EXPORT_REMINDER_INTERVAL_MS);
      await flushPromises();
    });

    await waitFor(() => {
      expect(screen.getByTestId(REMINDER_TEST_ID)).toBeTruthy();
    });
  });
});
