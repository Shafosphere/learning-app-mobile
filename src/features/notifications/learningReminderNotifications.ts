import AsyncStorage from "@react-native-async-storage/async-storage";
import { Asset } from "expo-asset";
import Constants from "expo-constants";
import { Platform } from "react-native";
import learningReminderAttachmentAsset from "@/assets/app/icons/notification-icon.png";
import learningReminderLargeIconAsset from "@/assets/app/icons/generated/android/play_store_512.png";
import {
  LEGACY_END_OF_DAY_REMINDER_KIND,
  LEGACY_LEARNING_REMINDER_KIND,
  LEGACY_REVIEW_REMINDER_KIND,
  REVIEW_DUE_REMINDER_KIND,
  STREAK_WARNING_REMINDER_KIND,
  STUDY_REMINDER_KIND,
  type ReminderKind,
  type ReminderPlanEntry,
  type ReminderRoute,
} from "./reminderTypes";

const REMINDER_NOTIFICATION_IDS_KEY = "learningReminder.notificationIds";
const REMINDER_NOTIFICATION_REGISTRY_KEY = "learningReminder.notificationRegistry";
export const LEARNING_REMINDER_KIND = STUDY_REMINDER_KIND;
export const REVIEW_REMINDER_KIND = REVIEW_DUE_REMINDER_KIND;
export const END_OF_DAY_REMINDER_KIND = STREAK_WARNING_REMINDER_KIND;
export const LEARNING_REMINDER_CHANNEL_ID = "learning_reminders_study";
export const REVIEW_REMINDER_CHANNEL_ID = "learning_reminders_reviews";
export const STREAK_WARNING_REMINDER_CHANNEL_ID = "learning_reminders_streak";
export const REMINDER_TIMEOUT_DEFAULT_MS = 2 * 60 * 60 * 1000;
export const REMINDER_CLEAR_BEFORE_NEXT_MS = 10 * 60 * 1000;
export const REMINDER_MIN_TIMEOUT_MS = 60 * 1000;
const REMINDER_ATTACHMENT_ID = "learning-reminder-logo";
const DEFAULT_PRESS_ACTION_ID = "default";
const ANDROID_NOTIFICATION_SMALL_ICON = "notification_icon";
const ANDROID_NOTIFICATION_COLOR = "#001534";

type ReminderNotificationData = {
  kind: ReminderKind;
  scheduledAt: string;
  dedupeKey: string;
  dueReviewCount?: number;
  route: ReminderRoute;
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
    timeoutAfter?: number;
  };
  ios?: {
    sound?: "default";
    threadId?: string;
    attachments?: ReminderNotificationAttachment[];
  };
};
type NotifyKitTriggerInput = {
  type: number | string;
  timestamp: number;
  alarmManager?: {
    type?: number;
  };
};

