import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  __setLearningReminderAttachmentUrlForTests,
  __setLearningReminderNotificationsModuleForTests,
  END_OF_DAY_REMINDER_KIND,
  LEARNING_REMINDER_CHANNEL_ID,
  cancelLearningReminderNotification,
  cancelLearningReminderNotificationsForDate,
  scheduleLearningReminderNotifications,
  triggerLearningReminderNotificationRequestPreview,
  triggerLearningReminderNotificationPreview,
} from "@/src/features/notifications";

type MockNotifyKitNotification = {
  id?: string;
  title?: string;
  body?: string;
  data: Record<string, unknown>;
  android: {
    channelId: string;
    smallIcon?: string;
    color?: string;
    largeIcon?: number | string | object;
    circularLargeIcon?: boolean;
    pressAction: {
      id: string;
    };
  };
  ios?: unknown;
};
type MockNotifyKitTrigger = {
  type: number | string;
  timestamp: number;
};

const mockCreateTriggerNotification: jest.Mock<
  Promise<string>,
  [MockNotifyKitNotification, MockNotifyKitTrigger]
> = jest.fn(
  async (notification: MockNotifyKitNotification, _trigger: MockNotifyKitTrigger) =>
    notification.id ?? "notification-id"
);
const mockCreateChannel = jest.fn(async (channel) => channel.id);
const mockGetTriggerNotifications = jest.fn();
const mockCancelNotification = jest.fn();
const mockGetDisplayedNotifications = jest.fn();
const mockCancelDisplayedNotification = jest.fn();
const AUTHORIZATION_STATUS = {
  NOT_DETERMINED: -1,
  DENIED: 0,
  AUTHORIZED: 1,
  PROVISIONAL: 2,
};
const mockNotifyKitModule = {
  AndroidImportance: {
    DEFAULT: 3,
  },
  AuthorizationStatus: AUTHORIZATION_STATUS,
  TriggerType: {
    TIMESTAMP: 0,
  },
  cancelDisplayedNotification: mockCancelDisplayedNotification,
  cancelNotification: mockCancelNotification,
  createChannel: mockCreateChannel,
  createTriggerNotification: mockCreateTriggerNotification,
  getDisplayedNotifications: mockGetDisplayedNotifications,
  getNotificationSettings: jest.fn(async () => ({
    authorizationStatus: AUTHORIZATION_STATUS.AUTHORIZED,
  })),
  getTriggerNotifications: mockGetTriggerNotifications,
  requestPermission: jest.fn(async () => ({
    authorizationStatus: AUTHORIZATION_STATUS.AUTHORIZED,
  })),
};

function expectAndroidReminderBranding(
  android: MockNotifyKitNotification["android"]
): void {
  expect(android).toEqual(
    expect.objectContaining({
      smallIcon: "notification_icon",
      color: "#001534",
      largeIcon: expect.anything(),
      circularLargeIcon: false,
    })
  );
  expect(android).not.toHaveProperty("style");
}

