import type { LearningEventsSummary } from "@/src/db/sqlite/repositories/analytics";

export type SmartReminderProfile =
  | "morning"
  | "afternoon"
  | "evening"
  | "night"
  | "unknown";

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
export const REMINDER_SERIES_START_LEAD_MINUTES = 60;
export const REMINDER_SERIES_TOTAL_DURATION_MINUTES = 120;

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
  const now = input.now ?? new Date();
  const horizonDays = Math.max(1, input.horizonDays ?? 7);
  const skipDateKeys = new Set(input.skipDateKeys ?? []);
  const anchorHour = Math.floor(input.targetMinutes / 60);
  const anchorMinute = input.targetMinutes % 60;
  const offsets = [
    -REMINDER_SERIES_START_LEAD_MINUTES,
    0,
    REMINDER_SERIES_TOTAL_DURATION_MINUTES - REMINDER_SERIES_START_LEAD_MINUTES,
  ];

  const scheduled = new Set<number>();
  for (let dayOffset = 0; dayOffset < horizonDays; dayOffset += 1) {
    const anchor = new Date(now.getTime());
    anchor.setSeconds(0, 0);
    anchor.setDate(anchor.getDate() + dayOffset);
    anchor.setHours(anchorHour, anchorMinute, 0, 0);

    for (const offsetMinutes of offsets) {
      const candidate = new Date(anchor.getTime());
      candidate.setMinutes(candidate.getMinutes() + offsetMinutes);
      if (
        candidate.getTime() > now.getTime() &&
        !skipDateKeys.has(makeDateKey(candidate))
      ) {
        scheduled.add(candidate.getTime());
      }
    }
  }

  return Array.from(scheduled).sort((a, b) => a - b);
}
