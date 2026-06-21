export const REVIEW_NOTIFICATION_ROUTE = "/review";
export const FLASHCARDS_NOTIFICATION_ROUTE = "/flashcards";

export type NotificationRoute =
  | typeof REVIEW_NOTIFICATION_ROUTE
  | typeof FLASHCARDS_NOTIFICATION_ROUTE;

type NotificationResponseLike = {
  notification?: {
    data?: Record<string, unknown>;
    request?: {
      content?: {
        data?: Record<string, unknown>;
      };
    };
  };
  detail?: {
    notification?: {
      data?: Record<string, unknown>;
    };
  };
};

export function getNotificationResponseRoute(
  response: NotificationResponseLike | null | undefined
): NotificationRoute | null {
  const route =
    response?.notification?.request?.content?.data?.route ??
    response?.notification?.data?.route ??
    response?.detail?.notification?.data?.route;
  return route === REVIEW_NOTIFICATION_ROUTE || route === FLASHCARDS_NOTIFICATION_ROUTE
    ? route
    : null;
}
