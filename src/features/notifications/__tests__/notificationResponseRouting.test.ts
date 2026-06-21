import {
  FLASHCARDS_NOTIFICATION_ROUTE,
  REVIEW_NOTIFICATION_ROUTE,
  getNotificationResponseRoute,
} from "@/src/features/notifications";

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

  it("returns the review route for a NotifyKit notification", () => {
    expect(
      getNotificationResponseRoute({
        notification: {
          data: {
            route: REVIEW_NOTIFICATION_ROUTE,
          },
        },
      })
    ).toBe(REVIEW_NOTIFICATION_ROUTE);
  });

  it("returns the review route for a NotifyKit foreground event", () => {
    expect(
      getNotificationResponseRoute({
        detail: {
          notification: {
            data: {
              route: REVIEW_NOTIFICATION_ROUTE,
            },
          },
        },
      })
    ).toBe(REVIEW_NOTIFICATION_ROUTE);
  });

  it("returns the flashcards route for a NotifyKit notification", () => {
    expect(
      getNotificationResponseRoute({
        notification: {
          data: {
            route: FLASHCARDS_NOTIFICATION_ROUTE,
          },
        },
      })
    ).toBe(FLASHCARDS_NOTIFICATION_ROUTE);
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
