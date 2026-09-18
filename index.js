/* eslint-disable @typescript-eslint/no-require-imports */
// Capture this before loading the router so app-shell-ready includes module
// initialization, rather than only the time after app/_layout.tsx evaluates.
globalThis.__MEMICARD_JS_ENTRY_STARTED_AT =
  typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();

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
