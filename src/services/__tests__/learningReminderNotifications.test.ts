import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  __setLearningReminderAttachmentUrlForTests,
  __setLearningReminderNotificationsModuleForTests,
  LEARNING_REMINDER_CHANNEL_ID,
  cancelLearningReminderNotification,
  cancelLearningReminderNotificationsForDate,
  scheduleLearningReminderNotifications,
  triggerLearningReminderNotificationPreview,
} from "@/src/services/learningReminderNotifications";

const mockScheduleNotificationAsync = jest.fn();
const mockGetAllScheduledNotificationsAsync = jest.fn();
const mockCancelScheduledNotificationAsync = jest.fn();
const mockGetPresentedNotificationsAsync = jest.fn();
const mockDismissNotificationAsync = jest.fn();
const mockNotificationsModule = {
  cancelScheduledNotificationAsync: mockCancelScheduledNotificationAsync,
  dismissNotificationAsync: mockDismissNotificationAsync,
  getAllScheduledNotificationsAsync: mockGetAllScheduledNotificationsAsync,
  getPresentedNotificationsAsync: mockGetPresentedNotificationsAsync,
  getPermissionsAsync: jest.fn(async () => ({ status: "granted" })),
  requestPermissionsAsync: jest.fn(async () => ({ status: "granted" })),
  scheduleNotificationAsync: mockScheduleNotificationAsync,
  SchedulableTriggerInputTypes: {
    DATE: "date",
  },
};

