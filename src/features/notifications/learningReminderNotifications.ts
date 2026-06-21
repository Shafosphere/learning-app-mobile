import AsyncStorage from "@react-native-async-storage/async-storage";
import { Asset } from "expo-asset";
import Constants from "expo-constants";
import { Platform } from "react-native";
import learningReminderAttachmentAsset from "@/assets/app/icons/notification-icon.png";
import learningReminderLargeIconAsset from "@/assets/app/icons/generated/android/play_store_512.png";

const REMINDER_NOTIFICATION_IDS_KEY = "learningReminder.notificationIds";
export const LEARNING_REMINDER_KIND = "learning_reminder";
export const REVIEW_REMINDER_KIND = "review_reminder";
export const END_OF_DAY_REMINDER_KIND = "end_of_day_reminder";
const REMINDER_ATTACHMENT_ID = "learning-reminder-logo";
export const LEARNING_REMINDER_CHANNEL_ID = "learning_reminders";
const DEFAULT_PRESS_ACTION_ID = "default";
const ANDROID_NOTIFICATION_SMALL_ICON = "notification_icon";
const ANDROID_NOTIFICATION_COLOR = "#001534";

export type ReminderNotificationKind =
  | typeof LEARNING_REMINDER_KIND
  | typeof REVIEW_REMINDER_KIND
  | typeof END_OF_DAY_REMINDER_KIND;
type ReminderNotificationRoute = "/review" | "/flashcards";

type ReminderNotificationData = {
  kind: ReminderNotificationKind;
  scheduledAt: string;
  dueReviewCount?: number;
  route?: ReminderNotificationRoute;
};
type ReminderNotificationAttachment = {
  id: string;
  url: string;
  typeHint: string;
};
type NotifyKitNotificationInput = {
  id?: string;
  title: string;
  body: string;
  data: ReminderNotificationData;
  android?: {
    channelId: string;
    smallIcon?: string;
    color?: string;
    largeIcon?: number | string | object;
    circularLargeIcon?: boolean;
    pressAction: {
      id: string;
    };
    sound?: "default";
  };
  ios?: {
    sound?: "default";
    attachments?: ReminderNotificationAttachment[];
  };
};
type NotifyKitTriggerInput = {
  type: number | string;
  timestamp: number;
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
    route?: ReminderNotificationRoute;
  };
};
export type LearningReminderNotificationPreviewResult = {
  permissionState: ReminderPermissionState;
  notificationId: string | null;
};
type NotifyKitNotification = {
  id?: string;
  data?: Record<string, unknown>;
};
type NotifyKitTriggerNotification = {
  notification: NotifyKitNotification;
  trigger: unknown;
};
type NotifyKitDisplayedNotification = {
  id?: string;
  notification: NotifyKitNotification;
};
type NotifyKitNotificationSettings = {
  authorizationStatus: number | string;
};
type NotifyKitModule = {
  AuthorizationStatus: {
    NOT_DETERMINED: number;
    DENIED: number;
    AUTHORIZED: number;
    PROVISIONAL?: number;
    EPHEMERAL?: number;
  };
  AndroidImportance: {
    DEFAULT: number;
  };
  TriggerType: {
    TIMESTAMP: number | string;
  };
  requestPermission: () => Promise<NotifyKitNotificationSettings>;
  getNotificationSettings: () => Promise<NotifyKitNotificationSettings>;
  createChannel: (channel: {
    id: string;
    name: string;
    importance: number;
    sound: "default";
  }) => Promise<string>;
  createTriggerNotification: (
    notification: NotifyKitNotificationInput,
    trigger: NotifyKitTriggerInput
  ) => Promise<string>;
  getTriggerNotifications: () => Promise<NotifyKitTriggerNotification[]>;
  getDisplayedNotifications?: () => Promise<NotifyKitDisplayedNotification[]>;
  cancelNotification: (id: string) => Promise<void>;
  cancelDisplayedNotification?: (id: string) => Promise<void>;
};

let cachedNotifyKitModule: NotifyKitModule | null | undefined;
let notifyKitModulePromise: Promise<NotifyKitModule | null> | null = null;
let reminderScheduleOperation: Promise<void> = Promise.resolve();
let learningReminderAttachmentUrlForTests: string | null | undefined;

export function __setLearningReminderNotificationsModuleForTests(
  notifications: unknown
): void {
  cachedNotifyKitModule = notifications as NotifyKitModule | null | undefined;
  notifyKitModulePromise = null;
  reminderScheduleOperation = Promise.resolve();
  learningReminderAttachmentUrlForTests = undefined;
}

