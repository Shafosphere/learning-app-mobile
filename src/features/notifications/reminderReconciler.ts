import {
  hasDailyStreakProgressOnDate,
  hasLearningProgressOnDate,
} from "@/src/db/sqlite/db";
import {
  getLearningEventsHourlyDistribution,
  getLearningEventsSummary,
} from "@/src/db/sqlite/repositories/analytics";
import i18n from "@/src/i18n";
import { countDueReviewsAt } from "@/src/services/dueReviewCount";
import {
  computeSmartReminderPlan,
  inferSmartReminderProfileForTargetMinutes,
  normalizeManualReminderHour,
  type SmartReminderProfile,
} from "@/src/services/smartReminders";
import {
  REVIEW_DUE_REMINDER_HOUR,
  buildReminderPlan,
  getReminderPlanDates,
} from "./reminderPlanner";
import {
  cancelLearningReminderNotification,
  getReminderPermissionState,
  replaceManagedReminderSchedule,
} from "./learningReminderNotifications";
import type { ReminderPlanEntry, ReminderReconcileReason } from "./reminderTypes";

export type ReminderReconcileSettings = {
  enabled: boolean;
  pinnedOfficialCourseIds: number[];
  automaticEnabled: boolean;
  manualHour: number;
};

export type ReminderReconcileResult = {
  permissionState: Awaited<ReturnType<typeof getReminderPermissionState>>;
  plan: ReminderPlanEntry[];
  nextAt: number | null;
  profile: SmartReminderProfile;
};

function resolveNextAt(plan: ReminderPlanEntry[], nowMs: number): number | null {
  const next = plan.find((entry) => entry.scheduledAt.getTime() > nowMs);
  return next?.scheduledAt.getTime() ?? null;
}

function atLocalHour(date: Date, hour: number): Date {
  const scheduledAt = new Date(date.getTime());
  scheduledAt.setHours(hour, 0, 0, 0);
  return scheduledAt;
}

function isSameLocalDate(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

async function resolveStudyReminderPlan(settings: ReminderReconcileSettings, now: Date) {
  if (!settings.automaticEnabled) {
    const manualHour = normalizeManualReminderHour(settings.manualHour);
    return {
      studyHour: manualHour,
      profile: inferSmartReminderProfileForTargetMinutes(manualHour * 60),
    };
  }

  const [hourlyDistribution, summary] = await Promise.all([
    getLearningEventsHourlyDistribution(0, now.getTime()),
    getLearningEventsSummary(0, now.getTime()),
  ]);
  const smartPlan = computeSmartReminderPlan({
    hourlyDistribution,
    summary,
  });
  return {
    studyHour: normalizeManualReminderHour(Math.floor(smartPlan.targetMinutes / 60)),
    profile: smartPlan.profile,
  };
}

export async function reconcileReminders(
  reason: ReminderReconcileReason,
  settings: ReminderReconcileSettings,
  now: Date = new Date()
): Promise<ReminderReconcileResult> {
  if (!settings.enabled) {
    await cancelLearningReminderNotification();
    return {
      permissionState: "undetermined",
      plan: [],
      nextAt: null,
      profile: "unknown",
    };
  }

  const permissionState = await getReminderPermissionState();
  if (permissionState !== "granted") {
    await cancelLearningReminderNotification();
    return {
      permissionState,
      plan: [],
      nextAt: null,
      profile: "unknown",
    };
  }

  const studyReminderPlan = await resolveStudyReminderPlan(settings, now);
  const completedToday =
    reason === "learning_completed" || reason === "review_completed";
  const reminderDates = getReminderPlanDates(now);
  const days = await Promise.all(
    reminderDates.map(async (date) => {
      const reviewScheduledAt = atLocalHour(date, REVIEW_DUE_REMINDER_HOUR);
      const [dueReviewCount, hasLearningProgress, hasStreakProgress] =
        await Promise.all([
          countDueReviewsAt(
            settings.pinnedOfficialCourseIds,
            reviewScheduledAt.getTime()
          ),
          hasLearningProgressOnDate(date),
          hasDailyStreakProgressOnDate(date),
        ]);
      const suppressCompletedToday = completedToday && isSameLocalDate(date, now);
      return {
        date,
        dueReviewCount,
        hasLearningProgress: suppressCompletedToday ? true : hasLearningProgress,
        hasStreakProgress: suppressCompletedToday ? true : hasStreakProgress,
      };
    })
  );

  const plan = buildReminderPlan({
    now,
    language: i18n.language,
    days,
    studyHour: studyReminderPlan.studyHour,
    studyProfile: studyReminderPlan.profile,
  });

  await replaceManagedReminderSchedule(plan);

  return {
    permissionState,
    plan,
    nextAt: resolveNextAt(plan, now.getTime()),
    profile: studyReminderPlan.profile,
  };
}