describe("learning reminder notifications", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockGetAllScheduledNotificationsAsync.mockResolvedValue([]);
    mockGetPresentedNotificationsAsync.mockResolvedValue([]);
    mockDismissNotificationAsync.mockResolvedValue(undefined);
    mockScheduleNotificationAsync.mockImplementation(async () => "notification-id");
    __setLearningReminderNotificationsModuleForTests(mockNotificationsModule);
    __setLearningReminderAttachmentUrlForTests(null);
  });

  it("passes a distinct body for each scheduled reminder request", async () => {
    await scheduleLearningReminderNotifications([
      {
        when: new Date("2099-01-01T18:00:00.000Z"),
        content: {
          title: "Czas na fiszki",
          body: "Za chwilkę Twoja pora na fiszki",
        },
      },
      {
        when: new Date("2099-01-01T19:00:00.000Z"),
        content: {
          title: "Czas na fiszki",
          body: "To teraz! Wróć do fiszek na chwilkę",
        },
      },
    ]);

    expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(2);
    expect(
      mockScheduleNotificationAsync.mock.calls.map(([input]) => ({
        title: input.content.title,
        body: input.content.body,
        kind: input.content.data.kind,
        scheduledAt: input.content.data.scheduledAt,
        date: input.trigger.date.toISOString(),
      }))
    ).toEqual([
      {
        title: "Czas na fiszki",
        body: "Za chwilkę Twoja pora na fiszki",
        kind: "learning_reminder",
        scheduledAt: "2099-01-01T18:00:00.000Z",
        date: "2099-01-01T18:00:00.000Z",
      },
      {
        title: "Czas na fiszki",
        body: "To teraz! Wróć do fiszek na chwilkę",
        kind: "learning_reminder",
        scheduledAt: "2099-01-01T19:00:00.000Z",
        date: "2099-01-01T19:00:00.000Z",
      },
    ]);
  });

  it("triggers a learning reminder preview notification", async () => {
    mockNotificationsModule.getPermissionsAsync.mockResolvedValueOnce({
      status: "undetermined",
    });
    mockNotificationsModule.requestPermissionsAsync.mockResolvedValueOnce({
      status: "granted",
    });

    const result = await triggerLearningReminderNotificationPreview(
      {
        title: "Czas na fiszki",
        body: "To teraz! Wróć do fiszek na chwilkę",
      },
      new Date("2099-01-01T18:00:00.000Z")
    );

    expect(mockNotificationsModule.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      permissionState: "granted",
      notificationId: "notification-id",
    });
    expect(mockScheduleNotificationAsync).toHaveBeenCalledWith({
      content: {
        title: "Czas na fiszki",
        body: "To teraz! Wróć do fiszek na chwilkę",
        sound: "default",
        data: {
          kind: "learning_reminder",
          scheduledAt: "2099-01-01T18:00:00.000Z",
        },
      },
      trigger: {
        type: "date",
        date: new Date("2099-01-01T18:00:01.000Z"),
        channelId: LEARNING_REMINDER_CHANNEL_ID,
      },
    });
  });

  it("schedules review reminder notifications with count and route data", async () => {
    await scheduleLearningReminderNotifications([
      {
        kind: "review_reminder",
        when: new Date("2099-01-01T14:00:00.000Z"),
        content: {
          title: "Powtórki czekają",
          body: "Hej, masz 23 fiszki do powtórki. Wchodzisz?",
        },
        data: {
          dueReviewCount: 23,
          route: "/review",
        },
      },
    ]);

    expect(mockScheduleNotificationAsync).toHaveBeenCalledWith({
      content: {
        title: "Powtórki czekają",
        body: "Hej, masz 23 fiszki do powtórki. Wchodzisz?",
        sound: "default",
        data: {
          kind: "review_reminder",
          scheduledAt: "2099-01-01T14:00:00.000Z",
          dueReviewCount: 23,
          route: "/review",
        },
      },
      trigger: {
        type: "date",
        date: new Date("2099-01-01T14:00:00.000Z"),
        channelId: LEARNING_REMINDER_CHANNEL_ID,
      },
    });
  });

  it("adds the learning reminder logo attachment when available", async () => {
    __setLearningReminderAttachmentUrlForTests("file:///notification-logo.png");

    await scheduleLearningReminderNotifications([
      {
        when: new Date("2099-01-01T18:00:00.000Z"),
        content: {
          title: "Czas na fiszki",
          body: "To teraz! Wróć do fiszek na chwilkę",
        },
      },
    ]);

    expect(mockScheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          attachments: [
            {
              identifier: "learning-reminder-logo",
              url: "file:///notification-logo.png",
              type: "image/png",
            },
          ],
        }),
      })
    );
  });

  it("dismisses already presented managed reminder notifications when cancelling all", async () => {
    mockGetAllScheduledNotificationsAsync.mockResolvedValue([
      {
        identifier: "scheduled-reminder-id",
        content: {
          data: {
            kind: "learning_reminder",
            scheduledAt: "2099-01-01T18:00:00.000Z",
          },
        },
      },
      {
        identifier: "scheduled-review-reminder-id",
        content: {
          data: {
            kind: "review_reminder",
            scheduledAt: "2099-01-01T14:00:00.000Z",
          },
        },
      },
    ]);
    mockGetPresentedNotificationsAsync.mockResolvedValue([
      {
        request: {
          identifier: "presented-reminder-id",
          content: {
            data: {
              kind: "learning_reminder",
              scheduledAt: "2099-01-01T18:00:00.000Z",
            },
          },
        },
      },
      {
        request: {
          identifier: "other-notification-id",
          content: {
            data: {
              kind: "other",
            },
          },
        },
      },
    ]);

    await cancelLearningReminderNotification();

    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith(
      "scheduled-reminder-id"
    );
    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith(
      "scheduled-review-reminder-id"
    );
    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledTimes(2);
    expect(mockDismissNotificationAsync).toHaveBeenCalledTimes(1);
    expect(mockDismissNotificationAsync).toHaveBeenCalledWith("presented-reminder-id");
  });

  it("cancels only learning reminders for a date", async () => {
    mockGetAllScheduledNotificationsAsync.mockResolvedValue([
      {
        identifier: "learning-today-id",
        content: {
          data: {
            kind: "learning_reminder",
            scheduledAt: "2099-01-01T18:00:00.000Z",
          },
        },
      },
      {
        identifier: "review-today-id",
        content: {
          data: {
            kind: "review_reminder",
            scheduledAt: "2099-01-01T14:00:00.000Z",
          },
        },
      },
      {
        identifier: "learning-tomorrow-id",
        content: {
          data: {
            kind: "learning_reminder",
            scheduledAt: "2099-01-02T18:00:00.000Z",
          },
        },
      },
    ]);

    const remainingLearningDates = await cancelLearningReminderNotificationsForDate(
      new Date("2099-01-01T12:00:00.000Z")
    );

    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledTimes(1);
    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith(
      "learning-today-id"
    );
    expect(remainingLearningDates.map((date) => date.toISOString())).toEqual([
      "2099-01-02T18:00:00.000Z",
    ]);
  });
});