export function __setLearningReminderAttachmentUrlForTests(
  url: string | null | undefined
): void {
  learningReminderAttachmentUrlForTests = url;
}

async function getNotifyKitModule(): Promise<NotifyKitModule | null> {
  if (Constants.executionEnvironment === "storeClient") {
    return null;
  }
  if (cachedNotifyKitModule !== undefined) {
    return cachedNotifyKitModule;
  }
  notifyKitModulePromise ??= import("react-native-notify-kit")
    .then((module) => {
      const notifyKit = module.default as unknown as NotifyKitModule;
      cachedNotifyKitModule = {
        ...notifyKit,
        AuthorizationStatus: module.AuthorizationStatus as NotifyKitModule["AuthorizationStatus"],
        AndroidImportance: module.AndroidImportance as NotifyKitModule["AndroidImportance"],
        TriggerType: module.TriggerType as NotifyKitModule["TriggerType"],
      };
      return cachedNotifyKitModule;
    })
    .catch(() => {
      cachedNotifyKitModule = null;
      return null;
    });
  return notifyKitModulePromise;
}

function mapPermissionStatus(
  notifications: NotifyKitModule,
  status: number | string
): ReminderPermissionState {
  if (
    status === notifications.AuthorizationStatus.AUTHORIZED ||
    status === notifications.AuthorizationStatus.PROVISIONAL ||
    status === notifications.AuthorizationStatus.EPHEMERAL
  ) {
    return "granted";
  }
  if (status === notifications.AuthorizationStatus.DENIED) {
    return "denied";
  }
  return "undetermined";
}

export async function getReminderPermissionState(): Promise<ReminderPermissionState> {
  const notifications = await getNotifyKitModule();
  if (!notifications) {
    return "denied";
  }
  const permissions = await notifications.getNotificationSettings();
  return mapPermissionStatus(notifications, permissions.authorizationStatus);
}

export async function requestReminderPermissions(): Promise<ReminderPermissionState> {
  const notifications = await getNotifyKitModule();
  if (!notifications) {
    return "denied";
  }
  const current = await getReminderPermissionState();
  if (current === "granted") {
    return current;
  }

  const requested = await notifications.requestPermission();
  return mapPermissionStatus(notifications, requested.authorizationStatus);
}

export async function ensureLearningReminderNotificationChannel(): Promise<void> {
  const notifications = await getNotifyKitModule();
  if (!notifications) {
    return;
  }

  await notifications.createChannel({
    id: LEARNING_REMINDER_CHANNEL_ID,
    name: "Learning reminders",
    importance: notifications.AndroidImportance.DEFAULT,
    sound: "default",
  });
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
    (data.kind !== LEARNING_REMINDER_KIND &&
      data.kind !== REVIEW_REMINDER_KIND &&
      data.kind !== END_OF_DAY_REMINDER_KIND) ||
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
    ...(data.route === "/review" || data.route === "/flashcards"
      ? { route: data.route }
      : null),
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
    ...(request.data?.route === "/review" || request.data?.route === "/flashcards"
      ? { route: request.data.route }
      : null),
  };
}

