import React, { useCallback, useMemo } from "react";
import { View, Text, Switch } from "react-native";
import * as Haptics from "expo-haptics";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useStyles } from "@/src/screens/settings/SettingsScreen-styles";
import { useTranslation } from "react-i18next";

const LearningSection: React.FC = () => {
  const styles = useStyles();
  const { t } = useTranslation();
  const {
    spellChecking,
    toggleSpellChecking,
    ignoreDiacriticsInSpellcheck,
    toggleIgnoreDiacriticsInSpellcheck,
    flashcardsSuggestionsEnabled,
    toggleFlashcardsSuggestions,
    learningRemindersEnabled,
    toggleLearningRemindersEnabled,
    learningReminderNextAt,
    learningReminderProfile,
    learningReminderPreferredWeekdays,
    learningReminderPermissionState,
    resolvedLanguage,
    feedbackEnabled,
  } = useSettings();

  const triggerHaptics = useCallback(async () => {
    if (!feedbackEnabled) return;
    try {
      await Haptics.selectionAsync();
    } catch {
      // Ignored
    }
  }, [feedbackEnabled]);

  const handleSpellCheckToggle = async (value: boolean) => {
    if (value !== spellChecking) {
      await toggleSpellChecking();
      await triggerHaptics();
    }
  };

  const handleDiacriticsToggle = async (value: boolean) => {
    if (value !== ignoreDiacriticsInSpellcheck) {
      await toggleIgnoreDiacriticsInSpellcheck();
      await triggerHaptics();
    }
  };

  const handleRemindersToggle = async (value: boolean) => {
    if (value !== learningRemindersEnabled) {
      await toggleLearningRemindersEnabled();
      await triggerHaptics();
    }
  };

  const handleSuggestionsToggle = async (value: boolean) => {
    if (value !== flashcardsSuggestionsEnabled) {
      await toggleFlashcardsSuggestions();
      await triggerHaptics();
    }
  };

  const reminderWeekdaysLabel = useMemo(() => {
    if (learningReminderPreferredWeekdays.length === 0) {
      return t("settings.learning.reminders.status.allDays");
    }
    const labels = learningReminderPreferredWeekdays
      .slice()
      .sort((a, b) => a - b)
      .map((weekday) => {
        const date = new Date(Date.UTC(2023, 0, 1 + weekday));
        return new Intl.DateTimeFormat(resolvedLanguage, {
          weekday: "short",
          timeZone: "UTC",
        }).format(date);
      });
    return labels.join("/");
  }, [learningReminderPreferredWeekdays, resolvedLanguage, t]);

  const reminderStatusLines = useMemo(() => {
    if (!learningRemindersEnabled) {
      return [];
    }
    if (learningReminderPermissionState === "denied") {
      return [t("settings.learning.reminders.status.permissionDenied")];
    }

    const lines: string[] = [];
    if (learningReminderNextAt != null) {
      const formatted = new Intl.DateTimeFormat(resolvedLanguage, {
        weekday: "long",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(learningReminderNextAt));
      lines.push(
        t("settings.learning.reminders.status.next", {
          value: formatted,
        })
      );
    }

    if (learningReminderProfile === "unknown") {
      return lines;
    }

    lines.push(
      t("settings.learning.reminders.status.profileAndDays", {
        profile: t(`settings.learning.reminders.profile.${learningReminderProfile}`),
        days: reminderWeekdaysLabel,
      })
    );
    return lines;
  }, [
    learningReminderNextAt,
    learningReminderPermissionState,
    learningReminderProfile,
    learningRemindersEnabled,
    reminderWeekdaysLabel,
    resolvedLanguage,
    t,
  ]);

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionHeader}>{t("settings.learning.section")}</Text>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>{t("settings.learning.spellcheck.title")}</Text>
          <Text style={styles.rowSubtitle}>
            {t("settings.learning.spellcheck.subtitle")}
          </Text>
        </View>
        <Switch
          style={styles.switch}
          value={spellChecking}
          onValueChange={handleSpellCheckToggle}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>
            {t("settings.learning.keyboardSuggestions.title")}
          </Text>
          <Text style={styles.rowSubtitle}>
            {t("settings.learning.keyboardSuggestions.subtitle")}
          </Text>
        </View>
        <Switch
          style={styles.switch}
          value={flashcardsSuggestionsEnabled}
          onValueChange={handleSuggestionsToggle}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>
            {t("settings.learning.ignoreDiacritics.title")}
          </Text>
          <Text style={styles.rowSubtitle}>
            {t("settings.learning.ignoreDiacritics.subtitle")}
          </Text>
        </View>
        <Switch
          style={styles.switch}
          value={ignoreDiacriticsInSpellcheck}
          onValueChange={handleDiacriticsToggle}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>
            {t("settings.learning.reminders.title")}
          </Text>
          <Text style={styles.rowSubtitle}>
            {t("settings.learning.reminders.subtitle")}
          </Text>
          {reminderStatusLines.map((line) => (
            <Text key={line} style={styles.rowSubtitle}>
              {line}
            </Text>
          ))}
        </View>
        <Switch
          style={styles.switch}
          value={learningRemindersEnabled}
          onValueChange={handleRemindersToggle}
        />
      </View>
    </View>
  );
};

export default LearningSection;
