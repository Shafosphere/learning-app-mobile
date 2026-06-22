import { useEffect } from "react";
import { AppState } from "react-native";
import { useSettings } from "@/src/contexts/SettingsContext";

export default function LearningRemindersInitializer() {
  const { learningRemindersEnabled, refreshLearningReminderSchedule } = useSettings();

  useEffect(() => {
    if (!learningRemindersEnabled) {
      return;
    }
    void refreshLearningReminderSchedule("app_start");
  }, [learningRemindersEnabled, refreshLearningReminderSchedule]);

  useEffect(() => {
    if (!learningRemindersEnabled) {
      return;
    }

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void refreshLearningReminderSchedule("app_foreground");
      }
    });

    return () => {
      sub.remove();
    };
  }, [learningRemindersEnabled, refreshLearningReminderSchedule]);

  useEffect(() => {
    if (!learningRemindersEnabled) {
      return;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;

    const scheduleNextRollover = () => {
      const now = new Date();
      const nextMidnight = new Date(now.getTime());
      nextMidnight.setDate(nextMidnight.getDate() + 1);
      nextMidnight.setHours(0, 1, 0, 0);
      timer = setTimeout(() => {
        void refreshLearningReminderSchedule("midnight_rollover");
        scheduleNextRollover();
      }, Math.max(1000, nextMidnight.getTime() - now.getTime()));
    };

    scheduleNextRollover();

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [learningRemindersEnabled, refreshLearningReminderSchedule]);

  return null;
}
