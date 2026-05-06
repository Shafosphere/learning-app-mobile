import {
  buildReminderSeriesEntries,
  buildReminderSeriesSchedule,
  computeSmartReminderPlan,
} from "@/src/services/smartReminders";

describe("smart reminders", () => {
  it("builds a softened reminder series at -60, 0 and +60 minutes", () => {
    const now = new Date(2026, 0, 10, 17, 30, 0, 0);

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
      { day: 10, hour: 18, minute: 0 },
      { day: 10, hour: 19, minute: 0 },
      { day: 10, hour: 20, minute: 0 },
    ]);
  });

  it("labels reminder series entries with lead, due and follow-up slots", () => {
    const now = new Date(2026, 0, 10, 17, 30, 0, 0);

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
      { hour: 18, minute: 0, slot: "lead" },
      { hour: 19, minute: 0, slot: "due" },
      { hour: 20, minute: 0, slot: "followUp" },
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
      { day: 11, hour: 18, minute: 0 },
      { day: 11, hour: 19, minute: 0 },
      { day: 11, hour: 20, minute: 0 },
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
      { day: 11, hour: 1, minute: 0 },
      { day: 11, hour: 23, minute: 0 },
      { day: 12, hour: 0, minute: 0 },
      { day: 12, hour: 1, minute: 0 },
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
