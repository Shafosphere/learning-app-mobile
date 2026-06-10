import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  consumePendingNotificationResponse,
  persistPendingNotificationResponse,
  serializeNotificationResponse,
} from "@/src/services/pendingNotificationResponse";

describe("pending notification response", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("serializes a NotifyKit background event into an initial-notification shape", () => {
    expect(
      serializeNotificationResponse({
        detail: {
          notification: {
            id: "notification-id",
            data: {
              route: "/review",
              scheduledAt: "2026-06-10T08:00:00.000Z",
            },
          },
        },
      })
    ).toEqual({
      notification: {
        id: "notification-id",
        data: {
          route: "/review",
          scheduledAt: "2026-06-10T08:00:00.000Z",
        },
      },
    });
  });

  it("persists and consumes one pending response", async () => {
    await persistPendingNotificationResponse({
      detail: {
        notification: {
          id: "notification-id",
          data: {
            route: "/flashcards",
          },
        },
      },
    });

    await expect(consumePendingNotificationResponse()).resolves.toEqual({
      notification: {
        id: "notification-id",
        data: {
          route: "/flashcards",
        },
      },
    });
    await expect(consumePendingNotificationResponse()).resolves.toBeNull();
  });

  it("ignores responses without useful notification data", async () => {
    await persistPendingNotificationResponse({
      detail: {
        notification: {},
      },
    });

    await expect(consumePendingNotificationResponse()).resolves.toBeNull();
  });
});
