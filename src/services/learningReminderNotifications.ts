import AsyncStorage from "@react-native-async-storage/async-storage";

const REMINDER_NOTIFICATION_IDS_KEY = "learningReminder.notificationIds";
const REMINDER_KIND = "learning_reminder";
export const LEARNING_REMINDER_CHANNEL_ID = "learning_reminders";

type ReminderNotificationData = {
  kind: string;
  scheduledAt: string;
};

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
      data: ReminderNotificationData;
    };
    trigger: {
      type: string;
      date: Date;
      channelId?: string;
    };
  }) => Promise<string>;
  SchedulableTriggerInputTypes: {
    DATE: string;
  };
};

let cachedNotificationsModule: NotificationsModule | null | undefined;
let notificationsModulePromise: Promise<NotificationsModule | null> | null = null;
let reminderScheduleOperation: Promise<void> = Promise.resolve();

async function getNotificationsModule(): Promise<NotificationsModule | null> {
  if (cachedNotificationsModule !== undefined) {
    return cachedNotificationsModule;
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

async function getStoredNotificationIds(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(REMINDER_NOTIFICATION_IDS_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

async function setStoredNotificationIds(notificationIds: string[]): Promise<void> {
  if (notificationIds.length === 0) {
    await AsyncStorage.removeItem(REMINDER_NOTIFICATION_IDS_KEY);
    return;
  }
  await AsyncStorage.setItem(
    REMINDER_NOTIFICATION_IDS_KEY,
    JSON.stringify(notificationIds)
  );
}

function asReminderData(
  data: Record<string, unknown> | undefined
): ReminderNotificationData | null {
  if (!data || data.kind !== REMINDER_KIND || typeof data.scheduledAt !== "string") {
    return null;
  }
  return {
    kind: REMINDER_KIND,
    scheduledAt: data.scheduledAt,
  };
}

function toLocalDateKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function enqueueReminderOperation<T>(operation: () => Promise<T>): Promise<T> {
  const nextOperation = reminderScheduleOperation.then(operation, operation);
  reminderScheduleOperation = nextOperation.then(
    () => undefined,
    () => undefined
  );
  return nextOperation;
}

async function listScheduledReminderEntries(
  notifications: NotificationsModule
): Promise<{ identifier: string; scheduledAt: Date }[]> {
  const scheduled = await notifications.getAllScheduledNotificationsAsync();
  return scheduled
    .map((item) => {
      const data = asReminderData(item.content.data);
      if (!data) {
        return null;
      }
      return {
        identifier: item.identifier,
        scheduledAt: new Date(data.scheduledAt),
      };
    })
    .filter((item): item is { identifier: string; scheduledAt: Date } => item != null)
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
}

async function cancelNotificationIds(
  notifications: NotificationsModule,
  ids: string[]
): Promise<void> {
  await Promise.all(
    ids.map(async (identifier) => {
      try {
        await notifications.cancelScheduledNotificationAsync(identifier);
      } catch {
        // Ignored: stale id, nothing to cancel.
      }
    })
  );
}

async function cancelLearningReminderNotificationInternal(
  notifications: NotificationsModule
): Promise<void> {
  const storedIds = await getStoredNotificationIds();
  const scheduledEntries = await listScheduledReminderEntries(notifications);
  const idsToCancel = Array.from(
    new Set([...storedIds, ...scheduledEntries.map((entry) => entry.identifier)])
  );
  await cancelNotificationIds(notifications, idsToCancel);
  await setStoredNotificationIds([]);
}

async function cancelLearningReminderNotificationsForDateInternal(
  notifications: NotificationsModule,
  date: Date
): Promise<Date[]> {
  const targetKey = toLocalDateKey(date);
  const scheduledEntries = await listScheduledReminderEntries(notifications);
  const idsToCancel = scheduledEntries
    .filter((entry) => toLocalDateKey(entry.scheduledAt) === targetKey)
    .map((entry) => entry.identifier);
  await cancelNotificationIds(notifications, idsToCancel);

  const storedIds = await getStoredNotificationIds();
  if (storedIds.length > 0) {
    const remainingIds = storedIds.filter((id) => !idsToCancel.includes(id));
    await setStoredNotificationIds(remainingIds);
  }

  return scheduledEntries
    .filter((entry) => !idsToCancel.includes(entry.identifier))
    .map((entry) => entry.scheduledAt);
}

export async function cancelLearningReminderNotification(): Promise<void> {
  return enqueueReminderOperation(async () => {
    const notifications = await getNotificationsModule();
    if (!notifications) {
      await setStoredNotificationIds([]);
      return;
    }

    await cancelLearningReminderNotificationInternal(notifications);
  });
}

export async function cancelLearningReminderNotificationsForDate(
  date: Date
): Promise<Date[]> {
  return enqueueReminderOperation(async () => {
    const notifications = await getNotificationsModule();
    if (!notifications) {
      return [];
    }

    return cancelLearningReminderNotificationsForDateInternal(notifications, date);
  });
}

export async function scheduleLearningReminderNotifications(
  whenList: Date[],
  content: {
    title: string;
    body: string;
  }
): Promise<string[]> {
  return enqueueReminderOperation(async () => {
    const notifications = await getNotificationsModule();
    if (!notifications) {
      await setStoredNotificationIds([]);
      return [];
    }

    await cancelLearningReminderNotificationInternal(notifications);

    const upcomingDates = whenList
      .filter((when) => when.getTime() > Date.now())
      .sort((a, b) => a.getTime() - b.getTime());

    const notificationIds: string[] = [];
    try {
      for (const when of upcomingDates) {
        const notificationId = await notifications.scheduleNotificationAsync({
          content: {
            title: content.title,
            body: content.body,
            sound: "default",
            data: {
              kind: REMINDER_KIND,
              scheduledAt: when.toISOString(),
            },
          },
          trigger: {
            type: notifications.SchedulableTriggerInputTypes.DATE,
            date: when,
            channelId: LEARNING_REMINDER_CHANNEL_ID,
          },
        });
        notificationIds.push(notificationId);
      }
    } catch (error) {
      await cancelNotificationIds(notifications, notificationIds);
      await setStoredNotificationIds([]);
      throw error;
    }

    await setStoredNotificationIds(notificationIds);
    return notificationIds;
  });
}

export async function getScheduledLearningReminderDates(): Promise<Date[]> {
  await reminderScheduleOperation;
  const notifications = await getNotificationsModule();
  if (!notifications) {
    return [];
  }

  const scheduledEntries = await listScheduledReminderEntries(notifications);
  return scheduledEntries.map((entry) => entry.scheduledAt);
}
