import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Switch, TextInput } from "react-native";
import * as Haptics from "expo-haptics";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useStyles } from "@/src/screens/settings/SettingsScreen-styles";

const LearningSection: React.FC = () => {
  const styles = useStyles();
  const {
    colors,
    spellChecking,
    toggleSpellChecking,
    ignoreDiacriticsInSpellcheck,
    toggleIgnoreDiacriticsInSpellcheck,
    flashcardsBatchSize,
    setFlashcardsBatchSize,
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

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionHeader}>Nauka</Text>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>Spellchecking</Text>
          <Text style={styles.rowSubtitle}>
            Tolerancja 1 błedu przy sprawdzaniu.
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
          <Text style={styles.rowTitle}>Ignoruj znaki diakrytyczne</Text>
          <Text style={styles.rowSubtitle}>
            {"Porównuj słowa bez ogonków, np. ą -> a."}
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
          <Text style={styles.rowTitle}>Przypomnienia o nauce</Text>
          <Text style={styles.rowSubtitle}>
            Placeholder – docelowo planowane powiadomienia push.
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
          <Text style={styles.rowTitle}>Liczba fiszek w partii</Text>
          <Text style={styles.rowSubtitle}>
            Zakres 1-200 fiszek na jedną sesję nauki.
          </Text>
        </View>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          value={batchSizeInput}
          onChangeText={handleBatchChange}
          onEndEditing={handleBatchSubmit}
          placeholder="np. 10"
          placeholderTextColor={`${colors.paragraph}55`}
        />
      </View>
    </View>
  );
};

export default LearningSection;
