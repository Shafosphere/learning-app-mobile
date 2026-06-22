import { useCallback, useEffect, useRef } from "react";

import {
  cancelLearningReminderNotification,
  type ReminderPermissionState,
  reconcileReminders,
  requestReminderPermissions,
  type ReminderReconcileReason,
} from "@/src/features/notifications";
import { usePersistedState } from "@/src/hooks/usePersistedState";
import { STUDY_REMINDER_HOUR } from "@/src/features/notifications/reminderPlanner";
import {
  normalizeManualReminderHour,
  type SmartReminderProfile,
} from "@/src/services/smartReminders";

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
    usePersistedState<number>("learningReminder.manualHour", STUDY_REMINDER_HOUR);
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
  const pinnedOfficialCourseIdsRef = useRef(pinnedOfficialCourseIds);

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

  useEffect(() => {
    pinnedOfficialCourseIdsRef.current = pinnedOfficialCourseIds;
  }, [pinnedOfficialCourseIds]);

  const runReminderReconciliation = useCallback(
    async (reason: ReminderReconcileReason) => {
      const result = await reconcileReminders(reason, {
        enabled: learningRemindersEnabledRef.current,
        pinnedOfficialCourseIds: pinnedOfficialCourseIdsRef.current,
        automaticEnabled: learningReminderAutomaticEnabledRef.current,
        manualHour: learningReminderManualHourRef.current,
      });
      await Promise.all([
        setLearningReminderPermissionState(result.permissionState),
        setLearningReminderNextAtState(result.nextAt),
        setLearningReminderProfileState(result.profile),
      ]);
    },
    [
      setLearningReminderNextAtState,
      setLearningReminderPermissionState,
      setLearningReminderProfileState,
    ]
  );

  const refreshLearningReminderSchedule = useCallback(
    async (reason: ReminderReconcileReason = "app_foreground") => {
      if (!learningRemindersEnabledRef.current) {
        return;
      }
      await runReminderReconciliation(reason);
    },
    [runReminderReconciliation]
  );

  const cancelTodayLearningReminderSchedule = useCallback(
    async (reason: ReminderReconcileReason = "learning_completed") => {
      if (!learningRemindersEnabledRef.current) {
        return;
      }
      await runReminderReconciliation(reason);
    },
    [runReminderReconciliation]
  );

  const setLearningReminderAutomaticEnabled = useCallback(
    async (value: boolean) => {
      if (value === learningReminderAutomaticEnabledRef.current) {
        return;
      }
      learningReminderAutomaticEnabledRef.current = value;
      await _setLearningReminderAutomaticEnabled(value);
      if (learningRemindersEnabledRef.current) {
        await runReminderReconciliation("settings_changed");
      }
    },
    [_setLearningReminderAutomaticEnabled, runReminderReconciliation]
  );

  const setLearningReminderManualHour = useCallback(
    async (hour: number) => {
      const normalized = normalizeManualReminderHour(hour);
      if (normalized === learningReminderManualHourRef.current) {
        return;
      }
      learningReminderManualHourRef.current = normalized;
      await _setLearningReminderManualHour(normalized);
      if (learningRemindersEnabledRef.current) {
        await runReminderReconciliation("settings_changed");
      }
    },
    [_setLearningReminderManualHour, runReminderReconciliation]
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
        await setLearningReminderProfileState("unknown");
        return;
      }

      learningRemindersEnabledRef.current = true;
      await _setLearningRemindersEnabled(true);
      await runReminderReconciliation("settings_changed");
    },
    [
      _setLearningRemindersEnabled,
      runReminderReconciliation,
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
    refreshLearningReminderSchedule,
    cancelTodayLearningReminderSchedule,
  };
}