function makeNotificationId(
  request: LearningReminderNotificationRequest,
  index: number
): string {
  const kind = request.kind ?? LEARNING_REMINDER_KIND;
  return `memicard-${kind}-${request.when.getTime()}-${index}`;
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
  request: LearningReminderNotificationRequest,
  notificationId: string,
  notifications: NotifyKitModule
): Promise<NotifyKitNotificationInput> {
  const attachmentUrl = await getLearningReminderAttachmentUrl();
  return {
    id: notificationId,
    title: request.content.title,
    body: request.content.body,
    data: makeReminderData(request),
    android: {
      channelId: LEARNING_REMINDER_CHANNEL_ID,
      smallIcon: ANDROID_NOTIFICATION_SMALL_ICON,
      color: ANDROID_NOTIFICATION_COLOR,
      largeIcon: learningReminderLargeIconAsset,
      circularLargeIcon: false,
      pressAction: {
        id: DEFAULT_PRESS_ACTION_ID,
      },
      sound: "default",
    },
    ios: {
      sound: "default",
      ...(attachmentUrl
        ? {
            attachments: [
              {
                id: REMINDER_ATTACHMENT_ID,
                url: attachmentUrl,
                typeHint: "public.png",
              },
            ],
          }
        : null),
    },
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
  notifications: NotifyKitModule
): Promise<
  { identifier: string; kind: ReminderNotificationKind; scheduledAt: Date }[]
> {
  const scheduled = await notifications.getTriggerNotifications();
  return scheduled
    .map((item) => {
      const data = asReminderData(item.notification.data);
      if (!data || typeof item.notification.id !== "string") {
        return null;
      }
      return {
        identifier: item.notification.id,
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
  notifications: NotifyKitModule,
  ids: string[]
): Promise<void> {
  await Promise.all(
    ids.map(async (identifier) => {
      try {
        await notifications.cancelNotification(identifier);
      } catch {
        // Ignored: stale id, nothing to cancel.
      }
    })
  );
}

async function cancelLearningReminderNotificationInternal(
  notifications: NotifyKitModule,
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
  notifications: NotifyKitModule
): Promise<void> {
  if (!notifications.getDisplayedNotifications || !notifications.cancelDisplayedNotification) {
    return;
  }

  try {
    const presented = await notifications.getDisplayedNotifications();
    await Promise.all(
      presented
        .filter((item) => asReminderData(item.notification.data) != null)
        .map((item) => item.id ?? item.notification.id)
        .filter((id): id is string => typeof id === "string")
        .map((id) => notifications.cancelDisplayedNotification?.(id))
    );
  } catch {
    // Ignored: presentation APIs are not available on every platform/version.
  }
}

async function cancelLearningReminderNotificationsForDateInternal(
  notifications: NotifyKitModule,
  date: Date
): Promise<Date[]> {
  const targetKey = toLocalDateKey(date);
  const scheduledEntries = await listScheduledReminderEntries(notifications);
  const idsToCancel = scheduledEntries
    .filter(
      (entry) =>
        (entry.kind === LEARNING_REMINDER_KIND ||
          entry.kind === END_OF_DAY_REMINDER_KIND) &&
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
    .filter(
      (entry) =>
        entry.kind === LEARNING_REMINDER_KIND ||
        entry.kind === END_OF_DAY_REMINDER_KIND
    )
    .map((entry) => entry.scheduledAt);
}

export async function cancelLearningReminderNotification(): Promise<void> {
  return enqueueReminderOperation(async () => {
    const notifications = await getNotifyKitModule();
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
    const notifications = await getNotifyKitModule();
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
    const notifications = await getNotifyKitModule();
    if (!notifications) {
      await setStoredNotificationIds([]);
      return [];
    }

    await ensureLearningReminderNotificationChannel();
    await cancelLearningReminderNotificationInternal(notifications);

    const upcomingRequests = requests
      .filter((request) => request.when.getTime() > Date.now())
      .sort((a, b) => a.when.getTime() - b.when.getTime());

    const notificationIds: string[] = [];
    try {
      for (const [index, request] of upcomingRequests.entries()) {
        const notificationId = makeNotificationId(request, index);
        await notifications.createTriggerNotification(
          await buildLearningReminderNotificationContent(
            request,
            notificationId,
            notifications
          ),
          {
            type: notifications.TriggerType.TIMESTAMP,
            timestamp: request.when.getTime(),
          }
        );
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

export async function triggerLearningReminderNotificationRequestPreview(
  request: Omit<LearningReminderNotificationRequest, "when">,
  now: Date = new Date()
): Promise<LearningReminderNotificationPreviewResult> {
  const notifications = await getNotifyKitModule();
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

  await ensureLearningReminderNotificationChannel();

  const triggerDate = new Date(now.getTime() + 1000);
  const notificationId = makeNotificationId(
    {
      ...request,
      when: triggerDate,
    },
    0
  );
  await notifications.createTriggerNotification(
    await buildLearningReminderNotificationContent(
      {
        ...request,
        when: now,
      },
      notificationId,
      notifications
    ),
    {
      type: notifications.TriggerType.TIMESTAMP,
      timestamp: triggerDate.getTime(),
    }
  );

  return {
    permissionState,
    notificationId,
  };
}

export async function triggerLearningReminderNotificationPreview(
  content: LearningReminderNotificationRequest["content"],
  now: Date = new Date()
): Promise<LearningReminderNotificationPreviewResult> {
  return triggerLearningReminderNotificationRequestPreview(
    {
      kind: LEARNING_REMINDER_KIND,
      content,
    },
    now
  );
}

export async function getScheduledLearningReminderDates(): Promise<Date[]> {
  await reminderScheduleOperation;
  const notifications = await getNotifyKitModule();
  if (!notifications) {
    return [];
  }

  const scheduledEntries = await listScheduledReminderEntries(notifications);
  return scheduledEntries
    .filter((entry) => entry.kind === LEARNING_REMINDER_KIND)
    .map((entry) => entry.scheduledAt);
}
