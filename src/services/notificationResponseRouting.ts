export const REVIEW_NOTIFICATION_ROUTE = "/review";

export type NotificationRoute = typeof REVIEW_NOTIFICATION_ROUTE;

type NotificationResponseLike = {
  notification?: {
    request?: {
      content?: {
        data?: Record<string, unknown>;
      };
    };
  };
};

export function getNotificationResponseRoute(
  response: NotificationResponseLike | null | undefined
): NotificationRoute | null {
  const route = response?.notification?.request?.content?.data?.route;
  return route === REVIEW_NOTIFICATION_ROUTE ? REVIEW_NOTIFICATION_ROUTE : null;
}
