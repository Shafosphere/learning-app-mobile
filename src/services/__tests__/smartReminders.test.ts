import {
  buildReminderSeriesEntries,
  buildReminderSeriesSchedule,
  buildReviewReminderCandidates,
  buildReviewReminderEntries,
  computeSmartReminderPlan,
} from "@/src/services/smartReminders";

describe("smart reminders", () => {
  it("builds a softened reminder series at -240, -120 and 0 minutes", () => {
    const now = new Date(2026, 0, 10, 14, 30, 0, 0);

    const scheduled = buildReminderSeriesSchedule({
      targetMinutes: 19 * 60,
      now,
      horizonDays: 1,
    }).map((value) => new Date(value));

    expect(scheduled).toHaveLength(3);
    expect(
      scheduled.map((date) => ({
        day: date.getDate(),
        hour: date.getHours(),
        minute: date.getMinutes(),
      }))
    ).toEqual([
      { day: 10, hour: 15, minute: 0 },
      { day: 10, hour: 17, minute: 0 },
      { day: 10, hour: 19, minute: 0 },
    ]);
  });

  it("labels reminder series entries with lead, lead and due slots", () => {
    const now = new Date(2026, 0, 10, 14, 30, 0, 0);

    const entries = buildReminderSeriesEntries({
      targetMinutes: 19 * 60,
      now,
      horizonDays: 1,
    });

    expect(
      entries.map((entry) => ({
        hour: new Date(entry.scheduledAt).getHours(),
        minute: new Date(entry.scheduledAt).getMinutes(),
        slot: entry.slot,
      }))
    ).toEqual([
      { hour: 15, minute: 0, slot: "lead" },
      { hour: 17, minute: 0, slot: "lead" },
      { hour: 19, minute: 0, slot: "due" },
    ]);
  });

  it("skips today's series when today's date key is excluded", () => {
    const now = new Date(2026, 0, 10, 17, 30, 0, 0);

    const scheduled = buildReminderSeriesSchedule({
      targetMinutes: 19 * 60,
      now,
      horizonDays: 2,
      skipDateKeys: ["2026-01-10"],
    }).map((value) => new Date(value));

    expect(
      scheduled.map((date) => ({
        day: date.getDate(),
        hour: date.getHours(),
        minute: date.getMinutes(),
      }))
    ).toEqual([
      { day: 11, hour: 15, minute: 0 },
      { day: 11, hour: 17, minute: 0 },
      { day: 11, hour: 19, minute: 0 },
    ]);
  });

  it("skips previous-day offset reminders when a night plan crosses midnight", () => {
    const now = new Date(2026, 0, 10, 22, 30, 0, 0);

    const scheduled = buildReminderSeriesSchedule({
      targetMinutes: 0,
      now,
      horizonDays: 3,
      skipDateKeys: ["2026-01-10"],
    }).map((value) => new Date(value));

    expect(
      scheduled.map((date) => ({
        day: date.getDate(),
        hour: date.getHours(),
        minute: date.getMinutes(),
      }))
    ).toEqual([
      { day: 11, hour: 0, minute: 0 },
      { day: 11, hour: 20, minute: 0 },
      { day: 11, hour: 22, minute: 0 },
      { day: 12, hour: 0, minute: 0 },
    ]);
  });

  it("builds review reminder candidates at T - 300 minutes", () => {
    const now = new Date(2026, 0, 10, 13, 30, 0, 0);

    const scheduled = buildReviewReminderCandidates({
      targetMinutes: 19 * 60,
      now,
      horizonDays: 1,
    }).map((value) => new Date(value.scheduledAt));

    expect(
      scheduled.map((date) => ({
        day: date.getDate(),
        hour: date.getHours(),
        minute: date.getMinutes(),
      }))
    ).toEqual([{ day: 10, hour: 14, minute: 0 }]);
  });

  it("counts reviews for each future review reminder candidate", async () => {
    const now = new Date(2026, 0, 10, 16, 0, 0, 0);
    const countedAt: number[] = [];

    const entries = await buildReviewReminderEntries({
      targetMinutes: 19 * 60,
      now,
      horizonDays: 2,
      countDueReviewsAt: async (scheduledAt) => {
        countedAt.push(scheduledAt);
        return new Date(scheduledAt).getDate() === 11 ? 40 : 3;
      },
    });

    expect(
      countedAt.map((value) => ({
        day: new Date(value).getDate(),
        hour: new Date(value).getHours(),
      }))
    ).toEqual([{ day: 11, hour: 14 }]);
    expect(
      entries.map((entry) => ({
        day: new Date(entry.scheduledAt).getDate(),
        hour: new Date(entry.scheduledAt).getHours(),
        dueReviewCount: entry.dueReviewCount,
      }))
    ).toEqual([{ day: 11, hour: 14, dueReviewCount: 40 }]);
  });

  it("keeps review reminders with at least 10 due cards only", async () => {
    const now = new Date(2026, 0, 10, 13, 30, 0, 0);

    const belowThreshold = await buildReviewReminderEntries({
      targetMinutes: 19 * 60,
      now,
      horizonDays: 1,
      countDueReviewsAt: () => 9,
    });
    const atThreshold = await buildReviewReminderEntries({
      targetMinutes: 19 * 60,
      now,
      horizonDays: 1,
      countDueReviewsAt: () => 10,
    });

    expect(belowThreshold).toEqual([]);
    expect(atThreshold).toHaveLength(1);
  });

  it("supports night review reminder candidates crossing into the previous day", () => {
    const now = new Date(2026, 0, 10, 22, 30, 0, 0);

    const scheduled = buildReviewReminderCandidates({
      targetMinutes: 4 * 60,
      now,
      horizonDays: 3,
    }).map((value) => new Date(value.scheduledAt));

    expect(
      scheduled.map((date) => ({
        day: date.getDate(),
        hour: date.getHours(),
        minute: date.getMinutes(),
      }))
    ).toEqual([
      { day: 10, hour: 23, minute: 0 },
      { day: 11, hour: 23, minute: 0 },
    ]);
  });

  it("keeps learning target hour based on hourly activity", () => {
    const plan = computeSmartReminderPlan({
      hourlyDistribution: [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 5, 8, 3, 0, 0, 0,
      ],
      summary: {
        totalEvents: 20,
        activeDays: 6,
      },
    });

    expect(plan.targetMinutes).toBe(19 * 60);
    expect(plan.profile).toBe("evening");
    expect(plan.usingFallback).toBe(false);
  });
});
