import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useTranslation } from "react-i18next";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useHydratedPersistedState } from "@/src/hooks/usePersistedState";
import {
  consumeNotificationNudgePreview,
  subscribeNotificationNudgePreview,
} from "@/src/services/notificationNudgePreview";
import { NudgeModal } from "./NudgeModal";

export const NOTIFICATION_NUDGE_FOREGROUND_THRESHOLD_MS = 15 * 60 * 1000;
export const NOTIFICATION_NUDGE_RETRY_DELAY_MS = 7 * 24 * 60 * 60 * 1000;
export const NOTIFICATION_NUDGE_USAGE_CHECKPOINT_INTERVAL_MS = 60 * 1000;

const FOREGROUND_USAGE_STORAGE_KEY = "notificationNudge.foregroundUsageMs";
const ACTIVE_SESSION_STORAGE_KEY = "notificationNudge.activeSessionStartedAt";
const NEXT_ELIGIBLE_STORAGE_KEY = "notificationNudge.nextEligibleAt";

export default function NotificationPermissionNudge() {
  const { t } = useTranslation();
  const { learningRemindersEnabled, setLearningRemindersEnabled } = useSettings();
  const [foregroundUsageMs, setForegroundUsageMs, isUsageHydrated] =
    useHydratedPersistedState(FOREGROUND_USAGE_STORAGE_KEY, 0);
  const [activeSessionStartedAt, setActiveSessionStartedAt, isSessionHydrated] =
    useHydratedPersistedState<number | null>(ACTIVE_SESSION_STORAGE_KEY, null);
  const [nextEligibleAt, setNextEligibleAt, isEligibleHydrated] =
    useHydratedPersistedState<number | null>(NEXT_ELIGIBLE_STORAGE_KEY, null);
  const [visible, setVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const usageRef = useRef(foregroundUsageMs);
  const activeSessionRef = useRef<number | null>(activeSessionStartedAt);
  const sessionVersionRef = useRef(0);
  const sessionPersistenceQueueRef = useRef<Promise<void>>(Promise.resolve());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usageCheckpointTimerRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const beginActiveSessionRef = useRef<() => Promise<void>>(async () => {});
  const finishActiveSessionRef = useRef<() => Promise<void>>(async () => {});

  const hydrated = isUsageHydrated && isSessionHydrated && isEligibleHydrated;

  useEffect(() => {
    usageRef.current = foregroundUsageMs;
  }, [foregroundUsageMs]);

  useEffect(() => {
    activeSessionRef.current = activeSessionStartedAt;
  }, [activeSessionStartedAt]);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearUsageCheckpointTimer = useCallback(() => {
    if (usageCheckpointTimerRef.current != null) {
      clearInterval(usageCheckpointTimerRef.current);
      usageCheckpointTimerRef.current = null;
    }
  }, []);

  const enqueueSessionPersistence = useCallback((write: () => Promise<void>) => {
    const queuedWrite = sessionPersistenceQueueRef.current.then(write, write);
    sessionPersistenceQueueRef.current = queuedWrite.catch(() => {});
    return queuedWrite;
  }, []);

  const getCurrentUsage = useCallback(() => {
    if (activeSessionRef.current == null) return usageRef.current;
    return usageRef.current + Math.max(0, Date.now() - activeSessionRef.current);
  }, []);

  const evaluate = useCallback(() => {
    if (!hydrated || learningRemindersEnabled) {
      setVisible(false);
      return;
    }

    const now = Date.now();
    if (
      getCurrentUsage() >= NOTIFICATION_NUDGE_FOREGROUND_THRESHOLD_MS &&
      (nextEligibleAt == null || now >= nextEligibleAt)
    ) {
      setVisible(true);
    }
  }, [getCurrentUsage, hydrated, learningRemindersEnabled, nextEligibleAt]);

  const scheduleEvaluation = useCallback(() => {
    clearTimer();
    if (!hydrated || learningRemindersEnabled || activeSessionRef.current == null) {
      return;
    }

    const now = Date.now();
    const usageDelay = Math.max(
      0,
      NOTIFICATION_NUDGE_FOREGROUND_THRESHOLD_MS - getCurrentUsage()
    );
    const eligibilityDelay = Math.max(0, (nextEligibleAt ?? now) - now);
    const delay = Math.max(usageDelay, eligibilityDelay);

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      evaluate();
    }, delay);
  }, [clearTimer, evaluate, getCurrentUsage, hydrated, learningRemindersEnabled, nextEligibleAt]);

  const finishActiveSession = useCallback(async () => {
    const startedAt = activeSessionRef.current;
    if (startedAt == null) return;

    const totalUsage = usageRef.current + Math.max(0, Date.now() - startedAt);
    usageRef.current = totalUsage;
    activeSessionRef.current = null;
    sessionVersionRef.current += 1;
    await enqueueSessionPersistence(async () => {
      await Promise.all([
        setForegroundUsageMs(totalUsage),
        setActiveSessionStartedAt(null),
      ]);
    });
  }, [enqueueSessionPersistence, setActiveSessionStartedAt, setForegroundUsageMs]);

  const checkpointActiveSession = useCallback(async () => {
    const sessionVersion = sessionVersionRef.current;
    await enqueueSessionPersistence(async () => {
      const startedAt = activeSessionRef.current;
      if (startedAt == null || sessionVersion !== sessionVersionRef.current) {
        return;
      }

      const now = Date.now();
      const totalUsage = usageRef.current + Math.max(0, now - startedAt);
      usageRef.current = totalUsage;
      activeSessionRef.current = now;
      await Promise.all([
        setForegroundUsageMs(totalUsage),
        setActiveSessionStartedAt(now),
      ]);
    });
  }, [enqueueSessionPersistence, setActiveSessionStartedAt, setForegroundUsageMs]);

  const startUsageCheckpointTimer = useCallback(() => {
    clearUsageCheckpointTimer();
    usageCheckpointTimerRef.current = setInterval(() => {
      void checkpointActiveSession();
    }, NOTIFICATION_NUDGE_USAGE_CHECKPOINT_INTERVAL_MS);
  }, [checkpointActiveSession, clearUsageCheckpointTimer]);

  const beginActiveSession = useCallback(async () => {
    if (activeSessionRef.current != null) return;
    const startedAt = Date.now();
    sessionVersionRef.current += 1;
    activeSessionRef.current = startedAt;
    await enqueueSessionPersistence(() => setActiveSessionStartedAt(startedAt));
    startUsageCheckpointTimer();
    evaluate();
    scheduleEvaluation();
  }, [
    evaluate,
    scheduleEvaluation,
    enqueueSessionPersistence,
    setActiveSessionStartedAt,
    startUsageCheckpointTimer,
  ]);

  useEffect(() => {
    beginActiveSessionRef.current = beginActiveSession;
    finishActiveSessionRef.current = finishActiveSession;
  }, [beginActiveSession, finishActiveSession]);

  useEffect(() => {
    if (!hydrated) return;

    // A stored start time may be left by a killed process. Never count time since it.
    if (activeSessionRef.current != null) {
      activeSessionRef.current = null;
      sessionVersionRef.current += 1;
      void enqueueSessionPersistence(() => setActiveSessionStartedAt(null));
    }

    if (AppState.currentState === "active") {
      void beginActiveSessionRef.current();
    }

    const subscription = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") {
        void beginActiveSessionRef.current();
        return;
      }
      clearTimer();
      clearUsageCheckpointTimer();
      void finishActiveSessionRef.current();
    });

    return () => {
      clearTimer();
      clearUsageCheckpointTimer();
      void finishActiveSessionRef.current();
      subscription.remove();
    };
  }, [
    clearTimer,
    clearUsageCheckpointTimer,
    enqueueSessionPersistence,
    hydrated,
    setActiveSessionStartedAt,
  ]);

  useEffect(() => {
    evaluate();
    scheduleEvaluation();
  }, [evaluate, scheduleEvaluation]);

  useEffect(() => {
    const openPreview = () => {
      if (consumeNotificationNudgePreview()) {
        setPreviewVisible(true);
      }
    };

    const unsubscribe = subscribeNotificationNudgePreview(openPreview);
    openPreview();
    return unsubscribe;
  }, []);

  const dismiss = useCallback(async () => {
    if (previewVisible) {
      setPreviewVisible(false);
      return;
    }
    setVisible(false);
    clearTimer();
    await setNextEligibleAt(Date.now() + NOTIFICATION_NUDGE_RETRY_DELAY_MS);
  }, [clearTimer, previewVisible, setNextEligibleAt]);

  const enableReminders = useCallback(async () => {
    if (enabling) return;
    setEnabling(true);
    const isPreview = previewVisible;
    try {
      await setLearningRemindersEnabled(true);
    } finally {
      // A denied native permission keeps reminders disabled. Cool down so the
      // nudge does not immediately reopen when the app becomes active again.
      if (!isPreview) {
        await setNextEligibleAt(Date.now() + NOTIFICATION_NUDGE_RETRY_DELAY_MS);
      }
      setVisible(false);
      setPreviewVisible(false);
      setEnabling(false);
    }
  }, [enabling, previewVisible, setLearningRemindersEnabled, setNextEligibleAt]);

  return (
    <NudgeModal
      visible={visible || previewVisible}
      title={t("notifications.nudge.title")}
      description={t("notifications.nudge.description")}
      confirmLabel={t("notifications.nudge.confirm")}
      confirmDisabled={enabling}
      onConfirm={() => void enableReminders()}
      onClose={() => void dismiss()}
      secondaryLabel={t("notifications.nudge.secondary")}
      onSecondaryPress={() => void dismiss()}
    />
  );
}
