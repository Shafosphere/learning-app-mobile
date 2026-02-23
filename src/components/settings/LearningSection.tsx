import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Switch, TextInput } from "react-native";
import * as Haptics from "expo-haptics";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useStyles } from "@/src/screens/settings/SettingsScreen-styles";
import { useTranslation } from "react-i18next";

const LearningSection: React.FC = () => {
  const styles = useStyles();
  const { t } = useTranslation();
  const {
    colors,
    spellChecking,
    toggleSpellChecking,
    ignoreDiacriticsInSpellcheck,
    toggleIgnoreDiacriticsInSpellcheck,
    flashcardsBatchSize,
    setFlashcardsBatchSize,
    flashcardsSuggestionsEnabled,
    toggleFlashcardsSuggestions,
    learningRemindersEnabled,
    toggleLearningRemindersEnabled,
    feedbackEnabled,
  } = useSettings();

  const [batchSizeInput, setBatchSizeInput] = useState(
    String(flashcardsBatchSize)
  );

  useEffect(() => {
    setBatchSizeInput(String(flashcardsBatchSize));
  }, [flashcardsBatchSize]);

  const triggerHaptics = useCallback(async () => {
    if (!feedbackEnabled) return;
    try {
      await Haptics.selectionAsync();
    } catch {
      // Ignored
    }
  }, [feedbackEnabled]);

  const handleBatchChange = (value: string) => {
    const sanitized = value.replace(/[^0-9]/g, "");
    setBatchSizeInput(sanitized);
  };

  const handleBatchSubmit = async () => {
    const parsed = parseInt(batchSizeInput, 10);
    if (!Number.isNaN(parsed) && parsed > 0 && parsed <= 200) {
      await setFlashcardsBatchSize(parsed);
      await triggerHaptics();
    } else {
      setBatchSizeInput(String(flashcardsBatchSize));
    }
  };

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
          disabled={!spellChecking}
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
        </View>
        <Switch
          style={styles.switch}
          value={learningRemindersEnabled}
          onValueChange={handleRemindersToggle}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>{t("settings.learning.batchSize.title")}</Text>
          <Text style={styles.rowSubtitle}>
            {t("settings.learning.batchSize.subtitle")}
          </Text>
        </View>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          value={batchSizeInput}
          onChangeText={handleBatchChange}
          onEndEditing={handleBatchSubmit}
          placeholder={t("settings.learning.batchSize.placeholder")}
          placeholderTextColor={`${colors.paragraph}55`}
        />
      </View>
    </View>
  );
};

export default LearningSection;
