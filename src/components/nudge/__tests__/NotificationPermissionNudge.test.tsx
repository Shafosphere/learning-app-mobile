import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { AppState, type AppStateStatus } from "react-native";
import NotificationPermissionNudge, {
  NOTIFICATION_NUDGE_FOREGROUND_THRESHOLD_MS,
  NOTIFICATION_NUDGE_RETRY_DELAY_MS,
  NOTIFICATION_NUDGE_USAGE_CHECKPOINT_INTERVAL_MS,
} from "../NotificationPermissionNudge";
import { triggerNotificationNudgePreview } from "@/src/services/notificationNudgePreview";

const mockSettings = {
  learningRemindersEnabled: false,
  setLearningRemindersEnabled: jest.fn(),
};

jest.mock("@/src/contexts/SettingsContext", () => ({
  useSettings: () => mockSettings,
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
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
        <View testID="notification-nudge">
          <Text>{title}</Text>
          <Pressable testID="close" onPress={onClose} />
          <Pressable testID="confirm" onPress={onConfirm}>
            <Text>{confirmLabel}</Text>
          </Pressable>
          {secondaryLabel && onSecondaryPress ? (
            <Pressable testID="secondary" onPress={onSecondaryPress} />
          ) : null}
        </View>
      ) : null,
  };
});

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("NotificationPermissionNudge", () => {
  const listeners: ((state: AppStateStatus) => void)[] = [];

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(1_000);
    await AsyncStorage.clear();
    listeners.length = 0;
    mockSettings.learningRemindersEnabled = false;
    mockSettings.setLearningRemindersEnabled.mockReset();
    jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => {
      listeners.push(listener);
      return { remove: jest.fn() };
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const sendAppState = async (state: AppStateStatus) => {
    await act(async () => {
      listeners.forEach((listener) => listener(state));
      await flushPromises();
    });
  };

  it("waits for 15 minutes of foreground use", async () => {
    const screen = render(<NotificationPermissionNudge />);
    expect(screen.queryByTestId("notification-nudge")).toBeNull();

    await waitFor(() => expect(listeners).not.toHaveLength(0));
    await sendAppState("active");
    await act(async () => {
      jest.advanceTimersByTime(NOTIFICATION_NUDGE_FOREGROUND_THRESHOLD_MS - 1);
      await flushPromises();
    });
    expect(screen.queryByTestId("notification-nudge")).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(1);
      await flushPromises();
    });
    expect(screen.getByTestId("notification-nudge")).toBeTruthy();
  });

  it("does not count background time", async () => {
    const screen = render(<NotificationPermissionNudge />);
    await waitFor(() => expect(listeners).not.toHaveLength(0));
    await sendAppState("active");

    await act(async () => {
      jest.advanceTimersByTime(10 * 60 * 1000);
      await flushPromises();
    });
    await sendAppState("background");
    await act(async () => {
      jest.advanceTimersByTime(60 * 60 * 1000);
      await flushPromises();
    });
    expect(screen.queryByTestId("notification-nudge")).toBeNull();

    await sendAppState("active");
    await act(async () => {
      jest.advanceTimersByTime(5 * 60 * 1000);
      await flushPromises();
    });
    expect(screen.getByTestId("notification-nudge")).toBeTruthy();
  });

  it("persists foreground use across app restarts", async () => {
    const firstScreen = render(<NotificationPermissionNudge />);
    await waitFor(() => expect(listeners).not.toHaveLength(0));
    await sendAppState("active");
    await act(async () => {
      jest.advanceTimersByTime(10 * 60 * 1000);
      await flushPromises();
    });
    firstScreen.unmount();

    await waitFor(async () => {
      expect(await AsyncStorage.getItem("notificationNudge.foregroundUsageMs")).toBe(
        JSON.stringify(10 * 60 * 1000)
      );
    });
    listeners.length = 0;

    const resumedScreen = render(<NotificationPermissionNudge />);
    await waitFor(() => expect(listeners).not.toHaveLength(0));
    await sendAppState("active");
    await act(async () => {
      jest.advanceTimersByTime(5 * 60 * 1000);
      await flushPromises();
    });
    expect(resumedScreen.getByTestId("notification-nudge")).toBeTruthy();
  });

  it("checkpoints active usage before app-state cleanup", async () => {
    render(<NotificationPermissionNudge />);
    await waitFor(() => expect(listeners).not.toHaveLength(0));
    await sendAppState("active");

    await act(async () => {
      jest.advanceTimersByTime(NOTIFICATION_NUDGE_USAGE_CHECKPOINT_INTERVAL_MS);
      await flushPromises();
    });

    await waitFor(async () => {
      expect(await AsyncStorage.getItem("notificationNudge.foregroundUsageMs")).toBe(
        JSON.stringify(NOTIFICATION_NUDGE_USAGE_CHECKPOINT_INTERVAL_MS)
      );
    });
  });

  it("keeps final foreground usage when checkpoint and background overlap", async () => {
    render(<NotificationPermissionNudge />);
    await waitFor(() => expect(listeners).not.toHaveLength(0));
    await sendAppState("active");

    await act(async () => {
      jest.advanceTimersByTime(NOTIFICATION_NUDGE_USAGE_CHECKPOINT_INTERVAL_MS);
      listeners.forEach((listener) => listener("background"));
      await flushPromises();
    });

    await waitFor(async () => {
      expect(await AsyncStorage.getItem("notificationNudge.foregroundUsageMs")).toBe(
        JSON.stringify(NOTIFICATION_NUDGE_USAGE_CHECKPOINT_INTERVAL_MS)
      );
      expect(
        await AsyncStorage.getItem("notificationNudge.activeSessionStartedAt")
      ).toBe(JSON.stringify(null));
    });
  });

  it("keeps checkpointed usage after a terminated active session", async () => {
    await AsyncStorage.setItem(
      "notificationNudge.foregroundUsageMs",
      JSON.stringify(14 * 60 * 1000)
    );
    await AsyncStorage.setItem(
      "notificationNudge.activeSessionStartedAt",
      JSON.stringify(Date.now() - 30 * 1000)
    );

    const screen = render(<NotificationPermissionNudge />);
    await waitFor(() => expect(listeners).not.toHaveLength(0));
    await sendAppState("active");
    await act(async () => {
      jest.advanceTimersByTime(60 * 1000);
      await flushPromises();
    });

    expect(screen.getByTestId("notification-nudge")).toBeTruthy();
  });

  it("waits seven days after dismissal", async () => {
    const screen = render(<NotificationPermissionNudge />);
    await waitFor(() => expect(listeners).not.toHaveLength(0));
    await sendAppState("active");
    await act(async () => {
      jest.advanceTimersByTime(NOTIFICATION_NUDGE_FOREGROUND_THRESHOLD_MS);
      await flushPromises();
    });
    fireEvent.press(screen.getByTestId("secondary"));
    await act(flushPromises);
    expect(screen.queryByTestId("notification-nudge")).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(NOTIFICATION_NUDGE_RETRY_DELAY_MS - 1);
      await flushPromises();
    });
    expect(screen.queryByTestId("notification-nudge")).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(1);
      await flushPromises();
    });
    expect(screen.getByTestId("notification-nudge")).toBeTruthy();
  });

  it("opens immediately from the debugging preview trigger", async () => {
    mockSettings.learningRemindersEnabled = true;
    const screen = render(<NotificationPermissionNudge />);
    await act(async () => {
      triggerNotificationNudgePreview();
      await flushPromises();
    });
    expect(screen.getByTestId("notification-nudge")).toBeTruthy();

    fireEvent.press(screen.getByTestId("close"));
    await act(flushPromises);
    expect(screen.queryByTestId("notification-nudge")).toBeNull();
    expect(await AsyncStorage.getItem("notificationNudge.nextEligibleAt")).toBeNull();
  });

  it("does not show when reminders already enabled and uses existing setting action", async () => {
    mockSettings.learningRemindersEnabled = true;
    const enabledScreen = render(<NotificationPermissionNudge />);
    await waitFor(() => expect(listeners).not.toHaveLength(0));
    await sendAppState("active");
    await act(async () => {
      jest.advanceTimersByTime(NOTIFICATION_NUDGE_FOREGROUND_THRESHOLD_MS);
      await flushPromises();
    });
    expect(enabledScreen.queryByTestId("notification-nudge")).toBeNull();
    enabledScreen.unmount();

    mockSettings.learningRemindersEnabled = false;
    const screen = render(<NotificationPermissionNudge />);
    await sendAppState("active");
    await act(async () => {
      jest.advanceTimersByTime(NOTIFICATION_NUDGE_FOREGROUND_THRESHOLD_MS);
      await flushPromises();
    });
    fireEvent.press(screen.getByTestId("confirm"));
    await waitFor(() => {
      expect(mockSettings.setLearningRemindersEnabled).toHaveBeenCalledWith(true);
    });
    await waitFor(() => {
      expect(screen.queryByTestId("notification-nudge")).toBeNull();
    });
  });

  it("adds cooldown when enabling reminders is denied", async () => {
    const screen = render(<NotificationPermissionNudge />);
    await waitFor(() => expect(listeners).not.toHaveLength(0));
    await sendAppState("active");
    await act(async () => {
      jest.advanceTimersByTime(NOTIFICATION_NUDGE_FOREGROUND_THRESHOLD_MS);
      await flushPromises();
    });

    fireEvent.press(screen.getByTestId("confirm"));
    await waitFor(async () => {
      expect(await AsyncStorage.getItem("notificationNudge.nextEligibleAt")).toBe(
        JSON.stringify(Date.now() + NOTIFICATION_NUDGE_RETRY_DELAY_MS)
      );
    });
    expect(screen.queryByTestId("notification-nudge")).toBeNull();
  });
});
