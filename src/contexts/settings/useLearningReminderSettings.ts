import { useCallback, useEffect, useRef } from "react";

import {
  hasDailyStreakProgressOnDate,
  getLearningEventsHourlyDistribution,
  getLearningEventsSummary,
} from "@/src/db/sqlite/db";
import {
  END_OF_DAY_REMINDER_KIND,
  REVIEW_REMINDER_KIND,
  type LearningReminderNotificationRequest,
  type ReminderPermissionState,
  cancelLearningReminderNotification,
  cancelLearningReminderNotificationsForDate,
  getEndOfDayReminderNotificationTitle,
  getLearningReminderNotificationTitle,
  getReminderPermissionState,
  getReviewReminderNotificationTitle,
  requestReminderPermissions,
  scheduleLearningReminderNotifications,
  selectEndOfDayReminderNotificationBody,
  selectLearningReminderNotificationBody,
  selectReviewReminderNotificationBody,
} from "@/src/features/notifications";
import { usePersistedState } from "@/src/hooks/usePersistedState";
import i18n from "@/src/i18n";
import { countDueReviewsAt } from "@/src/services/dueReviewCount";
import {
  buildDueReminderSeriesEntries,
  buildEndOfDayReminderEntries,
  buildReviewReminderEntries,
  computeSmartReminderPlan,
  inferSmartReminderProfileForTargetMinutes,
  normalizeManualReminderHour,
  type SmartReminderProfile,
} from "@/src/services/smartReminders";

import { defaultValue } from "./defaults";

const REMINDER_ANALYTICS_WINDOW_MS = 28 * 24 * 60 * 60 * 1000;

function resolveNextScheduledReminderAt(
  dates: Date[],
  nowMs: number = Date.now()
): number | null {
  const next = dates.find((date) => date.getTime() > nowMs);
  return next?.getTime() ?? null;
}

