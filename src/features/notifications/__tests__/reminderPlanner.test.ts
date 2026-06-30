import {
  REVIEW_DUE_REMINDER_KIND,
  STREAK_WARNING_REMINDER_KIND,
  STUDY_REMINDER_KIND,
  buildReminderPlan,
  getReminderPlanDates,
  selectLearningReminderNotificationBody,
  type ReminderPlanDayState,
} from "@/src/features/notifications";

function buildDays(
  now: Date,
  overrides: Partial<ReminderPlanDayState> = {}
): ReminderPlanDayState[] {
  return getReminderPlanDates(now).map((date) => ({
    date,
    dueReviewCount: 14,
    hasLearningProgress: false,
    hasStreakProgress: false,
    ...overrides,
  }));
}

describe("reminder planner", () => {
  it("creates predictable reminders over the rolling horizon when eligible", () => {
    const now = new Date(2026, 5, 22, 12, 0, 0, 0);
    const plan = buildReminderPlan({
      now,
      language: "en",
      days: buildDays(now),
    });

    expect(
      plan.map((entry) => ({
        kind: entry.kind,
        hour: entry.scheduledAt.getHours(),
        route: entry.route,
        dedupeKey: entry.dedupeKey,
      }))
    ).toEqual([
      {
        kind: REVIEW_DUE_REMINDER_KIND,
        hour: 18,
        route: "/review",
        dedupeKey: "review_due:2026-06-22",
      },
      {
        kind: STUDY_REMINDER_KIND,
        hour: 19,
        route: "/flashcards",
        dedupeKey: "study_reminder:2026-06-22",
      },
      {
        kind: STREAK_WARNING_REMINDER_KIND,
        hour: 22,
        route: "/flashcards",
        dedupeKey: "streak_warning:2026-06-22",
      },
      {
        kind: REVIEW_DUE_REMINDER_KIND,
        hour: 18,
        route: "/review",
        dedupeKey: "review_due:2026-06-23",
      },
      {
        kind: STUDY_REMINDER_KIND,
        hour: 19,
        route: "/flashcards",
        dedupeKey: "study_reminder:2026-06-23",
      },
      {
        kind: STREAK_WARNING_REMINDER_KIND,
        hour: 22,
        route: "/flashcards",
        dedupeKey: "streak_warning:2026-06-23",
      },
      {
        kind: REVIEW_DUE_REMINDER_KIND,
        hour: 18,
        route: "/review",
        dedupeKey: "review_due:2026-06-24",
      },
      {
        kind: STUDY_REMINDER_KIND,
        hour: 19,
        route: "/flashcards",
        dedupeKey: "study_reminder:2026-06-24",
      },
      {
        kind: STREAK_WARNING_REMINDER_KIND,
        hour: 22,
        route: "/flashcards",
        dedupeKey: "streak_warning:2026-06-24",
      },
    ]);
  });

  it("skips past entries and progress-completed reminders for their day", () => {
    const now = new Date(2026, 5, 22, 20, 0, 0, 0);
    const plan = buildReminderPlan({
      now,
      language: "en",
      days: getReminderPlanDates(now).map((date, index) => ({
        date,
        dueReviewCount: 14,
        hasLearningProgress: index === 0,
        hasStreakProgress: false,
      })),
    });

    expect(plan.map((entry) => entry.dedupeKey)).toEqual([
      "streak_warning:2026-06-22",
      "review_due:2026-06-23",
      "study_reminder:2026-06-23",
      "streak_warning:2026-06-23",
      "review_due:2026-06-24",
      "study_reminder:2026-06-24",
      "streak_warning:2026-06-24",
      "review_due:2026-06-25",
      "study_reminder:2026-06-25",
    ]);
  });

  it("skips review reminders below threshold", () => {
    const now = new Date(2026, 5, 22, 12, 0, 0, 0);
    const plan = buildReminderPlan({
      now,
      language: "en",
      days: buildDays(now, { dueReviewCount: 9 }),
    });

    expect(plan.map((entry) => entry.kind)).toEqual([
      STUDY_REMINDER_KIND,
      STREAK_WARNING_REMINDER_KIND,
      STUDY_REMINDER_KIND,
      STREAK_WARNING_REMINDER_KIND,
      STUDY_REMINDER_KIND,
      STREAK_WARNING_REMINDER_KIND,
    ]);
  });

  it("deconflicts overlaps by priority", () => {
    const now = new Date(2026, 5, 22, 12, 0, 0, 0);
    const plan = buildReminderPlan({
      now,
      language: "en",
      days: buildDays(now),
      reviewHour: 22,
      studyHour: 22,
      streakWarningHour: 22,
    });

    expect(plan.map((entry) => entry.dedupeKey)).toEqual([
      "streak_warning:2026-06-22",
      "streak_warning:2026-06-23",
      "streak_warning:2026-06-24",
    ]);
  });

  it("schedules tomorrow when today's reminder time has passed", () => {
    const now = new Date(2026, 5, 22, 23, 30, 0, 0);
    const plan = buildReminderPlan({
      now,
      language: "en",
      days: buildDays(now),
    });

    expect(plan[0]?.dedupeKey).toBe("review_due:2026-06-23");
    expect(plan.some((entry) => entry.dedupeKey.endsWith("2026-06-22"))).toBe(
      false
    );
  });

  it("excludes entries after the 72 hour horizon", () => {
    const now = new Date(2026, 5, 22, 20, 0, 0, 0);
    const plan = buildReminderPlan({
      now,
      language: "en",
      days: buildDays(now),
    });

    expect(plan.map((entry) => entry.dedupeKey)).toContain(
      "study_reminder:2026-06-25"
    );
    expect(plan.map((entry) => entry.dedupeKey)).not.toContain(
      "streak_warning:2026-06-25"
    );
  });

  it("keeps tomorrow reminders after today's completion", () => {
    const now = new Date(2026, 5, 22, 17, 0, 0, 0);
    const plan = buildReminderPlan({
      now,
      language: "en",
      days: getReminderPlanDates(now).map((date, index) => ({
        date,
        dueReviewCount: 14,
        hasLearningProgress: index === 0,
        hasStreakProgress: index === 0,
      })),
    });

    expect(plan.map((entry) => entry.dedupeKey)).toEqual([
      "review_due:2026-06-22",
      "review_due:2026-06-23",
      "study_reminder:2026-06-23",
      "streak_warning:2026-06-23",
      "review_due:2026-06-24",
      "study_reminder:2026-06-24",
      "streak_warning:2026-06-24",
    ]);
  });

  it("uses the resolved study profile for study reminder copy", () => {
    const now = new Date(2026, 5, 22, 8, 0, 0, 0);
    const scheduledAt = new Date(2026, 5, 22, 19, 0, 0, 0);
    const plan = buildReminderPlan({
      now,
      language: "en",
      days: buildDays(now, {
        dueReviewCount: 0,
        hasStreakProgress: true,
      }),
      studyProfile: "evening",
    });

    expect(plan[0]).toEqual(
      expect.objectContaining({
        kind: STUDY_REMINDER_KIND,
        body: selectLearningReminderNotificationBody({
          language: "en",
          profile: "evening",
          slot: "due",
          scheduledAt,
        }),
      })
    );
  });
});
