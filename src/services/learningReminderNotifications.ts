import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

const REMINDER_NOTIFICATION_ID_KEY = "learningReminder.notificationId";
const REMINDER_KIND = "learning_reminder";

export type ReminderPermissionState = "granted" | "denied" | "undetermined";
type NotificationsModule = {
  getPermissionsAsync: () => Promise<{ status: string }>;
  requestPermissionsAsync: () => Promise<{ status: string }>;
  cancelScheduledNotificationAsync: (id: string) => Promise<void>;
  getAllScheduledNotificationsAsync: () => Promise<
    {
      identifier: string;
      content: { data?: Record<string, unknown> };
    }[]
  >;
  scheduleNotificationAsync: (input: {
    content: {
      title: string;
      body: string;
      sound: "default";
      data: { kind: string };
    };
    trigger: {
      type: string;
      date: Date;
    };
  }) => Promise<string>;
  SchedulableTriggerInputTypes: {
    DATE: string;
  };
};

let cachedNotificationsModule: NotificationsModule | null | undefined;
let notificationsModulePromise: Promise<NotificationsModule | null> | null = null;

function isExpoGoAndroid(): boolean {
  return (
    Platform.OS === "android" &&
    Constants.executionEnvironment === "storeClient"
  );
}

async function getNotificationsModule(): Promise<NotificationsModule | null> {
  if (cachedNotificationsModule !== undefined) {
    return cachedNotificationsModule;
  }
  if (isExpoGoAndroid()) {
    cachedNotificationsModule = null;
    return null;
  }
  notificationsModulePromise ??= import("expo-notifications")
    .then((module) => {
      cachedNotificationsModule = module as unknown as NotificationsModule;
      return cachedNotificationsModule;
    })
    .catch(() => {
      cachedNotificationsModule = null;
      return null;
    });
  return notificationsModulePromise;
}

function mapPermissionStatus(status: string): ReminderPermissionState {
  if (status === "granted") {
    return "granted";
  }
  if (status === "denied") {
    return "denied";
  }
  return "undetermined";
}

export async function getReminderPermissionState(): Promise<ReminderPermissionState> {
  const notifications = await getNotificationsModule();
  if (!notifications) {
    return "denied";
  }
  const permissions = await notifications.getPermissionsAsync();
  return mapPermissionStatus(permissions.status);
}

export async function requestReminderPermissions(): Promise<ReminderPermissionState> {
  const notifications = await getNotificationsModule();
  if (!notifications) {
    return "denied";
  }
  const current = await getReminderPermissionState();
  if (current === "granted") {
    return current;
  }

  const requested = await notifications.requestPermissionsAsync();
  return mapPermissionStatus(requested.status);
}

async function getStoredNotificationId(): Promise<string | null> {
  return AsyncStorage.getItem(REMINDER_NOTIFICATION_ID_KEY);
}

async function setStoredNotificationId(notificationId: string | null): Promise<void> {
  if (!notificationId) {
    await AsyncStorage.removeItem(REMINDER_NOTIFICATION_ID_KEY);
    return;
  }
  await AsyncStorage.setItem(REMINDER_NOTIFICATION_ID_KEY, notificationId);
}

export async function cancelLearningReminderNotification(): Promise<void> {
  const notifications = await getNotificationsModule();
  if (!notifications) {
    await setStoredNotificationId(null);
    return;
  }

  const storedId = await getStoredNotificationId();
  if (storedId) {
    try {
      await notifications.cancelScheduledNotificationAsync(storedId);
    } catch {
      // Ignored: stale id, nothing to cancel.
    }
  }

  const scheduled = await notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => item.content.data?.kind === REMINDER_KIND)
      .map((item) => notifications.cancelScheduledNotificationAsync(item.identifier))
  );

  await setStoredNotificationId(null);
}

export async function scheduleLearningReminderNotification(
  when: Date,
  content: {
    title: string;
    body: string;
  }
): Promise<string> {
  const notifications = await getNotificationsModule();
  if (!notifications) {
    await setStoredNotificationId(null);
    return "";
  }

  await cancelLearningReminderNotification();

  const notificationId = await notifications.scheduleNotificationAsync({
    content: {
      title: content.title,
      body: content.body,
      sound: "default",
      data: {
        kind: REMINDER_KIND,
      },
    },
    trigger: {
      type: notifications.SchedulableTriggerInputTypes.DATE,
      date: when,
    },
  });

  await setStoredNotificationId(notificationId);
  return notificationId;
}
