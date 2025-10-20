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
import { useStyles } from "@/src/screens/settings/SettingsScreen-styles";
import {
  MEMORY_BOARD_LAYOUTS,
  MEMORY_BOARD_SIZE_LABELS,
  MEMORY_BOARD_SIZE_ORDER,
  MemoryBoardSize,
} from "@/src/constants/memoryGame";

const classicPreview = require("@/assets/illustrations/box/boxstyle1.png");
const carouselPreview = require("@/assets/illustrations/box/boxstyle2.png");

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
    ignoreDiacriticsInSpellcheck,
    toggleIgnoreDiacriticsInSpellcheck,
    showBoxFaces,
    toggleShowBoxFaces,
    boxesLayout,
    setBoxesLayout,
    flashcardsBatchSize,
    setFlashcardsBatchSize,
    learningRemindersEnabled,
    toggleLearningRemindersEnabled,
    feedbackEnabled,
    memoryBoardSize,
    setMemoryBoardSize,
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

  const handleMemoryBoardSelect = async (size: MemoryBoardSize) => {
    if (size !== memoryBoardSize) {
      await setMemoryBoardSize(size);
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

      <View style={[styles.row, { alignItems: "flex-start" }]}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>Plansza Memory</Text>
          <Text style={styles.rowSubtitle}>
            Wybierz rozmiar planszy gry pamięciowej.
          </Text>
        </View>
      </View>

      <View style={styles.memoryOptions}>
        {MEMORY_BOARD_SIZE_ORDER.map((size) => {
          const isActive = memoryBoardSize === size;
          const layout = MEMORY_BOARD_LAYOUTS[size];
          return (
            <TouchableOpacity
              key={size}
              activeOpacity={0.7}
              onPress={() => handleMemoryBoardSelect(size)}
              style={[
                styles.memoryOption,
                isActive && styles.memoryOptionActive,
              ]}
            >
              <Text
                style={[
                  styles.memoryOptionLabel,
                  isActive && styles.memoryOptionLabelActive,
                ]}
              >
                {MEMORY_BOARD_SIZE_LABELS[size]}
              </Text>
              <Text style={styles.memoryOptionMeta}>
                {layout.columns} × {layout.rows}
              </Text>
            </TouchableOpacity>
          );
        })}
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
