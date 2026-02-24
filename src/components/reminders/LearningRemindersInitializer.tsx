import { useSettings } from "@/src/contexts/SettingsContext";
import { useEffect } from "react";
import { AppState } from "react-native";

export default function LearningRemindersInitializer() {
  const { learningRemindersEnabled, refreshLearningReminderSchedule } = useSettings();

  useEffect(() => {
    if (!learningRemindersEnabled) {
      return;
    }
    void refreshLearningReminderSchedule();
  }, [learningRemindersEnabled, refreshLearningReminderSchedule]);

  useEffect(() => {
    if (!learningRemindersEnabled) {
      return;
    }

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void refreshLearningReminderSchedule();
      }
    });

    return () => {
      sub.remove();
    };
  }, [learningRemindersEnabled, refreshLearningReminderSchedule]);

  return null;
}
