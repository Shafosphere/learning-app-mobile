/* eslint-disable @typescript-eslint/no-require-imports */
const Constants = require("expo-constants").default;

if (Constants.executionEnvironment !== "storeClient") {
  try {
    const notifyKit = require("react-native-notify-kit");
    const notifee = notifyKit.default;
    const {
      persistPendingNotificationResponse,
    } = require("./src/features/notifications/pendingNotificationResponse");

    notifee.onBackgroundEvent(async (event) => {
      if (event?.type === notifyKit.EventType?.PRESS) {
        await persistPendingNotificationResponse(event);
      }
    });
  } catch (error) {
    console.warn("[NotifyKit] Background handler unavailable", error);
  }
}

require("expo-router/entry");
