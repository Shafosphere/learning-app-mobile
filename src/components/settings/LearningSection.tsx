import React, { useCallback } from "react";
import { View, Text } from "react-native";
import * as Haptics from "expo-haptics";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useStyles } from "@/src/screens/settings/SettingsScreen-styles";
import { useTranslation } from "react-i18next";
import ToggleSwitch from "@/src/components/toggle/ToggleSwitch";
import { preventWidowsPl } from "@/src/utils/preventWidowsPl";

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
    learningReminderPermissionState,
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

  const reminderStatusLines = (() => {
    if (!learningRemindersEnabled) {
      return [];
    }
    if (learningReminderPermissionState === "denied") {
      return [t("settings.learning.reminders.status.permissionDenied")];
    }
    return [];
  })();

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.appearanceSectionHeader}>
        {t("settings.learning.section")}
      </Text>

      <View style={styles.learningHeroCard}>
        <View style={styles.appearanceGroupRow}>
          <View style={styles.appearanceRowText}>
            <Text style={styles.appearanceBlockTitle}>
              {t("settings.learning.reminders.title")}
            </Text>
            <Text style={styles.appearanceBlockDescription}>
              {preventWidowsPl("Pomaga utrzymać rytm nauki.")}
            </Text>
            {reminderStatusLines[0] ? (
              <Text style={styles.settingStatus}>{reminderStatusLines[0]}</Text>
            ) : null}
            {reminderStatusLines.slice(1).map((line) => (
              <Text key={line} style={styles.settingMeta}>
                {line}
              </Text>
            ))}
          </View>
          <View style={styles.switch}>
            <ToggleSwitch
              value={learningRemindersEnabled}
              onPress={() => void handleRemindersToggle(!learningRemindersEnabled)}
              accessibilityLabel={t("settings.learning.reminders.title")}
            />
          </View>
        </View>
      </View>

      <Text style={styles.appearanceGroupLabel}>PISANIE</Text>
      <View style={styles.appearanceGroupCard}>
        <View style={styles.appearanceGroupRows}>
          <View style={styles.appearanceGroupRow}>
            <View style={styles.appearanceRowText}>
              <Text style={styles.appearanceBlockTitle}>
                {t("settings.learning.spellcheck.title")}
              </Text>
              <Text style={styles.appearanceBlockDescription}>
                {preventWidowsPl(t("settings.learning.spellcheck.subtitle"))}
              </Text>
            </View>
            <View style={styles.switch}>
              <ToggleSwitch
                value={spellChecking}
                onPress={() => void handleSpellCheckToggle(!spellChecking)}
                accessibilityLabel={t("settings.learning.spellcheck.title")}
              />
            </View>
          </View>

          <View style={styles.appearanceGroupDivider} />

          <View style={styles.appearanceGroupRow}>
            <View style={styles.appearanceRowText}>
              <Text style={styles.appearanceBlockTitle}>
                {t("settings.learning.keyboardSuggestions.title")}
              </Text>
              <Text style={styles.appearanceBlockDescription}>
                {preventWidowsPl(t("settings.learning.keyboardSuggestions.subtitle"))}
              </Text>
            </View>
            <View style={styles.switch}>
              <ToggleSwitch
                value={flashcardsSuggestionsEnabled}
                onPress={() => void handleSuggestionsToggle(!flashcardsSuggestionsEnabled)}
                accessibilityLabel={t("settings.learning.keyboardSuggestions.title")}
              />
            </View>
          </View>

          <View style={styles.appearanceGroupDivider} />

          <View style={styles.appearanceGroupRow}>
            <View style={styles.appearanceRowText}>
              <Text style={styles.appearanceBlockTitle}>
                {t("settings.learning.ignoreDiacritics.title")}
              </Text>
              <Text style={styles.appearanceBlockDescription}>
                {preventWidowsPl(t("settings.learning.ignoreDiacritics.subtitle"))}
              </Text>
            </View>
            <View style={styles.switch}>
              <ToggleSwitch
                value={ignoreDiacriticsInSpellcheck}
                onPress={() => void handleDiacriticsToggle(!ignoreDiacriticsInSpellcheck)}
                accessibilityLabel={t("settings.learning.ignoreDiacritics.title")}
              />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

export default LearningSection;