describe("learning reminder notifications", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockGetTriggerNotifications.mockResolvedValue([]);
    mockGetDisplayedNotifications.mockResolvedValue([]);
    mockCancelNotification.mockResolvedValue(undefined);
    mockCancelDisplayedNotification.mockResolvedValue(undefined);
    __setLearningReminderNotificationsModuleForTests(mockNotifyKitModule);
    __setLearningReminderAttachmentUrlForTests(null);
  });

  it("passes a distinct body for each scheduled reminder request", async () => {
    await scheduleLearningReminderNotifications([
      {
        when: new Date("2099-01-01T18:00:00.000Z"),
        content: {
          title: "Czas na fiszki",
          body: "Za chwilke Twoja pora na fiszki",
        },
      },
      {
        when: new Date("2099-01-01T19:00:00.000Z"),
        content: {
          title: "Czas na fiszki",
          body: "To teraz! Wroc do fiszek na chwilke",
        },
      },
    ]);

    expect(mockCreateChannel).toHaveBeenCalledWith({
      id: LEARNING_REMINDER_CHANNEL_ID,
      name: "Learning reminders",
      importance: 3,
      sound: "default",
    });
    expect(mockCreateTriggerNotification).toHaveBeenCalledTimes(2);
    expect(
      mockCreateTriggerNotification.mock.calls.map(([notification, trigger]) => ({
        title: notification.title,
        body: notification.body,
        kind: notification.data.kind,
        scheduledAt: notification.data.scheduledAt,
        timestamp: trigger.timestamp,
        triggerType: trigger.type,
        channelId: notification.android.channelId,
        pressActionId: notification.android.pressAction.id,
      }))
    ).toEqual([
      {
        title: "Czas na fiszki",
        body: "Za chwilke Twoja pora na fiszki",
        kind: "learning_reminder",
        scheduledAt: "2099-01-01T18:00:00.000Z",
        timestamp: new Date("2099-01-01T18:00:00.000Z").getTime(),
        triggerType: 0,
        channelId: LEARNING_REMINDER_CHANNEL_ID,
        pressActionId: "default",
      },
      {
        title: "Czas na fiszki",
        body: "To teraz! Wroc do fiszek na chwilke",
        kind: "learning_reminder",
        scheduledAt: "2099-01-01T19:00:00.000Z",
        timestamp: new Date("2099-01-01T19:00:00.000Z").getTime(),
        triggerType: 0,
        channelId: LEARNING_REMINDER_CHANNEL_ID,
        pressActionId: "default",
      },
    ]);
  });

  it("triggers a learning reminder preview notification", async () => {
    mockNotifyKitModule.getNotificationSettings.mockResolvedValueOnce({
      authorizationStatus: AUTHORIZATION_STATUS.NOT_DETERMINED,
    });
    mockNotifyKitModule.requestPermission.mockResolvedValueOnce({
      authorizationStatus: AUTHORIZATION_STATUS.AUTHORIZED,
    });

    const result = await triggerLearningReminderNotificationPreview(
      {
        title: "Czas na fiszki",
        body: "To teraz! Wroc do fiszek na chwilke",
      },
      new Date("2099-01-01T18:00:00.000Z")
    );

    expect(mockNotifyKitModule.requestPermission).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      permissionState: "granted",
      notificationId: "memicard-learning_reminder-4070973601000-0",
    });
    expect(mockCreateTriggerNotification).toHaveBeenCalledWith(
      {
        id: "memicard-learning_reminder-4070973601000-0",
        title: "Czas na fiszki",
        body: "To teraz! Wroc do fiszek na chwilke",
        data: {
          kind: "learning_reminder",
          scheduledAt: "2099-01-01T18:00:00.000Z",
        },
        android: {
          channelId: LEARNING_REMINDER_CHANNEL_ID,
          smallIcon: "notification_icon",
          color: "#001534",
          largeIcon: expect.anything(),
          circularLargeIcon: false,
          pressAction: {
            id: "default",
          },
          sound: "default",
        },
        ios: {
          sound: "default",
        },
      },
      {
        type: 0,
        timestamp: new Date("2099-01-01T18:00:01.000Z").getTime(),
      }
    );
    const previewAndroid = mockCreateTriggerNotification.mock.calls[0][0].android;
    expectAndroidReminderBranding(previewAndroid);
  });

  it("uses the same Android reminder branding for scheduled and preview notifications", async () => {
    await scheduleLearningReminderNotifications([
      {
        when: new Date("2099-01-01T18:00:00.000Z"),
        content: {
          title: "Czas na fiszki",
          body: "To teraz! Wroc do fiszek na chwilke",
        },
      },
    ]);
    const scheduledAndroid = mockCreateTriggerNotification.mock.calls[0][0].android;

    mockCreateTriggerNotification.mockClear();

    await triggerLearningReminderNotificationPreview(
      {
        title: "Czas na fiszki",
        body: "To teraz! Wroc do fiszek na chwilke",
      },
      new Date("2099-01-01T18:00:00.000Z")
    );
    const previewAndroid = mockCreateTriggerNotification.mock.calls[0][0].android;

    expectAndroidReminderBranding(scheduledAndroid);
    expectAndroidReminderBranding(previewAndroid);
    expect(previewAndroid.largeIcon).toBe(scheduledAndroid.largeIcon);
  });

  it("schedules review reminder notifications with count and route data", async () => {
    await scheduleLearningReminderNotifications([
      {
        kind: "review_reminder",
        when: new Date("2099-01-01T14:00:00.000Z"),
        content: {
          title: "Powtorki czekaja",
          body: "Hej, masz 23 fiszki do powtorki. Wchodzisz?",
        },
        data: {
          dueReviewCount: 23,
          route: "/review",
        },
      },
    ]);

    expect(mockCreateTriggerNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Powtorki czekaja",
        body: "Hej, masz 23 fiszki do powtorki. Wchodzisz?",
        data: {
          kind: "review_reminder",
          scheduledAt: "2099-01-01T14:00:00.000Z",
          dueReviewCount: 23,
          route: "/review",
        },
        android: expect.objectContaining({
          channelId: LEARNING_REMINDER_CHANNEL_ID,
          pressAction: {
            id: "default",
          },
        }),
      }),
      {
        type: 0,
        timestamp: new Date("2099-01-01T14:00:00.000Z").getTime(),
      }
    );
  });

  it("triggers a review reminder preview notification with count and route data", async () => {
    const result = await triggerLearningReminderNotificationRequestPreview(
      {
        kind: "review_reminder",
        content: {
          title: "Powtorki czekaja",
          body: "Hej, masz 42 fiszki do powtorki. Wchodzisz?",
        },
        data: {
          dueReviewCount: 42,
          route: "/review",
        },
      },
      new Date("2099-01-01T18:00:00.000Z")
    );

    expect(result).toEqual({
      permissionState: "granted",
      notificationId: "memicard-review_reminder-4070973601000-0",
    });
    expect(mockCreateTriggerNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "memicard-review_reminder-4070973601000-0",
        title: "Powtorki czekaja",
        body: "Hej, masz 42 fiszki do powtorki. Wchodzisz?",
        data: {
          kind: "review_reminder",
          scheduledAt: "2099-01-01T18:00:00.000Z",
          dueReviewCount: 42,
          route: "/review",
        },
        android: expect.objectContaining({
          channelId: LEARNING_REMINDER_CHANNEL_ID,
          pressAction: {
            id: "default",
          },
        }),
      }),
      {
        type: 0,
        timestamp: new Date("2099-01-01T18:00:01.000Z").getTime(),
      }
    );
  });

  it("schedules end-of-day reminder notifications with flashcards route data", async () => {
    await scheduleLearningReminderNotifications([
      {
        kind: END_OF_DAY_REMINDER_KIND,
        when: new Date("2099-01-01T23:00:00.000Z"),
        content: {
          title: "Jeszcze jest czas",
          body: "Krótka powtórka na koniec dnia?",
        },
        data: {
          route: "/flashcards",
        },
      },
    ]);

    expect(mockCreateTriggerNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Jeszcze jest czas",
        body: "Krótka powtórka na koniec dnia?",
        data: {
          kind: "end_of_day_reminder",
          scheduledAt: "2099-01-01T23:00:00.000Z",
          route: "/flashcards",
        },
        android: expect.objectContaining({
          channelId: LEARNING_REMINDER_CHANNEL_ID,
          pressAction: {
            id: "default",
          },
        }),
      }),
      {
        type: 0,
        timestamp: new Date("2099-01-01T23:00:00.000Z").getTime(),
      }
    );
  });

  it("adds the learning reminder logo attachment when available", async () => {
    __setLearningReminderAttachmentUrlForTests("file:///notification-logo.png");

    await scheduleLearningReminderNotifications([
      {
        when: new Date("2099-01-01T18:00:00.000Z"),
        content: {
          title: "Czas na fiszki",
          body: "To teraz! Wroc do fiszek na chwilke",
        },
      },
    ]);

    expect(mockCreateTriggerNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        ios: {
          sound: "default",
          attachments: [
            {
              id: "learning-reminder-logo",
              url: "file:///notification-logo.png",
              typeHint: "public.png",
            },
          ],
        },
      }),
      expect.anything()
    );
  });

  it("dismisses already presented managed reminder notifications when cancelling all", async () => {
    mockGetTriggerNotifications.mockResolvedValue([
      {
        notification: {
          id: "scheduled-reminder-id",
          data: {
            kind: "learning_reminder",
            scheduledAt: "2099-01-01T18:00:00.000Z",
          },
        },
        trigger: {},
      },
      {
        notification: {
          id: "scheduled-review-reminder-id",
          data: {
            kind: "review_reminder",
            scheduledAt: "2099-01-01T14:00:00.000Z",
          },
        },
        trigger: {},
      },
    ]);
    mockGetDisplayedNotifications.mockResolvedValue([
      {
        id: "presented-reminder-id",
        notification: {
          data: {
            kind: "learning_reminder",
            scheduledAt: "2099-01-01T18:00:00.000Z",
          },
        },
      },
      {
        id: "other-notification-id",
        notification: {
          data: {
            kind: "other",
          },
        },
      },
    ]);

    await cancelLearningReminderNotification();

    expect(mockCancelNotification).toHaveBeenCalledWith("scheduled-reminder-id");
    expect(mockCancelNotification).toHaveBeenCalledWith(
      "scheduled-review-reminder-id"
    );
    expect(mockCancelNotification).toHaveBeenCalledTimes(2);
    expect(mockCancelDisplayedNotification).toHaveBeenCalledTimes(1);
    expect(mockCancelDisplayedNotification).toHaveBeenCalledWith(
      "presented-reminder-id"
    );
  });

  it("cancels only learning and end-of-day reminders for a date", async () => {
    mockGetTriggerNotifications.mockResolvedValue([
      {
        notification: {
          id: "learning-today-id",
          data: {
            kind: "learning_reminder",
            scheduledAt: "2099-01-01T18:00:00.000Z",
          },
        },
        trigger: {},
      },
      {
        notification: {
          id: "end-of-day-today-id",
          data: {
            kind: "end_of_day_reminder",
            scheduledAt: "2099-01-01T22:00:00.000Z",
            route: "/flashcards",
          },
        },
        trigger: {},
      },
      {
        notification: {
          id: "review-today-id",
          data: {
            kind: "review_reminder",
            scheduledAt: "2099-01-01T14:00:00.000Z",
          },
        },
        trigger: {},
      },
      {
        notification: {
          id: "end-of-day-tomorrow-id",
          data: {
            kind: "end_of_day_reminder",
            scheduledAt: "2099-01-02T22:00:00.000Z",
            route: "/flashcards",
          },
        },
        trigger: {},
      },
      {
        notification: {
          id: "learning-tomorrow-id",
          data: {
            kind: "learning_reminder",
            scheduledAt: "2099-01-02T18:00:00.000Z",
          },
        },
        trigger: {},
      },
    ]);

    const remainingLearningDates = await cancelLearningReminderNotificationsForDate(
      new Date("2099-01-01T12:00:00.000Z")
    );

    expect(mockCancelNotification).toHaveBeenCalledTimes(2);
    expect(mockCancelNotification).toHaveBeenCalledWith("learning-today-id");
    expect(mockCancelNotification).toHaveBeenCalledWith("end-of-day-today-id");
    expect(mockCancelNotification).not.toHaveBeenCalledWith("review-today-id");
    expect(remainingLearningDates.map((date) => date.toISOString())).toEqual([
      "2099-01-02T18:00:00.000Z",
      "2099-01-02T22:00:00.000Z",
    ]);
  });

});