export function useLearningReminderSettings({
  pinnedOfficialCourseIds,
}: {
  pinnedOfficialCourseIds: number[];
}) {
  const [learningRemindersEnabledState, _setLearningRemindersEnabled] =
    usePersistedState<boolean>("learningRemindersEnabled", false);
  const [
    learningReminderAutomaticEnabledState,
    _setLearningReminderAutomaticEnabled,
  ] = usePersistedState<boolean>("learningReminder.automaticEnabled", true);
  const [learningReminderManualHourState, _setLearningReminderManualHour] =
    usePersistedState<number>(
      "learningReminder.manualHour",
      defaultValue.learningReminderManualHour
    );
  const [learningReminderNextAtState, setLearningReminderNextAtState] =
    usePersistedState<number | null>("learningReminder.nextAt", null);
  const [learningReminderProfileState, setLearningReminderProfileState] =
    usePersistedState<SmartReminderProfile>("learningReminder.profile", "unknown");
  const [learningReminderPermissionState, setLearningReminderPermissionState] =
    usePersistedState<ReminderPermissionState>(
      "learningReminder.permissionState",
      "undetermined"
    );
  const learningRemindersEnabledRef = useRef(learningRemindersEnabledState);
  const learningReminderAutomaticEnabledRef = useRef(
    learningReminderAutomaticEnabledState
  );
  const learningReminderManualHourRef = useRef(
    normalizeManualReminderHour(learningReminderManualHourState)
  );

  useEffect(() => {
    learningRemindersEnabledRef.current = learningRemindersEnabledState;
  }, [learningRemindersEnabledState]);

  useEffect(() => {
    learningReminderAutomaticEnabledRef.current =
      learningReminderAutomaticEnabledState;
  }, [learningReminderAutomaticEnabledState]);

  useEffect(() => {
    learningReminderManualHourRef.current = normalizeManualReminderHour(
      learningReminderManualHourState
    );
  }, [learningReminderManualHourState]);

  const computeAndScheduleLearningReminder = useCallback(async () => {
    const permissionState = await getReminderPermissionState();
    await setLearningReminderPermissionState(permissionState);
    if (permissionState !== "granted") {
      await cancelLearningReminderNotification();
      await setLearningReminderNextAtState(null);
      return;
    }

    const now = Date.now();
    const fromMs = now - REMINDER_ANALYTICS_WINDOW_MS;
    const [hourlyDistribution, summary] = await Promise.all([
      getLearningEventsHourlyDistribution(fromMs, now),
      getLearningEventsSummary(fromMs, now),
    ]);

    const plan = computeSmartReminderPlan({
      hourlyDistribution,
      summary,
    });
    const learningTargetMinutes = learningReminderAutomaticEnabledRef.current
      ? plan.targetMinutes
      : learningReminderManualHourRef.current * 60;
    const learningReminderProfile = learningReminderAutomaticEnabledRef.current
      ? plan.profile
      : inferSmartReminderProfileForTargetMinutes(learningTargetMinutes);

    const nowDate = new Date();
    const todayKey = `${nowDate.getFullYear()}-${String(
      nowDate.getMonth() + 1
    ).padStart(2, "0")}-${String(nowDate.getDate()).padStart(2, "0")}`;
    const hasDailyStreakProgress = await hasDailyStreakProgressOnDate(nowDate);
    const skipDateKeys = hasDailyStreakProgress ? [todayKey] : [];
    const reminderEntries = buildDueReminderSeriesEntries({
      now: nowDate,
      targetMinutes: learningTargetMinutes,
      horizonDays: 7,
      skipDateKeys,
    });
    const notificationTitle = getLearningReminderNotificationTitle(i18n.language);
    const learningRequests: LearningReminderNotificationRequest[] =
      reminderEntries.map((entry) => {
        const scheduledAt = new Date(entry.scheduledAt);
        return {
          when: scheduledAt,
          kind: "learning_reminder",
          content: {
            title: notificationTitle,
            body: selectLearningReminderNotificationBody({
              language: i18n.language,
              profile: learningReminderProfile,
              slot: entry.slot,
              scheduledAt,
            }),
          },
        };
      });
    const reviewNotificationTitle = getReviewReminderNotificationTitle(i18n.language);
    const reviewEntries = await buildReviewReminderEntries({
      now: nowDate,
      targetMinutes: plan.targetMinutes,
      horizonDays: 7,
      countDueReviewsAt: (scheduledAt) =>
        countDueReviewsAt(pinnedOfficialCourseIds, scheduledAt),
    });
    const reviewRequests: LearningReminderNotificationRequest[] = reviewEntries.map(
      (entry) => {
        const scheduledAt = new Date(entry.scheduledAt);
        const dueReviewCount = entry.dueReviewCount;
        return {
          when: scheduledAt,
          kind: REVIEW_REMINDER_KIND,
          content: {
            title: reviewNotificationTitle,
            body: selectReviewReminderNotificationBody({
              language: i18n.language,
              dueReviewCount,
            }),
          },
          data: {
            dueReviewCount,
            route: "/review" as const,
          },
        };
      }
    );
    const endOfDayNotificationTitle = getEndOfDayReminderNotificationTitle(
      i18n.language
    );
    const endOfDayEntries = buildEndOfDayReminderEntries({
      now: nowDate,
      horizonDays: 7,
      skipDateKeys,
      skipScheduledAt: [
        ...reminderEntries.map((entry) => entry.scheduledAt),
        ...reviewEntries.map((entry) => entry.scheduledAt),
      ],
    });
    const endOfDayRequests: LearningReminderNotificationRequest[] =
      endOfDayEntries.map((entry) => {
        const scheduledAt = new Date(entry.scheduledAt);
        return {
          when: scheduledAt,
          kind: END_OF_DAY_REMINDER_KIND,
          content: {
            title: endOfDayNotificationTitle,
            body: selectEndOfDayReminderNotificationBody({
              language: i18n.language,
              scheduledAt,
            }),
          },
          data: {
            route: "/flashcards" as const,
          },
        };
      });

    const scheduledRequests = [
      ...learningRequests,
      ...reviewRequests,
      ...endOfDayRequests,
    ];
    const scheduledDates = scheduledRequests
      .map((request) => request.when)
      .sort((left, right) => left.getTime() - right.getTime());

    await scheduleLearningReminderNotifications(scheduledRequests);

    await Promise.all([
      setLearningReminderNextAtState(
        resolveNextScheduledReminderAt(scheduledDates, nowDate.getTime())
      ),
      setLearningReminderProfileState(learningReminderProfile),
    ]);
  }, [
    setLearningReminderNextAtState,
    setLearningReminderPermissionState,
    setLearningReminderProfileState,
    pinnedOfficialCourseIds,
  ]);

  const cancelTodayLearningReminderSchedule = useCallback(async () => {
    const today = new Date();
    const remainingDates = await cancelLearningReminderNotificationsForDate(today);
    await setLearningReminderNextAtState(
      resolveNextScheduledReminderAt(remainingDates, Date.now())
    );
  }, [setLearningReminderNextAtState]);

  const refreshLearningReminderSchedule = useCallback(async () => {
    if (!learningRemindersEnabledRef.current) {
      return;
    }
    await computeAndScheduleLearningReminder();
  }, [computeAndScheduleLearningReminder]);

  const setLearningReminderAutomaticEnabled = useCallback(
    async (value: boolean) => {
      if (value === learningReminderAutomaticEnabledRef.current) {
        return;
      }
      learningReminderAutomaticEnabledRef.current = value;
      await _setLearningReminderAutomaticEnabled(value);
      if (learningRemindersEnabledRef.current) {
        await computeAndScheduleLearningReminder();
      }
    },
    [_setLearningReminderAutomaticEnabled, computeAndScheduleLearningReminder]
  );

  const setLearningReminderManualHour = useCallback(
    async (hour: number) => {
      const normalized = normalizeManualReminderHour(hour);
      if (normalized === learningReminderManualHourRef.current) {
        return;
      }
      learningReminderManualHourRef.current = normalized;
      await _setLearningReminderManualHour(normalized);
      if (
        learningRemindersEnabledRef.current &&
        !learningReminderAutomaticEnabledRef.current
      ) {
        await computeAndScheduleLearningReminder();
      }
    },
    [_setLearningReminderManualHour, computeAndScheduleLearningReminder]
  );

  const setLearningRemindersEnabled = useCallback(
    async (value: boolean) => {
      if (!value) {
        learningRemindersEnabledRef.current = false;
        await Promise.all([
          _setLearningRemindersEnabled(false),
          cancelLearningReminderNotification(),
          setLearningReminderNextAtState(null),
          setLearningReminderProfileState("unknown"),
        ]);
        return;
      }

      const permissionState = await requestReminderPermissions();
      await setLearningReminderPermissionState(permissionState);
      if (permissionState !== "granted") {
        learningRemindersEnabledRef.current = false;
        await _setLearningRemindersEnabled(false);
        await cancelLearningReminderNotification();
        await setLearningReminderNextAtState(null);
        return;
      }

      learningRemindersEnabledRef.current = true;
      await _setLearningRemindersEnabled(true);
      await computeAndScheduleLearningReminder();
    },
    [
      _setLearningRemindersEnabled,
      computeAndScheduleLearningReminder,
      setLearningReminderNextAtState,
      setLearningReminderPermissionState,
      setLearningReminderProfileState,
    ]
  );

  const toggleLearningRemindersEnabled = useCallback(async () => {
    await setLearningRemindersEnabled(!learningRemindersEnabledState);
  }, [learningRemindersEnabledState, setLearningRemindersEnabled]);

  return {
    learningRemindersEnabled: learningRemindersEnabledState,
    setLearningRemindersEnabled,
    toggleLearningRemindersEnabled,
    learningReminderAutomaticEnabled: learningReminderAutomaticEnabledState,
    setLearningReminderAutomaticEnabled,
    learningReminderManualHour: normalizeManualReminderHour(
      learningReminderManualHourState
    ),
    setLearningReminderManualHour,
    learningReminderNextAt: learningReminderNextAtState,
    learningReminderProfile: learningReminderProfileState,
    learningReminderPermissionState,
    computeAndScheduleLearningReminder,
    refreshLearningReminderSchedule,
    cancelTodayLearningReminderSchedule,
  };
}
