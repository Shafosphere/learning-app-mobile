import { useEffect } from "react";
import { AppState } from "react-native";
import { useSettings } from "@/src/contexts/SettingsContext";

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