export type ReminderPermissionState = "granted" | "denied" | "undetermined";
export type LearningReminderNotificationRequest = {
  when: Date;
  kind?: ReminderKind | typeof LEGACY_LEARNING_REMINDER_KIND | typeof LEGACY_REVIEW_REMINDER_KIND | typeof LEGACY_END_OF_DAY_REMINDER_KIND;
  content: {
    title: string;
    body: string;
  };
  data?: {
    dueReviewCount?: number;
    route?: ReminderRoute;
  };
};
export type LearningReminderNotificationPreviewResult = {
  permissionState: ReminderPermissionState;
  notificationId: string | null;
};
export type ReminderSchedulingDiagnostics = {
  exactAlarmSetting: "enabled" | "disabled" | "not_supported" | "unknown";
  powerManagerActivity: string | null;
};
type ReminderNotificationRegistryEntry = {
  id: string;
  kind: ReminderKind;
  scheduledAt: string;
  dedupeKey: string;
  route: ReminderRoute;
  dueReviewCount?: number;
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
  android?: {
    alarm?: number;
  };
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
  AndroidNotificationSetting?: {
    NOT_SUPPORTED: number;
    DISABLED: number;
    ENABLED: number;
  };
  AlarmType?: {
    SET_EXACT_AND_ALLOW_WHILE_IDLE: number;
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
  getPowerManagerInfo?: () => Promise<{ activity?: string | null }>;
  openAlarmPermissionSettings?: () => Promise<void>;
  openPowerManagerSettings?: () => Promise<void>;
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
        AlarmType: module.AlarmType as NotifyKitModule["AlarmType"],
        AndroidNotificationSetting:
          module.AndroidNotificationSetting as NotifyKitModule["AndroidNotificationSetting"],
        AndroidImportance: module.AndroidImportance as NotifyKitModule["AndroidImportance"],
        AuthorizationStatus: module.AuthorizationStatus as NotifyKitModule["AuthorizationStatus"],
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

function getChannelId(kind: ReminderKind): string {
  if (kind === REVIEW_DUE_REMINDER_KIND) {
    return REVIEW_REMINDER_CHANNEL_ID;
  }
  if (kind === STREAK_WARNING_REMINDER_KIND) {
    return STREAK_WARNING_REMINDER_CHANNEL_ID;
  }
  return LEARNING_REMINDER_CHANNEL_ID;
}

function getChannelName(kind: ReminderKind): string {
  if (kind === REVIEW_DUE_REMINDER_KIND) {
    return "Review reminders";
  }
  if (kind === STREAK_WARNING_REMINDER_KIND) {
    return "Streak reminders";
  }
  return "Study reminders";
}

export async function ensureLearningReminderNotificationChannel(): Promise<void> {
  const notifications = await getNotifyKitModule();
  if (!notifications) {
    return;
  }

  await Promise.all(
    ([STUDY_REMINDER_KIND, REVIEW_DUE_REMINDER_KIND, STREAK_WARNING_REMINDER_KIND] as ReminderKind[]).map(
      (kind) =>
        notifications.createChannel({
          id: getChannelId(kind),
          name: getChannelName(kind),
          importance: notifications.AndroidImportance.DEFAULT,
          sound: "default",
        })
    )
  );
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

async function getReminderRegistry(): Promise<ReminderNotificationRegistryEntry[]> {
  const raw = await AsyncStorage.getItem(REMINDER_NOTIFICATION_REGISTRY_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (entry): entry is ReminderNotificationRegistryEntry =>
        typeof entry?.id === "string" &&
        isReminderKind(entry.kind) &&
        typeof entry.scheduledAt === "string" &&
        typeof entry.dedupeKey === "string" &&
        (entry.route === "/review" || entry.route === "/flashcards")
    );
  } catch {
    return [];
  }
}

async function setReminderRegistry(
  entries: ReminderNotificationRegistryEntry[]
): Promise<void> {
  if (entries.length === 0) {
    await AsyncStorage.removeItem(REMINDER_NOTIFICATION_REGISTRY_KEY);
    await setStoredNotificationIds([]);
    return;
  }
  await AsyncStorage.setItem(
    REMINDER_NOTIFICATION_REGISTRY_KEY,
    JSON.stringify(entries)
  );
  await setStoredNotificationIds(entries.map((entry) => entry.id));
}

function isReminderKind(value: unknown): value is ReminderKind {
  return (
    value === STUDY_REMINDER_KIND ||
    value === REVIEW_DUE_REMINDER_KIND ||
    value === STREAK_WARNING_REMINDER_KIND
  );
}

function normalizeReminderKind(value: unknown): ReminderKind | null {
  if (isReminderKind(value)) {
    return value;
  }
  if (value === LEGACY_LEARNING_REMINDER_KIND) {
    return STUDY_REMINDER_KIND;
  }
  if (value === LEGACY_REVIEW_REMINDER_KIND) {
    return REVIEW_DUE_REMINDER_KIND;
  }
  if (value === LEGACY_END_OF_DAY_REMINDER_KIND) {
    return STREAK_WARNING_REMINDER_KIND;
  }
  return null;
}

function asReminderData(
  data: Record<string, unknown> | undefined
): ReminderNotificationData | null {
  const kind = normalizeReminderKind(data?.kind);
  if (!data || !kind || typeof data.scheduledAt !== "string") {
    return null;
  }
  const route =
    data.route === "/review" || data.route === "/flashcards"
      ? data.route
      : kind === REVIEW_DUE_REMINDER_KIND
        ? "/review"
        : "/flashcards";
  return {
    kind,
    scheduledAt: data.scheduledAt,
    dedupeKey:
      typeof data.dedupeKey === "string"
        ? data.dedupeKey
        : `${kind}:${data.scheduledAt.slice(0, 10)}`,
    route,
    ...(typeof data.dueReviewCount === "number"
      ? { dueReviewCount: data.dueReviewCount }
      : null),
  };
}

function makeReminderData(entry: ReminderPlanEntry): ReminderNotificationData {
  return {
    kind: entry.kind,
    scheduledAt: entry.scheduledAt.toISOString(),
    dedupeKey: entry.dedupeKey,
    route: entry.route,
    ...(typeof entry.dueReviewCount === "number"
      ? { dueReviewCount: entry.dueReviewCount }
      : null),
  };
}

function makeNotificationId(entry: ReminderPlanEntry): string {
  return `memicard-${entry.dedupeKey}-${entry.scheduledAt.getTime()}`;
}

function requestToPlanEntry(
  request: LearningReminderNotificationRequest,
  now: Date
): ReminderPlanEntry {
  const kind = normalizeReminderKind(request.kind) ?? STUDY_REMINDER_KIND;
  const scheduledAt = request.when;
  const dateKey = `${scheduledAt.getFullYear()}-${String(
    scheduledAt.getMonth() + 1
  ).padStart(2, "0")}-${String(scheduledAt.getDate()).padStart(2, "0")}`;
  return {
    kind,
    scheduledAt,
    title: request.content.title,
    body: request.content.body,
    route:
      request.data?.route ??
      (kind === REVIEW_DUE_REMINDER_KIND ? "/review" : "/flashcards"),
    ...(typeof request.data?.dueReviewCount === "number"
      ? { dueReviewCount: request.data.dueReviewCount }
      : null),
    dedupeKey: `${kind}:${dateKey}`,
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

async function buildReminderNotificationContent(
  entry: ReminderPlanEntry,
  notificationId: string,
  timeoutAfter: number
): Promise<NotifyKitNotificationInput> {
  const attachmentUrl = await getLearningReminderAttachmentUrl();
  return {
    id: notificationId,
    title: entry.title,
    body: entry.body,
    data: makeReminderData(entry),
    android: {
      channelId: getChannelId(entry.kind),
      smallIcon: ANDROID_NOTIFICATION_SMALL_ICON,
      color: ANDROID_NOTIFICATION_COLOR,
      largeIcon: learningReminderLargeIconAsset,
      circularLargeIcon: false,
      pressAction: {
        id: DEFAULT_PRESS_ACTION_ID,
      },
      sound: "default",
      timeoutAfter,
    },
    ios: {
      sound: "default",
      threadId: entry.kind,
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

function getReminderTimeoutAfter(
  entry: ReminderPlanEntry,
  upcomingPlan: ReminderPlanEntry[]
): number {
  if (entry.kind === STREAK_WARNING_REMINDER_KIND) {
    return REMINDER_TIMEOUT_DEFAULT_MS;
  }

  const nextSameDayEntry = upcomingPlan.find(
    (candidate) =>
      candidate.scheduledAt.getTime() > entry.scheduledAt.getTime() &&
      isSameLocalDate(candidate.scheduledAt, entry.scheduledAt)
  );

  if (!nextSameDayEntry) {
    return REMINDER_TIMEOUT_DEFAULT_MS;
  }

  return Math.max(
    REMINDER_MIN_TIMEOUT_MS,
    nextSameDayEntry.scheduledAt.getTime() -
      entry.scheduledAt.getTime() -
      REMINDER_CLEAR_BEFORE_NEXT_MS
  );
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
  { identifier: string; kind: ReminderKind; scheduledAt: Date; dedupeKey: string }[]
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
        dedupeKey: data.dedupeKey,
      };
    })
    .filter(
      (
        item
      ): item is {
        identifier: string;
        kind: ReminderKind;
        scheduledAt: Date;
        dedupeKey: string;
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

async function dismissPresentedLearningReminderNotifications(
  notifications: NotifyKitModule,
  shouldDismiss: (data: ReminderNotificationData) => boolean = () => true
): Promise<void> {
  if (!notifications.getDisplayedNotifications || !notifications.cancelDisplayedNotification) {
    return;
  }

  try {
    const presented = await notifications.getDisplayedNotifications();
    await Promise.all(
      presented
        .filter((item) => {
          const data = asReminderData(item.notification.data);
          return data != null && shouldDismiss(data);
        })
        .map((item) => item.id ?? item.notification.id)
        .filter((id): id is string => typeof id === "string")
        .map((id) => notifications.cancelDisplayedNotification?.(id))
    );
  } catch {
    // Ignored: presentation APIs are not available on every platform/version.
  }
}

async function cancelManagedReminderScheduleInternal(
  notifications: NotifyKitModule,
  options: { dismissPresented?: boolean } = {}
): Promise<void> {
  const [storedIds, registry, scheduledEntries] = await Promise.all([
    getStoredNotificationIds(),
    getReminderRegistry(),
    listScheduledReminderEntries(notifications),
  ]);
  const idsToCancel = Array.from(
    new Set([
      ...storedIds,
      ...registry.map((entry) => entry.id),
      ...scheduledEntries.map((entry) => entry.identifier),
    ])
  );
  await cancelNotificationIds(notifications, idsToCancel);
  if (options.dismissPresented) {
    await dismissPresentedLearningReminderNotifications(notifications);
  }
  await setReminderRegistry([]);
}

function isSameLocalDate(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function isReminderDataForDate(
  data: Pick<ReminderNotificationData, "scheduledAt">,
  date: Date
): boolean {
  const scheduledAt = new Date(data.scheduledAt);
  return (
    Number.isFinite(scheduledAt.getTime()) && isSameLocalDate(scheduledAt, date)
  );
}

function buildTimestampTrigger(
  notifications: NotifyKitModule,
  timestamp: number
): NotifyKitTriggerInput {
  return {
    type: notifications.TriggerType.TIMESTAMP,
    timestamp,
    ...(notifications.AlarmType
      ? {
          alarmManager: {
            type: notifications.AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE,
          },
        }
      : {
          alarmManager: {},
        }),
  };
}

export async function replaceManagedReminderSchedule(
  plan: ReminderPlanEntry[]
): Promise<string[]> {
  return enqueueReminderOperation(async () => {
    const notifications = await getNotifyKitModule();
    if (!notifications) {
      await setReminderRegistry([]);
      return [];
    }

    await ensureLearningReminderNotificationChannel();
    await cancelManagedReminderScheduleInternal(notifications, {
      dismissPresented: true,
    });

    const upcomingPlan = plan
      .filter((entry) => entry.scheduledAt.getTime() > Date.now())
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

    const registryEntries: ReminderNotificationRegistryEntry[] = [];
    try {
      for (const entry of upcomingPlan) {
        const notificationId = makeNotificationId(entry);
        await notifications.createTriggerNotification(
          await buildReminderNotificationContent(
            entry,
            notificationId,
            getReminderTimeoutAfter(entry, upcomingPlan)
          ),
          buildTimestampTrigger(notifications, entry.scheduledAt.getTime())
        );
        registryEntries.push({
          id: notificationId,
          kind: entry.kind,
          scheduledAt: entry.scheduledAt.toISOString(),
          dedupeKey: entry.dedupeKey,
          route: entry.route,
          ...(typeof entry.dueReviewCount === "number"
            ? { dueReviewCount: entry.dueReviewCount }
            : null),
        });
      }
    } catch (error) {
      await cancelNotificationIds(
        notifications,
        registryEntries.map((entry) => entry.id)
      );
      await setReminderRegistry([]);
      throw error;
    }

    await setReminderRegistry(registryEntries);
    return registryEntries.map((entry) => entry.id);
  });
}

export async function cancelLearningReminderNotification(): Promise<void> {
  return enqueueReminderOperation(async () => {
    const notifications = await getNotifyKitModule();
    if (!notifications) {
      await setReminderRegistry([]);
      return;
    }

    await cancelManagedReminderScheduleInternal(notifications, {
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

    const [registry, scheduledEntries] = await Promise.all([
      getReminderRegistry(),
      listScheduledReminderEntries(notifications),
    ]);
    const registryEntriesToCancel = registry.filter((entry) =>
      isReminderDataForDate(entry, date)
    );
    const scheduledEntriesToCancel = scheduledEntries.filter((entry) =>
      isSameLocalDate(entry.scheduledAt, date)
    );
    const idsToCancel = Array.from(
      new Set([
        ...registryEntriesToCancel.map((entry) => entry.id),
        ...scheduledEntriesToCancel.map((entry) => entry.identifier),
      ])
    );

    await cancelNotificationIds(notifications, idsToCancel);
    await dismissPresentedLearningReminderNotifications(notifications, (data) =>
      isReminderDataForDate(data, date)
    );

    const remainingRegistry = registry.filter(
      (entry) => !isReminderDataForDate(entry, date)
    );
    await setReminderRegistry(remainingRegistry);

    const remainingDatesByMs = new Map<number, Date>();
    for (const entry of scheduledEntries.filter(
      (entry) => !isSameLocalDate(entry.scheduledAt, date)
    )) {
      remainingDatesByMs.set(entry.scheduledAt.getTime(), entry.scheduledAt);
    }
    for (const entry of remainingRegistry) {
      const scheduledAt = new Date(entry.scheduledAt);
      if (Number.isFinite(scheduledAt.getTime())) {
        remainingDatesByMs.set(scheduledAt.getTime(), scheduledAt);
      }
    }

    return Array.from(remainingDatesByMs.values())
      .sort((left, right) => left.getTime() - right.getTime());
  });
}

export async function scheduleLearningReminderNotifications(
  requests: LearningReminderNotificationRequest[]
): Promise<string[]> {
  const now = new Date();
  return replaceManagedReminderSchedule(
    requests.map((request) => requestToPlanEntry(request, now))
  );
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
  const entry = requestToPlanEntry(
    {
      ...request,
      when: now,
    },
    now
  );
  const notificationId = makeNotificationId({
    ...entry,
    scheduledAt: triggerDate,
  });
  await notifications.createTriggerNotification(
    await buildReminderNotificationContent(
      entry,
      notificationId,
      REMINDER_TIMEOUT_DEFAULT_MS
    ),
    buildTimestampTrigger(notifications, triggerDate.getTime())
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
      kind: STUDY_REMINDER_KIND,
      content,
      data: {
        route: "/flashcards",
      },
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
  return scheduledEntries.map((entry) => entry.scheduledAt);
}

export async function getManagedReminderRegistry(): Promise<
  ReminderNotificationRegistryEntry[]
> {
  return getReminderRegistry();
}

export async function getReminderSchedulingDiagnostics(): Promise<ReminderSchedulingDiagnostics> {
  const notifications = await getNotifyKitModule();
  if (!notifications) {
    return {
      exactAlarmSetting: "unknown",
      powerManagerActivity: null,
    };
  }

  const [settings, powerManagerInfo] = await Promise.all([
    notifications.getNotificationSettings().catch(() => null),
    notifications.getPowerManagerInfo?.().catch(() => null) ?? Promise.resolve(null),
  ]);
  const alarm = settings?.android?.alarm;
  const exactAlarmSetting =
    alarm === notifications.AndroidNotificationSetting?.ENABLED
      ? "enabled"
      : alarm === notifications.AndroidNotificationSetting?.DISABLED
        ? "disabled"
        : alarm === notifications.AndroidNotificationSetting?.NOT_SUPPORTED
          ? "not_supported"
          : "unknown";

  return {
    exactAlarmSetting,
    powerManagerActivity: powerManagerInfo?.activity ?? null,
  };
}

export async function openReminderExactAlarmSettings(): Promise<void> {
  const notifications = await getNotifyKitModule();
  await notifications?.openAlarmPermissionSettings?.();
}

export async function openReminderPowerManagerSettings(): Promise<void> {
  const notifications = await getNotifyKitModule();
  await notifications?.openPowerManagerSettings?.();
}
