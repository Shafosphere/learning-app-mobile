import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useTranslation } from "react-i18next";
import { UserDataExportSuccessModal } from "@/src/components/export/UserDataExportSuccessModal";
import { NudgeModal } from "@/src/components/nudge/NudgeModal";
import { useUserDataExportAction } from "@/src/hooks/useUserDataExportAction";
import {
  getOnboardingCheckpoint,
  subscribeOnboardingCheckpoint,
  type OnboardingCheckpoint,
} from "@/src/services/onboardingCheckpoint";
import {
  ensureLocalExportReminderFirstSeenAt,
  getLocalExportReminderState,
  getNextLocalExportReminderCheckAt,
  markLocalExportReminderShown,
  shouldShowLocalExportReminder,
} from "@/src/services/localExportReminder";
import { subscribeLocalExportReminderPreview } from "@/src/services/localExportReminderPreview";

const MAX_REMINDER_TIMER_DELAY_MS = 2_147_483_647;

export default function LocalExportReminder() {
  const { t } = useTranslation();
  const [onboardingCheckpoint, setOnboardingCheckpointState] =
    useState<OnboardingCheckpoint | null>(null);
  const [visible, setVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const mountedRef = useRef(true);
  const reminderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const evaluateReminderRef = useRef<() => Promise<void>>(async () => {});

  const clearReminderTimer = useCallback(() => {
    if (reminderTimerRef.current == null) {
      return;
    }

    clearTimeout(reminderTimerRef.current);
    reminderTimerRef.current = null;
  }, []);

  const scheduleReminderTimer = useCallback(
    (nextCheckAt: number | null) => {
      clearReminderTimer();

      if (nextCheckAt == null) {
        return;
      }

      const delay = Math.min(
        Math.max(nextCheckAt - Date.now(), 0),
        MAX_REMINDER_TIMER_DELAY_MS
      );

      reminderTimerRef.current = setTimeout(() => {
        reminderTimerRef.current = null;
        void evaluateReminderRef.current();
      }, delay);
    },
    [clearReminderTimer]
  );

  const evaluateReminder = useCallback(async () => {
    if (onboardingCheckpoint !== "done") {
      clearReminderTimer();
      if (mountedRef.current) {
        setVisible(false);
      }
      return;
    }

    await ensureLocalExportReminderFirstSeenAt();
    const state = await getLocalExportReminderState();
    if (!mountedRef.current) {
      return;
    }

    if (shouldShowLocalExportReminder(state)) {
      clearReminderTimer();
      setVisible(true);
      return;
    }

    scheduleReminderTimer(getNextLocalExportReminderCheckAt(state));
  }, [clearReminderTimer, onboardingCheckpoint, scheduleReminderTimer]);

  useEffect(() => {
    evaluateReminderRef.current = evaluateReminder;
  }, [evaluateReminder]);

  const hideAfterExport = useCallback(async () => {
    if (!mountedRef.current) {
      return;
    }

    setVisible(false);
    setPreviewVisible(false);
    await evaluateReminderRef.current();
  }, []);

  const { exporting, runExport, successSummary, dismissSuccess } =
    useUserDataExportAction({
      onSuccess: hideAfterExport,
    });

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      clearReminderTimer();
    };
  }, [clearReminderTimer]);

  useEffect(() => {
    let mounted = true;

    getOnboardingCheckpoint().then((checkpoint) => {
      if (!mounted) return;
      setOnboardingCheckpointState(checkpoint);
    });

    const unsubscribe = subscribeOnboardingCheckpoint((checkpoint) => {
      setOnboardingCheckpointState(checkpoint);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    void evaluateReminder().catch((error) => {
      console.warn("[LocalExportReminder] Failed to evaluate reminder", error);
    });
  }, [evaluateReminder]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active") {
        return;
      }

      void evaluateReminderRef.current().catch((error) => {
        console.warn("[LocalExportReminder] Failed to evaluate reminder", error);
      });
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    return subscribeLocalExportReminderPreview(() => {
      setPreviewVisible(true);
    });
  }, []);

  const handleClose = useCallback(async () => {
    if (previewVisible) {
      setPreviewVisible(false);
      return;
    }

    if (exporting || dismissing) {
      return;
    }

    setDismissing(true);
    try {
      await markLocalExportReminderShown();
      if (!mountedRef.current) {
        return;
      }
      setVisible(false);
      await evaluateReminderRef.current();
    } catch (error) {
      console.warn("[LocalExportReminder] Failed to dismiss reminder", error);
      if (mountedRef.current) {
        setVisible(false);
      }
    } finally {
      if (mountedRef.current) {
        setDismissing(false);
      }
    }
  }, [dismissing, exporting, previewVisible]);

  return (
    <>
      <NudgeModal
        visible={visible || previewVisible}
        title={t("localExportReminder.title")}
        description={t("localExportReminder.description")}
        confirmLabel={
          exporting
            ? t("localExportReminder.confirmLoading")
            : t("localExportReminder.confirm")
        }
        confirmDisabled={exporting || dismissing}
        onConfirm={runExport}
        onClose={() => {
          void handleClose();
        }}
        secondaryLabel={t("localExportReminder.later")}
        onSecondaryPress={() => {
          void handleClose();
        }}
      />
      <UserDataExportSuccessModal
        visible={successSummary != null}
        sizeKb={successSummary?.sizeKb}
        onClose={dismissSuccess}
      />
    </>
  );
}
