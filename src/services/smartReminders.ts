import type {
  LearningEventsSummary,
  WeekdayActivityDistribution,
} from "@/src/db/sqlite/repositories/analytics";

export type SmartReminderProfile =
  | "morning"
  | "afternoon"
  | "evening"
  | "night"
  | "unknown";

export type SmartReminderPlan = {
  nextReminderAt: number;
  preferredWeekdays: number[];
  profile: SmartReminderProfile;
  targetMinutes: number;
  usingFallback: boolean;
};

export type SmartReminderInput = {
  hourlyDistribution: number[];
  weekdayDistribution: WeekdayActivityDistribution;
  summary: LearningEventsSummary;
  now?: Date;
};

const MIN_EVENTS_FOR_MODEL = 12;
const MIN_ACTIVE_DAYS_FOR_MODEL = 4;
const DEFAULT_TARGET_MINUTES = 19 * 60;
const REMINDER_LEAD_MINUTES = 15;

function clampHourArray(values: number[]): number[] {
  const next = Array.from({ length: 24 }, (_, idx) => values[idx] ?? 0);
  return next.map((value) => (Number.isFinite(value) && value > 0 ? value : 0));
}

function clampWeekdayArray(values: number[]): number[] {
  const next = Array.from({ length: 7 }, (_, idx) => values[idx] ?? 0);
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

function inferPreferredWeekdays(weekdayDistribution: number[]): number[] {
  const weekdays = clampWeekdayArray(weekdayDistribution);
  const total = weekdays.reduce((acc, value) => acc + value, 0);
  if (total <= 0) {
    return [0, 1, 2, 3, 4, 5, 6];
  }

  const mean = total / 7;
  const minShareThreshold = total * 0.12;
  const scoreThreshold = Math.max(mean * 1.15, minShareThreshold);

  const scoredDays = weekdays
    .map((count, weekday) => ({ weekday, count }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);

  const preferred = scoredDays
    .filter((item) => item.count >= scoreThreshold)
    .slice(0, 3)
    .map((item) => item.weekday);

  if (preferred.length > 0) {
    return preferred.sort((a, b) => a - b);
  }

  return scoredDays
    .slice(0, Math.min(2, scoredDays.length))
    .map((item) => item.weekday)
    .sort((a, b) => a - b);
}

function resolveNextReminderAt(
  now: Date,
  targetMinutes: number,
  preferredWeekdays: number[]
): number {
  const allowed = new Set(preferredWeekdays.length > 0 ? preferredWeekdays : [0, 1, 2, 3, 4, 5, 6]);

  for (let dayOffset = 0; dayOffset <= 7; dayOffset += 1) {
    const candidate = new Date(now.getTime());
    candidate.setSeconds(0, 0);
    candidate.setDate(candidate.getDate() + dayOffset);
    if (!allowed.has(candidate.getDay())) {
      continue;
    }

    const hour = Math.floor(targetMinutes / 60);
    const minute = targetMinutes % 60;
    candidate.setHours(hour, minute, 0, 0);
    if (candidate.getTime() > now.getTime()) {
      return candidate.getTime();
    }
  }

  const fallback = new Date(now.getTime());
  fallback.setDate(fallback.getDate() + 1);
  fallback.setHours(Math.floor(targetMinutes / 60), targetMinutes % 60, 0, 0);
  return fallback.getTime();
}

export function computeSmartReminderPlan(input: SmartReminderInput): SmartReminderPlan {
  const now = input.now ?? new Date();
  const usingFallback =
    input.summary.totalEvents < MIN_EVENTS_FOR_MODEL ||
    input.summary.activeDays < MIN_ACTIVE_DAYS_FOR_MODEL;

  const hourly = clampHourArray(input.hourlyDistribution);
  const weekdays = clampWeekdayArray(input.weekdayDistribution);

  const targetHour = usingFallback
    ? Math.floor(DEFAULT_TARGET_MINUTES / 60)
    : weightedMedianHour(hourly);
  const profile = usingFallback ? "unknown" : inferProfile(targetHour);
  const preferredWeekdays = usingFallback
    ? [0, 1, 2, 3, 4, 5, 6]
    : inferPreferredWeekdays(weekdays);

  const baseMinutes = targetHour * 60;
  const targetMinutes = (baseMinutes - REMINDER_LEAD_MINUTES + 24 * 60) % (24 * 60);
  const nextReminderAt = resolveNextReminderAt(now, targetMinutes, preferredWeekdays);

  return {
    nextReminderAt,
    preferredWeekdays,
    profile,
    targetMinutes,
    usingFallback,
  };
}
