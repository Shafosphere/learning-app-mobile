import {
  getReminderPermissionState,
  replaceManagedReminderSchedule,
} from "@/src/features/notifications/learningReminderNotifications";
import { reconcileReminders } from "@/src/features/notifications/reminderReconciler";
import { selectLearningReminderNotificationBody } from "@/src/features/notifications/learningReminderMessages";
import { countDueReviewsAt } from "@/src/services/dueReviewCount";
import {
  getLearningEventsHourlyDistribution,
  getLearningEventsSummary,
} from "@/src/db/sqlite/repositories/analytics";
import {
  hasDailyStreakProgressOnDate,
  hasLearningProgressOnDate,
} from "@/src/db/sqlite/db";

jest.mock("@/src/i18n", () => ({
  language: "en",
}));

jest.mock("@/src/db/sqlite/db", () => ({
  hasDailyStreakProgressOnDate: jest.fn(),
  hasLearningProgressOnDate: jest.fn(),
}));

jest.mock("@/src/db/sqlite/repositories/analytics", () => ({
  getLearningEventsHourlyDistribution: jest.fn(),
  getLearningEventsSummary: jest.fn(),
}));

jest.mock("@/src/services/dueReviewCount", () => ({
  countDueReviewsAt: jest.fn(),
}));

jest.mock("@/src/features/notifications/learningReminderNotifications", () => ({
  cancelLearningReminderNotification: jest.fn(async () => {}),
  getReminderPermissionState: jest.fn(async () => "granted"),
  replaceManagedReminderSchedule: jest.fn(async () => {}),
}));

const mockedCountDueReviewsAt = jest.mocked(countDueReviewsAt);
const mockedHasLearningProgressOnDate = jest.mocked(hasLearningProgressOnDate);
const mockedHasDailyStreakProgressOnDate = jest.mocked(
  hasDailyStreakProgressOnDate
);
const mockedGetLearningEventsHourlyDistribution = jest.mocked(
  getLearningEventsHourlyDistribution
);
const mockedGetLearningEventsSummary = jest.mocked(getLearningEventsSummary);
const mockedGetReminderPermissionState = jest.mocked(getReminderPermissionState);
const mockedReplaceManagedReminderSchedule = jest.mocked(
  replaceManagedReminderSchedule
);

describe("reminder reconciler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetReminderPermissionState.mockResolvedValue("granted");
    mockedCountDueReviewsAt.mockResolvedValue(14);
    mockedHasLearningProgressOnDate.mockResolvedValue(false);
    mockedHasDailyStreakProgressOnDate.mockResolvedValue(false);
    mockedGetLearningEventsHourlyDistribution.mockResolvedValue(
      Array.from({ length: 24 }, () => 0)
    );
    mockedGetLearningEventsSummary.mockResolvedValue({
      totalEvents: 0,
      activeDays: 0,
    });
  });

  it("counts due reviews at each future review reminder timestamp", async () => {
    const now = new Date(2026, 5, 22, 20, 0, 0, 0);

    await reconcileReminders(
      "app_foreground",
      {
        enabled: true,
        pinnedOfficialCourseIds: [101, 202],
        automaticEnabled: true,
        manualHour: 19,
      },
      now
    );

    expect(mockedCountDueReviewsAt.mock.calls).toEqual([
      [[101, 202], new Date(2026, 5, 22, 18, 0, 0, 0).getTime()],
      [[101, 202], new Date(2026, 5, 23, 18, 0, 0, 0).getTime()],
      [[101, 202], new Date(2026, 5, 24, 18, 0, 0, 0).getTime()],
    ]);
    expect(mockedReplaceManagedReminderSchedule).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ dedupeKey: "review_due:2026-06-23" }),
        expect.objectContaining({ dedupeKey: "study_reminder:2026-06-24" }),
      ])
    );
  });

  it("suppresses completion reminders for today only", async () => {
    const now = new Date(2026, 5, 22, 17, 0, 0, 0);

    const result = await reconcileReminders(
      "learning_completed",
      {
        enabled: true,
        pinnedOfficialCourseIds: [],
        automaticEnabled: true,
        manualHour: 19,
      },
      now
    );

    expect(result.plan.map((entry) => entry.dedupeKey)).toEqual([
      "review_due:2026-06-22",
      "review_due:2026-06-23",
      "study_reminder:2026-06-23",
      "streak_warning:2026-06-23",
    ]);
  });

  it("uses automatic smart reminder plan for study hour and profile", async () => {
    const now = new Date(2026, 5, 22, 8, 0, 0, 0);
    mockedCountDueReviewsAt.mockResolvedValue(0);
    mockedGetLearningEventsHourlyDistribution.mockResolvedValue([
      0, 0, 0, 0, 0, 0, 0, 1, 6, 8, 3, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);
    mockedGetLearningEventsSummary.mockResolvedValue({
      totalEvents: 20,
      activeDays: 5,
    });

    const result = await reconcileReminders(
      "app_foreground",
      {
        enabled: true,
        pinnedOfficialCourseIds: [],
        automaticEnabled: true,
        manualHour: 19,
      },
      now
    );

    expect(mockedGetLearningEventsHourlyDistribution).toHaveBeenCalledWith(
      0,
      now.getTime()
    );
    expect(result.profile).toBe("morning");
    expect(mockedReplaceManagedReminderSchedule).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          dedupeKey: "study_reminder:2026-06-22",
          scheduledAt: new Date(2026, 5, 22, 9, 0, 0, 0),
          body: selectLearningReminderNotificationBody({
            language: "en",
            profile: "morning",
            slot: "due",
            scheduledAt: new Date(2026, 5, 22, 9, 0, 0, 0),
          }),
        }),
      ])
    );
  });

  it("uses manual hour for study hour and profile", async () => {
    const now = new Date(2026, 5, 22, 8, 0, 0, 0);
    mockedCountDueReviewsAt.mockResolvedValue(0);

    const result = await reconcileReminders(
      "app_foreground",
      {
        enabled: true,
        pinnedOfficialCourseIds: [],
        automaticEnabled: false,
        manualHour: 23,
      },
      now
    );

    expect(mockedGetLearningEventsHourlyDistribution).not.toHaveBeenCalled();
    expect(result.profile).toBe("night");
    expect(mockedReplaceManagedReminderSchedule).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          dedupeKey: "study_reminder:2026-06-22",
          scheduledAt: new Date(2026, 5, 22, 23, 0, 0, 0),
          body: selectLearningReminderNotificationBody({
            language: "en",
            profile: "night",
            slot: "due",
            scheduledAt: new Date(2026, 5, 22, 23, 0, 0, 0),
          }),
        }),
      ])
    );
  });
});
