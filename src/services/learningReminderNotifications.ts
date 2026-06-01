import AsyncStorage from "@react-native-async-storage/async-storage";
import { Asset } from "expo-asset";
import { Platform } from "react-native";
import learningReminderAttachmentAsset from "@/assets/app/icons/notification-icon.png";

const REMINDER_NOTIFICATION_IDS_KEY = "learningReminder.notificationIds";
const REMINDER_KIND = "learning_reminder";
const REMINDER_ATTACHMENT_ID = "learning-reminder-logo";
export const LEARNING_REMINDER_CHANNEL_ID = "learning_reminders";

type ReminderNotificationData = {
  kind: string;
  scheduledAt: string;
};
type ReminderNotificationAttachment = {
  identifier: string;
  url: string;
  type: string;
};
type ReminderNotificationContentInput = {
  title: string;
  body: string;
  sound: "default";
  data: ReminderNotificationData;
  attachments?: ReminderNotificationAttachment[];
};

export type ReminderPermissionState = "granted" | "denied" | "undetermined";
export type LearningReminderNotificationRequest = {
  when: Date;
  content: {
    title: string;
    body: string;
  };
};
export type LearningReminderNotificationPreviewResult = {
  permissionState: ReminderPermissionState;
  notificationId: string | null;
};
type NotificationsModule = {
  getPermissionsAsync: () => Promise<{ status: string }>;
  requestPermissionsAsync: () => Promise<{ status: string }>;
  cancelScheduledNotificationAsync: (id: string) => Promise<void>;
  dismissNotificationAsync?: (id: string) => Promise<void>;
  getAllScheduledNotificationsAsync: () => Promise<
    {
      identifier: string;
      content: { data?: Record<string, unknown> };
    }[]
  >;
  getPresentedNotificationsAsync?: () => Promise<
    {
      request: {
        identifier: string;
        content: { data?: Record<string, unknown> };
      };
    }[]
  >;
  scheduleNotificationAsync: (input: {
    content: ReminderNotificationContentInput;
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
let learningReminderAttachmentUrlForTests: string | null | undefined;

export function __setLearningReminderNotificationsModuleForTests(
  notifications: unknown
): void {
  cachedNotificationsModule = notifications as NotificationsModule | null | undefined;
  notificationsModulePromise = null;
  reminderScheduleOperation = Promise.resolve();
  learningReminderAttachmentUrlForTests = undefined;
}

export function __setLearningReminderAttachmentUrlForTests(
  url: string | null | undefined
): void {
  learningReminderAttachmentUrlForTests = url;
}

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

function makeReminderData(scheduledAt: Date): ReminderNotificationData {
  return {
    kind: REMINDER_KIND,
    scheduledAt: scheduledAt.toISOString(),
  };
}

async function getLearningReminderAttachmentUrl(): Promise<string | null> {
  if (learningReminderAttachmentUrlForTests !== undefined) {
    return learningReminderAttachmentUrlForTests;
  }
  if (Platform.OS !== "ios") {
    return null;
  }

  try {
    const asset = Asset.fromModule(learningReminderAttachmentAsset);
    await asset.downloadAsync();
    return asset.localUri ?? asset.uri ?? null;
  } catch {
    return null;
  }
}

async function buildLearningReminderNotificationContent(
  content: LearningReminderNotificationRequest["content"],
  scheduledAt: Date
): Promise<ReminderNotificationContentInput> {
  const attachmentUrl = await getLearningReminderAttachmentUrl();
  return {
    title: content.title,
    body: content.body,
    sound: "default",
    data: makeReminderData(scheduledAt),
    ...(attachmentUrl
      ? {
          attachments: [
            {
              identifier: REMINDER_ATTACHMENT_ID,
              url: attachmentUrl,
              type: "image/png",
            },
          ],
        }
      : null),
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
  notifications: NotificationsModule,
  options: { dismissPresented?: boolean } = {}
): Promise<void> {
  const storedIds = await getStoredNotificationIds();
  const scheduledEntries = await listScheduledReminderEntries(notifications);
  const idsToCancel = Array.from(
    new Set([...storedIds, ...scheduledEntries.map((entry) => entry.identifier)])
  );
  await cancelNotificationIds(notifications, idsToCancel);
  if (options.dismissPresented) {
    await dismissPresentedLearningReminderNotifications(notifications);
  }
  await setStoredNotificationIds([]);
}

async function dismissPresentedLearningReminderNotifications(
  notifications: NotificationsModule
): Promise<void> {
  if (!notifications.getPresentedNotificationsAsync || !notifications.dismissNotificationAsync) {
    return;
  }

  try {
    const presented = await notifications.getPresentedNotificationsAsync();
    await Promise.all(
      presented
        .filter((item) => asReminderData(item.request.content.data) != null)
        .map((item) => notifications.dismissNotificationAsync?.(item.request.identifier))
    );
  } catch {
    // Ignored: presentation APIs are not available on every platform/version.
  }
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

    await cancelLearningReminderNotificationInternal(notifications, {
      dismissPresented: true,
    });
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
  requests: LearningReminderNotificationRequest[]
): Promise<string[]> {
  return enqueueReminderOperation(async () => {
    const notifications = await getNotificationsModule();
    if (!notifications) {
      await setStoredNotificationIds([]);
      return [];
    }

    await cancelLearningReminderNotificationInternal(notifications);

    const upcomingRequests = requests
      .filter((request) => request.when.getTime() > Date.now())
      .sort((a, b) => a.when.getTime() - b.when.getTime());

    const notificationIds: string[] = [];
    try {
      for (const request of upcomingRequests) {
        const notificationId = await notifications.scheduleNotificationAsync({
          content: await buildLearningReminderNotificationContent(
            request.content,
            request.when
          ),
          trigger: {
            type: notifications.SchedulableTriggerInputTypes.DATE,
            date: request.when,
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

export async function triggerLearningReminderNotificationPreview(
  content: LearningReminderNotificationRequest["content"],
  now: Date = new Date()
): Promise<LearningReminderNotificationPreviewResult> {
  const notifications = await getNotificationsModule();
  if (!notifications) {
    return {
      permissionState: "denied",
      notificationId: null,
    };
  }

  const permissionState = await requestReminderPermissions();
  if (permissionState !== "granted") {
    return {
      permissionState,
      notificationId: null,
    };
  }

  const triggerDate = new Date(now.getTime() + 1000);
  const notificationId = await notifications.scheduleNotificationAsync({
    content: await buildLearningReminderNotificationContent(content, now),
    trigger: {
      type: notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId: LEARNING_REMINDER_CHANNEL_ID,
    },
  });

  return {
    permissionState,
    notificationId,
  };
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
