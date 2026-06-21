import AsyncStorage from "@react-native-async-storage/async-storage";

const PENDING_NOTIFICATION_RESPONSE_KEY = "notifications.pendingResponse";

type NotifyKitNotificationLike = {
  id?: unknown;
  data?: unknown;
};

type NotificationResponseLike = {
  notification?: NotifyKitNotificationLike;
  detail?: {
    notification?: NotifyKitNotificationLike;
  };
};

type StoredNotificationResponse = {
  notification: {
    id?: string;
    data?: Record<string, unknown>;
  };
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function getNotification(
  response: NotificationResponseLike | null | undefined
): NotifyKitNotificationLike | undefined {
  return response?.notification ?? response?.detail?.notification;
}

export function serializeNotificationResponse(
  response: NotificationResponseLike | null | undefined
): StoredNotificationResponse | null {
  const notification = getNotification(response);
  if (!notification) {
    return null;
  }

  const id = typeof notification.id === "string" ? notification.id : undefined;
  const data = asRecord(notification.data);
  if (!id && !data) {
    return null;
  }

  return {
    notification: {
      ...(id ? { id } : {}),
      ...(data ? { data } : {}),
    },
  };
}

export async function persistPendingNotificationResponse(
  response: NotificationResponseLike | null | undefined
): Promise<void> {
  const payload = serializeNotificationResponse(response);
  if (!payload) {
    return;
  }

  await AsyncStorage.setItem(
    PENDING_NOTIFICATION_RESPONSE_KEY,
    JSON.stringify(payload)
  );
}

export async function consumePendingNotificationResponse(): Promise<
  StoredNotificationResponse | null
> {
  const raw = await AsyncStorage.getItem(PENDING_NOTIFICATION_RESPONSE_KEY);
  if (!raw) {
    return null;
  }

  await AsyncStorage.removeItem(PENDING_NOTIFICATION_RESPONSE_KEY);

  try {
    const parsed = JSON.parse(raw) as unknown;
    const payload = serializeNotificationResponse(parsed as NotificationResponseLike);
    return payload;
  } catch {
    return null;
  }
}
