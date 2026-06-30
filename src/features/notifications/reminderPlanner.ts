import type { SmartReminderProfile } from "@/src/services/smartReminders";
import {
  getEndOfDayReminderNotificationTitle,
  getLearningReminderNotificationTitle,
  getReviewReminderNotificationTitle,
  selectEndOfDayReminderNotificationBody,
  selectLearningReminderNotificationBody,
  selectReviewReminderNotificationBody,
} from "./learningReminderMessages";
import {
  REVIEW_DUE_REMINDER_KIND,
  STREAK_WARNING_REMINDER_KIND,
  STUDY_REMINDER_KIND,
  type ReminderKind,
  type ReminderPlanEntry,
} from "./reminderTypes";

export const REVIEW_DUE_REMINDER_HOUR = 18;
export const STUDY_REMINDER_HOUR = 19;
export const STREAK_WARNING_REMINDER_HOUR = 22;
export const REVIEW_DUE_REMINDER_THRESHOLD = 10;
export const REMINDER_PLAN_HORIZON_MS = 72 * 60 * 60 * 1000;
const DECONFLICT_WINDOW_MS = 60 * 60 * 1000;

type ReminderCandidate = Omit<ReminderPlanEntry, "dedupeKey"> & {
  dayKey: string;
};

export type ReminderPlanDayState = {
  date: Date;
  dueReviewCount: number;
  hasLearningProgress: boolean;
  hasStreakProgress: boolean;
};

export type BuildReminderPlanInput = {
  now: Date;
  language: string | null | undefined;
  days: ReminderPlanDayState[];
  reviewThreshold?: number;
  reviewHour?: number;
  studyHour?: number;
  studyProfile?: SmartReminderProfile;
  streakWarningHour?: number;
};

function toLocalDateKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function atLocalHour(now: Date, hour: number): Date {
  const date = new Date(now.getTime());
  date.setHours(hour, 0, 0, 0);
  return date;
}

function startOfLocalDay(value: Date): Date {
  const date = new Date(value.getTime());
  date.setHours(0, 0, 0, 0);
  return date;
}

export function getReminderPlanDates(now: Date): Date[] {
  const horizonEnd = new Date(now.getTime() + REMINDER_PLAN_HORIZON_MS);
  const cursor = startOfLocalDay(now);
  const lastDay = startOfLocalDay(horizonEnd);
  const dates: Date[] = [];

  while (cursor.getTime() <= lastDay.getTime()) {
    dates.push(new Date(cursor.getTime()));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

function priority(kind: ReminderKind): number {
  if (kind === STREAK_WARNING_REMINDER_KIND) {
    return 3;
  }
  if (kind === REVIEW_DUE_REMINDER_KIND) {
    return 2;
  }
  return 1;
}

function deconflict(entries: ReminderPlanEntry[]): ReminderPlanEntry[] {
  const selected: ReminderPlanEntry[] = [];
  const byPriority = [...entries].sort((left, right) => {
    const priorityDelta = priority(right.kind) - priority(left.kind);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }
    return left.scheduledAt.getTime() - right.scheduledAt.getTime();
  });

  for (const entry of byPriority) {
    const overlaps = selected.some(
      (existing) =>
        Math.abs(existing.scheduledAt.getTime() - entry.scheduledAt.getTime()) <
        DECONFLICT_WINDOW_MS
    );
    if (!overlaps) {
      selected.push(entry);
    }
  }

  return selected.sort(
    (left, right) => left.scheduledAt.getTime() - right.scheduledAt.getTime()
  );
}

export function buildReminderPlan(input: BuildReminderPlanInput): ReminderPlanEntry[] {
  const reviewThreshold = input.reviewThreshold ?? REVIEW_DUE_REMINDER_THRESHOLD;
  const reviewHour = input.reviewHour ?? REVIEW_DUE_REMINDER_HOUR;
  const studyHour = input.studyHour ?? STUDY_REMINDER_HOUR;
  const studyProfile = input.studyProfile ?? "unknown";
  const streakWarningHour = input.streakWarningHour ?? STREAK_WARNING_REMINDER_HOUR;
  const horizonEndMs = input.now.getTime() + REMINDER_PLAN_HORIZON_MS;
  const candidates: ReminderCandidate[] = [];

  for (const day of input.days) {
    const dayKey = toLocalDateKey(day.date);

    if (day.dueReviewCount >= reviewThreshold) {
      candidates.push({
        kind: REVIEW_DUE_REMINDER_KIND,
        scheduledAt: atLocalHour(day.date, reviewHour),
        title: getReviewReminderNotificationTitle(input.language),
        body: selectReviewReminderNotificationBody({
          language: input.language,
          dueReviewCount: day.dueReviewCount,
        }),
        route: "/review",
        dueReviewCount: day.dueReviewCount,
        dayKey,
      });
    }

    if (!day.hasLearningProgress) {
      const scheduledAt = atLocalHour(day.date, studyHour);
      candidates.push({
        kind: STUDY_REMINDER_KIND,
        scheduledAt,
        title: getLearningReminderNotificationTitle(input.language),
        body: selectLearningReminderNotificationBody({
          language: input.language,
          profile: studyProfile,
          slot: "due",
          scheduledAt,
        }),
        route: "/flashcards",
        dayKey,
      });
    }

    if (!day.hasStreakProgress) {
      const scheduledAt = atLocalHour(day.date, streakWarningHour);
      candidates.push({
        kind: STREAK_WARNING_REMINDER_KIND,
        scheduledAt,
        title: getEndOfDayReminderNotificationTitle(input.language),
        body: selectEndOfDayReminderNotificationBody({
          language: input.language,
          scheduledAt,
        }),
        route: "/flashcards",
        dayKey,
      });
    }
  }

  const futureEntries = candidates
    .filter((candidate) => {
      const scheduledAtMs = candidate.scheduledAt.getTime();
      return scheduledAtMs > input.now.getTime() && scheduledAtMs <= horizonEndMs;
    })
    .map((candidate) => {
      const { dayKey, ...entry } = candidate;
      return {
        ...entry,
        dedupeKey: `${candidate.kind}:${dayKey}`,
      };
    });

  return deconflict(futureEntries);
}
