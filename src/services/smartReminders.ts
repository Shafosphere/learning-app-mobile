import type { LearningEventsSummary } from "@/src/db/sqlite/repositories/analytics";

export type SmartReminderProfile =
  | "morning"
  | "afternoon"
  | "evening"
  | "night"
  | "unknown";

export type ReminderSeriesSlot = "lead" | "due" | "followUp";

export type ReminderSeriesEntry = {
  scheduledAt: number;
  slot: ReminderSeriesSlot;
};

export type ReviewReminderCandidate = {
  scheduledAt: number;
};

export type ReviewReminderEntry = ReviewReminderCandidate & {
  dueReviewCount: number;
};

export type EndOfDayReminderEntry = {
  scheduledAt: number;
};

export type SmartReminderPlan = {
  profile: SmartReminderProfile;
  targetMinutes: number;
  usingFallback: boolean;
};

export type SmartReminderInput = {
  hourlyDistribution: number[];
  summary: LearningEventsSummary;
};

const MIN_EVENTS_FOR_MODEL = 12;
const MIN_ACTIVE_DAYS_FOR_MODEL = 4;
const DEFAULT_TARGET_MINUTES = 19 * 60;
export const REMINDER_SERIES_FIRST_LEAD_MINUTES = 240;
export const REMINDER_SERIES_SECOND_LEAD_MINUTES = 120;
export const REVIEW_REMINDER_LEAD_MINUTES = 300;
export const REVIEW_REMINDER_THRESHOLD = 10;
export const END_OF_DAY_REMINDER_HOUR = 23;

function clampHourArray(values: number[]): number[] {
  const next = Array.from({ length: 24 }, (_, idx) => values[idx] ?? 0);
  return next.map((value) => (Number.isFinite(value) && value > 0 ? value : 0));
}

function weightedMedianHour(hourlyDistribution: number[]): number {
  const hourly = clampHourArray(hourlyDistribution);
  const total = hourly.reduce((acc, value) => acc + value, 0);
  if (total <= 0) {
    return Math.floor(DEFAULT_TARGET_MINUTES / 60);
  }

  const threshold = total / 2;
  let running = 0;
  for (let hour = 0; hour < hourly.length; hour += 1) {
    running += hourly[hour];
    if (running >= threshold) {
      return hour;
    }
  }

  return Math.floor(DEFAULT_TARGET_MINUTES / 60);
}

function inferProfile(targetHour: number): SmartReminderProfile {
  if (targetHour >= 5 && targetHour <= 10) {
    return "morning";
  }
  if (targetHour >= 11 && targetHour <= 16) {
    return "afternoon";
  }
  if (targetHour >= 17 && targetHour <= 22) {
    return "evening";
  }
  if (targetHour >= 23 || targetHour <= 4) {
    return "night";
  }
  return "unknown";
}

export function computeSmartReminderPlan(input: SmartReminderInput): SmartReminderPlan {
  const usingFallback =
    input.summary.totalEvents < MIN_EVENTS_FOR_MODEL ||
    input.summary.activeDays < MIN_ACTIVE_DAYS_FOR_MODEL;

  const hourly = clampHourArray(input.hourlyDistribution);

  const targetHour = usingFallback
    ? Math.floor(DEFAULT_TARGET_MINUTES / 60)
    : weightedMedianHour(hourly);
  const profile = usingFallback ? "unknown" : inferProfile(targetHour);
  const targetMinutes = targetHour * 60;

  return {
    profile,
    targetMinutes,
    usingFallback,
  };
}

function makeDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function buildReminderSeriesSchedule(input: {
  targetMinutes: number;
  now?: Date;
  horizonDays?: number;
  skipDateKeys?: string[];
}): number[] {
  return buildReminderSeriesEntries(input).map((entry) => entry.scheduledAt);
}

export function buildReminderSeriesEntries(input: {
  targetMinutes: number;
  now?: Date;
  horizonDays?: number;
  skipDateKeys?: string[];
}): ReminderSeriesEntry[] {
  const now = input.now ?? new Date();
  const horizonDays = Math.max(1, input.horizonDays ?? 7);
  const skipDateKeys = new Set(input.skipDateKeys ?? []);
  const anchorHour = Math.floor(input.targetMinutes / 60);
  const anchorMinute = input.targetMinutes % 60;
  const offsets: { minutes: number; slot: ReminderSeriesSlot }[] = [
    { minutes: -REMINDER_SERIES_FIRST_LEAD_MINUTES, slot: "lead" },
    { minutes: -REMINDER_SERIES_SECOND_LEAD_MINUTES, slot: "lead" },
    { minutes: 0, slot: "due" },
  ];

  const scheduled = new Map<number, ReminderSeriesSlot>();
  for (let dayOffset = 0; dayOffset < horizonDays; dayOffset += 1) {
    const anchor = new Date(now.getTime());
    anchor.setSeconds(0, 0);
    anchor.setDate(anchor.getDate() + dayOffset);
    anchor.setHours(anchorHour, anchorMinute, 0, 0);

    for (const { minutes, slot } of offsets) {
      const candidate = new Date(anchor.getTime());
      candidate.setMinutes(candidate.getMinutes() + minutes);
      if (
        candidate.getTime() > now.getTime() &&
        !skipDateKeys.has(makeDateKey(candidate))
      ) {
        scheduled.set(candidate.getTime(), slot);
      }
    }
  }

  return Array.from(scheduled, ([scheduledAt, slot]) => ({ scheduledAt, slot })).sort(
    (a, b) => a.scheduledAt - b.scheduledAt
  );
}

