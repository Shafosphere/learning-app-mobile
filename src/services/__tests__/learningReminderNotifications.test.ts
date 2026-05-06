import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  __setLearningReminderNotificationsModuleForTests,
  scheduleLearningReminderNotifications,
} from "@/src/services/learningReminderNotifications";

const mockScheduleNotificationAsync = jest.fn();
const mockGetAllScheduledNotificationsAsync = jest.fn();
const mockCancelScheduledNotificationAsync = jest.fn();
const mockNotificationsModule = {
  cancelScheduledNotificationAsync: mockCancelScheduledNotificationAsync,
  getAllScheduledNotificationsAsync: mockGetAllScheduledNotificationsAsync,
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
    mockScheduleNotificationAsync.mockImplementation(async () => "notification-id");
    __setLearningReminderNotificationsModuleForTests(mockNotificationsModule);
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
        scheduledAt: input.content.data.scheduledAt,
        date: input.trigger.date.toISOString(),
      }))
    ).toEqual([
      {
        title: "Czas na fiszki",
        body: "Za chwilkę Twoja pora na fiszki",
        scheduledAt: "2099-01-01T18:00:00.000Z",
        date: "2099-01-01T18:00:00.000Z",
      },
      {
        title: "Czas na fiszki",
        body: "To teraz! Wróć do fiszek na chwilkę",
        scheduledAt: "2099-01-01T19:00:00.000Z",
        date: "2099-01-01T19:00:00.000Z",
      },
    ]);
  });
});
