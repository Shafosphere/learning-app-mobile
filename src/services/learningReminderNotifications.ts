import AsyncStorage from "@react-native-async-storage/async-storage";
import { Asset } from "expo-asset";
import { Platform } from "react-native";
import learningReminderAttachmentAsset from "@/assets/app/icons/notification-icon.png";

const REMINDER_NOTIFICATION_IDS_KEY = "learningReminder.notificationIds";
export const LEARNING_REMINDER_KIND = "learning_reminder";
export const REVIEW_REMINDER_KIND = "review_reminder";
const REMINDER_ATTACHMENT_ID = "learning-reminder-logo";
export const LEARNING_REMINDER_CHANNEL_ID = "learning_reminders";

export type ReminderNotificationKind =
  | typeof LEARNING_REMINDER_KIND
  | typeof REVIEW_REMINDER_KIND;

type ReminderNotificationData = {
  kind: ReminderNotificationKind;
  scheduledAt: string;
  dueReviewCount?: number;
  route?: "/review";
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
  kind?: ReminderNotificationKind;
  content: {
    title: string;
    body: string;
  };
  data?: {
    dueReviewCount?: number;
    route?: "/review";
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
  if (
    !data ||
    (data.kind !== LEARNING_REMINDER_KIND && data.kind !== REVIEW_REMINDER_KIND) ||
    typeof data.scheduledAt !== "string"
  ) {
    return null;
  }
  return {
    kind: data.kind,
    scheduledAt: data.scheduledAt,
    ...(typeof data.dueReviewCount === "number"
      ? { dueReviewCount: data.dueReviewCount }
      : null),
    ...(data.route === "/review" ? { route: data.route } : null),
  };
}

function makeReminderData(
  request: LearningReminderNotificationRequest
): ReminderNotificationData {
  return {
    kind: request.kind ?? LEARNING_REMINDER_KIND,
    scheduledAt: request.when.toISOString(),
    ...(typeof request.data?.dueReviewCount === "number"
      ? { dueReviewCount: request.data.dueReviewCount }
      : null),
    ...(request.data?.route === "/review" ? { route: request.data.route } : null),
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
  request: LearningReminderNotificationRequest
): Promise<ReminderNotificationContentInput> {
  const attachmentUrl = await getLearningReminderAttachmentUrl();
  return {
    title: request.content.title,
    body: request.content.body,
    sound: "default",
    data: makeReminderData(request),
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
): Promise<
  { identifier: string; kind: ReminderNotificationKind; scheduledAt: Date }[]
> {
  const scheduled = await notifications.getAllScheduledNotificationsAsync();
  return scheduled
    .map((item) => {
      const data = asReminderData(item.content.data);
      if (!data) {
        return null;
      }
      return {
        identifier: item.identifier,
        kind: data.kind,
        scheduledAt: new Date(data.scheduledAt),
      };
    })
    .filter(
      (
        item
      ): item is {
        identifier: string;
        kind: ReminderNotificationKind;
        scheduledAt: Date;
      } => item != null
    )
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
    .filter(
      (entry) =>
        entry.kind === LEARNING_REMINDER_KIND &&
        toLocalDateKey(entry.scheduledAt) === targetKey
    )
    .map((entry) => entry.identifier);
  await cancelNotificationIds(notifications, idsToCancel);

  const storedIds = await getStoredNotificationIds();
  if (storedIds.length > 0) {
    const remainingIds = storedIds.filter((id) => !idsToCancel.includes(id));
    await setStoredNotificationIds(remainingIds);
  }

  return scheduledEntries
    .filter((entry) => !idsToCancel.includes(entry.identifier))
    .filter((entry) => entry.kind === LEARNING_REMINDER_KIND)
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
          content: await buildLearningReminderNotificationContent(request),
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
    content: await buildLearningReminderNotificationContent({
      kind: LEARNING_REMINDER_KIND,
      when: now,
      content,
    }),
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
  return scheduledEntries
    .filter((entry) => entry.kind === LEARNING_REMINDER_KIND)
    .map((entry) => entry.scheduledAt);
}
