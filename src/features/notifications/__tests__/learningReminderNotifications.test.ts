import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  __setLearningReminderAttachmentUrlForTests,
  __setLearningReminderNotificationsModuleForTests,
  LEARNING_REMINDER_CHANNEL_ID,
  REVIEW_DUE_REMINDER_KIND,
  REVIEW_REMINDER_CHANNEL_ID,
  STREAK_WARNING_REMINDER_CHANNEL_ID,
  STREAK_WARNING_REMINDER_KIND,
  STUDY_REMINDER_KIND,
  cancelLearningReminderNotification,
  cancelLearningReminderNotificationsForDate,
  getManagedReminderRegistry,
  replaceManagedReminderSchedule,
  triggerLearningReminderNotificationRequestPreview,
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
  ios?: {
    sound?: string;
    threadId?: string;
    attachments?: unknown[];
  };
};
type MockNotifyKitTrigger = {
  type: number | string;
  timestamp: number;
  alarmManager?: {
    type?: number;
  };
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
  AlarmType: {
    SET_EXACT_AND_ALLOW_WHILE_IDLE: 3,
  },
  AndroidImportance: {
    DEFAULT: 3,
  },
  AndroidNotificationSetting: {
    NOT_SUPPORTED: -1,
    DISABLED: 0,
    ENABLED: 1,
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
    android: {
      alarm: 1,
    },
  })),
  getPowerManagerInfo: jest.fn(async () => ({ activity: null })),
  getTriggerNotifications: mockGetTriggerNotifications,
  requestPermission: jest.fn(async () => ({
    authorizationStatus: AUTHORIZATION_STATUS.AUTHORIZED,
  })),
};

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

  it("creates separate channels and per-kind notification metadata", async () => {
    await replaceManagedReminderSchedule([
      {
        kind: STUDY_REMINDER_KIND,
        scheduledAt: new Date("2099-01-01T19:00:00.000Z"),
        title: "Flashcard time",
        body: "Study now",
        route: "/flashcards",
        dedupeKey: "study_reminder:2099-01-01",
      },
      {
        kind: REVIEW_DUE_REMINDER_KIND,
        scheduledAt: new Date("2099-01-01T18:00:00.000Z"),
        title: "Reviews are waiting",
        body: "You have 23 cards",
        route: "/review",
        dueReviewCount: 23,
        dedupeKey: "review_due:2099-01-01",
      },
      {
        kind: STREAK_WARNING_REMINDER_KIND,
        scheduledAt: new Date("2099-01-01T22:00:00.000Z"),
        title: "Still time today",
        body: "Protect your streak",
        route: "/flashcards",
        dedupeKey: "streak_warning:2099-01-01",
      },
    ]);

    expect(mockCreateChannel).toHaveBeenCalledWith({
      id: LEARNING_REMINDER_CHANNEL_ID,
      name: "Study reminders",
      importance: 3,
      sound: "default",
    });
    expect(mockCreateChannel).toHaveBeenCalledWith({
      id: REVIEW_REMINDER_CHANNEL_ID,
      name: "Review reminders",
      importance: 3,
      sound: "default",
    });
    expect(mockCreateChannel).toHaveBeenCalledWith({
      id: STREAK_WARNING_REMINDER_CHANNEL_ID,
      name: "Streak reminders",
      importance: 3,
      sound: "default",
    });
    expect(mockCreateTriggerNotification).toHaveBeenCalledTimes(3);
    expect(
      mockCreateTriggerNotification.mock.calls.map(([notification, trigger]) => ({
        channelId: notification.android.channelId,
        kind: notification.data.kind,
        route: notification.data.route,
        dueReviewCount: notification.data.dueReviewCount,
        threadId: notification.ios?.threadId,
        alarmType: trigger.alarmManager?.type,
      }))
    ).toEqual([
      {
        channelId: REVIEW_REMINDER_CHANNEL_ID,
        kind: REVIEW_DUE_REMINDER_KIND,
        route: "/review",
        dueReviewCount: 23,
        threadId: REVIEW_DUE_REMINDER_KIND,
        alarmType: 3,
      },
      {
        channelId: LEARNING_REMINDER_CHANNEL_ID,
        kind: STUDY_REMINDER_KIND,
        route: "/flashcards",
        dueReviewCount: undefined,
        threadId: STUDY_REMINDER_KIND,
        alarmType: 3,
      },
      {
        channelId: STREAK_WARNING_REMINDER_CHANNEL_ID,
        kind: STREAK_WARNING_REMINDER_KIND,
        route: "/flashcards",
        dueReviewCount: undefined,
        threadId: STREAK_WARNING_REMINDER_KIND,
        alarmType: 3,
      },
    ]);
  });

  it("replaces old managed triggers and stores registry metadata", async () => {
    mockGetTriggerNotifications.mockResolvedValue([
      {
        notification: {
          id: "old-study-id",
          data: {
            kind: STUDY_REMINDER_KIND,
            scheduledAt: "2099-01-01T19:00:00.000Z",
            dedupeKey: "study_reminder:2099-01-01",
            route: "/flashcards",
          },
        },
        trigger: {},
      },
    ]);

    await replaceManagedReminderSchedule([
      {
        kind: REVIEW_DUE_REMINDER_KIND,
        scheduledAt: new Date("2099-01-01T18:00:00.000Z"),
        title: "Reviews are waiting",
        body: "You have 23 cards",
        route: "/review",
        dueReviewCount: 23,
        dedupeKey: "review_due:2099-01-01",
      },
    ]);

    expect(mockCancelNotification).toHaveBeenCalledWith("old-study-id");
    expect(await getManagedReminderRegistry()).toEqual([
      expect.objectContaining({
        kind: REVIEW_DUE_REMINDER_KIND,
        scheduledAt: "2099-01-01T18:00:00.000Z",
        dedupeKey: "review_due:2099-01-01",
        route: "/review",
        dueReviewCount: 23,
      }),
    ]);
  });

  it("dismisses displayed managed reminders when cancelling all", async () => {
    mockGetDisplayedNotifications.mockResolvedValue([
      {
        id: "presented-reminder-id",
        notification: {
          data: {
            kind: STREAK_WARNING_REMINDER_KIND,
            scheduledAt: "2099-01-01T22:00:00.000Z",
            dedupeKey: "streak_warning:2099-01-01",
            route: "/flashcards",
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

    expect(mockCancelDisplayedNotification).toHaveBeenCalledTimes(1);
    expect(mockCancelDisplayedNotification).toHaveBeenCalledWith(
      "presented-reminder-id"
    );
  });

  it("cancels managed reminders for one local date and keeps remaining schedule", async () => {
    await replaceManagedReminderSchedule([
      {
        kind: STUDY_REMINDER_KIND,
        scheduledAt: new Date("2099-01-01T19:00:00.000Z"),
        title: "Flashcard time",
        body: "Study now",
        route: "/flashcards",
        dedupeKey: "study_reminder:2099-01-01",
      },
      {
        kind: STUDY_REMINDER_KIND,
        scheduledAt: new Date("2099-01-02T19:00:00.000Z"),
        title: "Flashcard time",
        body: "Study tomorrow",
        route: "/flashcards",
        dedupeKey: "study_reminder:2099-01-02",
      },
    ]);
    mockCancelNotification.mockClear();

    const remainingDates = await cancelLearningReminderNotificationsForDate(
      new Date("2099-01-01T12:00:00.000Z")
    );

    expect(mockCancelNotification).toHaveBeenCalledTimes(1);
    expect(mockCancelNotification.mock.calls[0][0]).toContain(
      "study_reminder:2099-01-01"
    );
    expect(await getManagedReminderRegistry()).toEqual([
      expect.objectContaining({
        scheduledAt: "2099-01-02T19:00:00.000Z",
        dedupeKey: "study_reminder:2099-01-02",
      }),
    ]);
    expect(remainingDates.map((date) => date.toISOString())).toEqual([
      "2099-01-02T19:00:00.000Z",
    ]);
  });

  it("triggers a preview using new kind metadata and iOS thread id", async () => {
    const result = await triggerLearningReminderNotificationRequestPreview(
      {
        kind: REVIEW_DUE_REMINDER_KIND,
        content: {
          title: "Reviews are waiting",
          body: "You have 42 cards",
        },
        data: {
          dueReviewCount: 42,
          route: "/review",
        },
      },
      new Date("2099-01-01T18:00:00.000Z")
    );

    expect(result.permissionState).toBe("granted");
    expect(result.notificationId).toContain("memicard-review_due:2099-01-01");
    expect(mockCreateTriggerNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          kind: REVIEW_DUE_REMINDER_KIND,
          scheduledAt: "2099-01-01T18:00:00.000Z",
          dedupeKey: "review_due:2099-01-01",
          dueReviewCount: 42,
          route: "/review",
        },
        android: expect.objectContaining({
          channelId: REVIEW_REMINDER_CHANNEL_ID,
        }),
        ios: expect.objectContaining({
          threadId: REVIEW_DUE_REMINDER_KIND,
        }),
      }),
      expect.objectContaining({
        alarmManager: {
          type: 3,
        },
      })
    );
  });

  it("adds the learning reminder logo attachment when available", async () => {
    __setLearningReminderAttachmentUrlForTests("file:///notification-logo.png");

    await replaceManagedReminderSchedule([
      {
        kind: STUDY_REMINDER_KIND,
        scheduledAt: new Date("2099-01-01T19:00:00.000Z"),
        title: "Flashcard time",
        body: "Study now",
        route: "/flashcards",
        dedupeKey: "study_reminder:2099-01-01",
      },
    ]);

    expect(mockCreateTriggerNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        ios: expect.objectContaining({
          sound: "default",
          threadId: STUDY_REMINDER_KIND,
          attachments: [
            {
              id: "learning-reminder-logo",
              url: "file:///notification-logo.png",
              typeHint: "public.png",
            },
          ],
        }),
      }),
      expect.anything()
    );
  });
});
