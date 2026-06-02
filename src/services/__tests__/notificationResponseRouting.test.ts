import {
  REVIEW_NOTIFICATION_ROUTE,
  getNotificationResponseRoute,
} from "@/src/services/notificationResponseRouting";

describe("notification response routing", () => {
  it("returns the review route for a managed review notification response", () => {
    expect(
      getNotificationResponseRoute({
        notification: {
          request: {
            content: {
              data: {
                route: REVIEW_NOTIFICATION_ROUTE,
              },
            },
          },
        },
      })
    ).toBe(REVIEW_NOTIFICATION_ROUTE);
  });

  it("ignores missing or unsupported routes", () => {
    expect(getNotificationResponseRoute(null)).toBeNull();
    expect(
      getNotificationResponseRoute({
        notification: {
          request: {
            content: {
              data: {
                route: "/settings",
              },
            },
          },
        },
      })
    ).toBeNull();
  });
});
