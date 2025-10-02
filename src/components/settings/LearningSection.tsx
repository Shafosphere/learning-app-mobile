import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  Image,
  TextInput,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useStyles } from "@/src/screens/settings/styles";

const classicPreview = require("../../../assets/boxstyle1.png");
const carouselPreview = require("../../../assets/boxstyle2.png");

type LayoutOption = {
  key: "classic" | "carousel";
  label: string;
  preview: number;
};

const layoutOptions: LayoutOption[] = [
  { key: "classic", label: "Klasyczny", preview: classicPreview },
  { key: "carousel", label: "Karuzela", preview: carouselPreview },
];

const LearningSection: React.FC = () => {
  const styles = useStyles();
  const {
    colors,
    spellChecking,
    toggleSpellChecking,
    showBoxFaces,
    toggleShowBoxFaces,
    boxesLayout,
    setBoxesLayout,
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

  const handleLayoutSelect = async (key: "classic" | "carousel") => {
    if (key !== boxesLayout) {
      await setBoxesLayout(key);
      await triggerHaptics();
    }
  };

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

  const handleFacesToggle = async (value: boolean) => {
    if (value !== showBoxFaces) {
      await toggleShowBoxFaces();
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
          <Text style={styles.rowTitle}>Miny pudełek</Text>
          <Text style={styles.rowSubtitle}>
            Uśmiechnięte / smutne pudełka w zależności od statusu.
          </Text>
        </View>
        <Switch
          style={styles.switch}
          value={showBoxFaces}
          onValueChange={handleFacesToggle}
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

      <View style={[styles.row, { alignItems: "flex-start" }]}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>Wybierz schemat pudełek</Text>
          <Text style={styles.rowSubtitle}>
            Preferowany widok listy fiszek podczas nauki.
          </Text>
        </View>
      </View>

      <View style={styles.layoutOptions}>
        {layoutOptions.map((option) => (
          <TouchableOpacity
            key={option.key}
            activeOpacity={0.7}
            onPress={() => handleLayoutSelect(option.key)}
            style={[
              styles.layoutOption,
              boxesLayout === option.key && styles.layoutOptionActive,
            ]}
          >
            <Image
              source={option.preview}
              style={styles.layoutImage}
              resizeMode="cover"
            />
            <Text style={styles.layoutLabel}>{option.label}</Text>
          </TouchableOpacity>
        ))}
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