export function buildDueReminderSeriesEntries(input: {
  targetMinutes: number;
  now?: Date;
  horizonDays?: number;
  skipDateKeys?: string[];
}): ReminderSeriesEntry[] {
  const now = input.now ?? new Date();
  const horizonDays = Math.max(1, input.horizonDays ?? 7);
  const skipDateKeys = new Set(input.skipDateKeys ?? []);
  const anchorHour = Math.floor(input.targetMinutes / 60);
  const anchorMinute = input.targetMinutes % 60;
  const scheduled = new Set<number>();

  for (let dayOffset = 0; dayOffset < horizonDays; dayOffset += 1) {
    const candidate = new Date(now.getTime());
    candidate.setSeconds(0, 0);
    candidate.setDate(candidate.getDate() + dayOffset);
    candidate.setHours(anchorHour, anchorMinute, 0, 0);

    if (
      candidate.getTime() > now.getTime() &&
      !skipDateKeys.has(makeDateKey(candidate))
    ) {
      scheduled.add(candidate.getTime());
    }
  }

  return Array.from(scheduled, (scheduledAt) => ({
    scheduledAt,
    slot: "due" as const,
  })).sort((a, b) => a.scheduledAt - b.scheduledAt);
}

export function buildEndOfDayReminderEntries(input: {
  now?: Date;
  horizonDays?: number;
  skipDateKeys?: string[];
  skipScheduledAt?: number[];
}): EndOfDayReminderEntry[] {
  const now = input.now ?? new Date();
  const horizonDays = Math.max(1, input.horizonDays ?? 7);
  const skipDateKeys = new Set(input.skipDateKeys ?? []);
  const skipScheduledAt = new Set(input.skipScheduledAt ?? []);
  const scheduled = new Set<number>();

  for (let dayOffset = 0; dayOffset < horizonDays; dayOffset += 1) {
    const candidate = new Date(now.getTime());
    candidate.setSeconds(0, 0);
    candidate.setDate(candidate.getDate() + dayOffset);
    candidate.setHours(END_OF_DAY_REMINDER_HOUR, 0, 0, 0);

    if (
      candidate.getTime() > now.getTime() &&
      !skipDateKeys.has(makeDateKey(candidate)) &&
      !skipScheduledAt.has(candidate.getTime())
    ) {
      scheduled.add(candidate.getTime());
    }
  }

  return Array.from(scheduled, (scheduledAt) => ({ scheduledAt })).sort(
    (a, b) => a.scheduledAt - b.scheduledAt
  );
}

export function buildReviewReminderCandidates(input: {
  targetMinutes: number;
  now?: Date;
  horizonDays?: number;
}): ReviewReminderCandidate[] {
  const now = input.now ?? new Date();
  const horizonDays = Math.max(1, input.horizonDays ?? 7);
  const anchorHour = Math.floor(input.targetMinutes / 60);
  const anchorMinute = input.targetMinutes % 60;
  const scheduled = new Set<number>();

  for (let dayOffset = 0; dayOffset < horizonDays; dayOffset += 1) {
    const anchor = new Date(now.getTime());
    anchor.setSeconds(0, 0);
    anchor.setDate(anchor.getDate() + dayOffset);
    anchor.setHours(anchorHour, anchorMinute, 0, 0);

    const candidate = new Date(anchor.getTime());
    candidate.setMinutes(candidate.getMinutes() - REVIEW_REMINDER_LEAD_MINUTES);
    if (candidate.getTime() > now.getTime()) {
      scheduled.add(candidate.getTime());
    }
  }

  return Array.from(scheduled, (scheduledAt) => ({ scheduledAt })).sort(
    (a, b) => a.scheduledAt - b.scheduledAt
  );
}

export async function buildReviewReminderEntries(input: {
  targetMinutes: number;
  now?: Date;
  horizonDays?: number;
  threshold?: number;
  countDueReviewsAt: (scheduledAt: number) => number | Promise<number>;
}): Promise<ReviewReminderEntry[]> {
  const threshold = input.threshold ?? REVIEW_REMINDER_THRESHOLD;
  const candidates = buildReviewReminderCandidates(input);
  const entries = await Promise.all(
    candidates.map(async (candidate) => {
      const dueReviewCount = await input.countDueReviewsAt(candidate.scheduledAt);
      if (dueReviewCount < threshold) {
        return null;
      }
      return {
        scheduledAt: candidate.scheduledAt,
        dueReviewCount,
      };
    })
  );

  return entries.filter((entry): entry is ReviewReminderEntry => entry != null);
}
