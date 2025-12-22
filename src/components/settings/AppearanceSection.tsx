import { useSettings } from "@/src/contexts/SettingsContext";
import { useStyles } from "@/src/screens/settings/SettingsScreen-styles";
import Slider from "@react-native-community/slider";
import * as Haptics from "expo-haptics";
import React, { useCallback } from "react";
import { Image, Switch, Text, TouchableOpacity, View } from "react-native";

const classicPreview = require("@/assets/illustrations/box/boxstyle1.png");
const carouselPreview = require("@/assets/illustrations/box/boxstyle2.png");

type LayoutOption = {
  key: "classic" | "carousel";
  label: string;
  preview: number;
};

type FlashcardSizeOption = {
  key: "large" | "small";
  label: string;
  meta: string;
};

const layoutOptions: LayoutOption[] = [
  { key: "classic", label: "Klasyczny", preview: classicPreview },
  { key: "carousel", label: "Karuzela", preview: carouselPreview },
];

const flashcardSizeOptions: FlashcardSizeOption[] = [
  { key: "large", label: "Duża", meta: "Więcej miejsca na treść pytania." },
  { key: "small", label: "Mała", meta: "Kompaktowy widok z mniejszą kartą." },
];

const AppearanceSection: React.FC = () => {
  const styles = useStyles();
  const {
    theme,
    toggleTheme,
    feedbackEnabled,
    toggleFeedbackEnabled,
    feedbackVolume,
    setFeedbackVolume,
    showBoxFaces,
    toggleShowBoxFaces,
    boxesLayout,
    setBoxesLayout,
    flashcardsCardSize,
    setFlashcardsCardSize,
  } = useSettings();

  const [volumePreview, setVolumePreview] = React.useState(feedbackVolume);

  const triggerHaptics = useCallback(async () => {
    if (!feedbackEnabled) return;
    try {
      await Haptics.selectionAsync();
    } catch {
      // Ignored
    }
  }, [feedbackEnabled]);

  const handleThemeToggle = async (value: boolean) => {
    if ((value && theme !== "dark") || (!value && theme !== "light")) {
      await toggleTheme();
      await triggerHaptics();
    }
  };

  const handleFeedbackToggle = async (value: boolean) => {
    if (value !== feedbackEnabled) {
      if (value) {
        await triggerHaptics();
      }
      await toggleFeedbackEnabled();
    }
  };

  const handleFacesToggle = async (value: boolean) => {
    if (value !== showBoxFaces) {
      await toggleShowBoxFaces();
      await triggerHaptics();
    }
  };

  const handleLayoutSelect = async (key: "classic" | "carousel") => {
    if (key !== boxesLayout) {
      await setBoxesLayout(key);
      await triggerHaptics();
    }
  };

  const handleFlashcardSizeSelect = async (key: "large" | "small") => {
    if (key !== flashcardsCardSize) {
      await setFlashcardsCardSize(key);
      await triggerHaptics();
    }
  };

  const handleVolumeChange = useCallback(
    (value: number) => {
      setVolumePreview(value);
      void setFeedbackVolume(value);
    },
    [setFeedbackVolume]
  );

  React.useEffect(() => {
    setVolumePreview(feedbackVolume);
  }, [feedbackVolume]);

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionHeader}>Wygląd</Text>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>Ciemny motyw</Text>
          <Text style={styles.rowSubtitle}>
            Przełącz interfejs pomiędzy jasnym a ciemnym trybem.
          </Text>
        </View>
        <Switch
          style={styles.switch}
          value={theme === "dark"}
          onValueChange={handleThemeToggle}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>Wibracje</Text>
          <Text style={styles.rowSubtitle}>
            Krótkie wibracje w kluczowych interakcjach aplikacji.
          </Text>
        </View>
        <Switch
          style={styles.switch}
          value={feedbackEnabled}
          onValueChange={handleFeedbackToggle}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>Głośność efektów</Text>
          <Text style={styles.rowSubtitle}>
            Regulacja głośności dźwięków w aplikacji.
          </Text>
        </View>
        <View style={styles.sliderRow}>
          <View style={styles.sliderWrapper}>
            <Slider
              style={styles.slider}
              value={volumePreview}
              onValueChange={handleVolumeChange}
              minimumValue={0}
              maximumValue={1}
              step={0.01}
              minimumTrackTintColor={
                (styles.sliderFill as { backgroundColor: string })
                  .backgroundColor
              }
              maximumTrackTintColor={
                (styles.sliderTrack as { backgroundColor: string })
                  .backgroundColor
              }
              thumbTintColor={
                (styles.sliderThumb as { borderColor: string }).borderColor
              }
            />
          </View>

          <Text style={styles.sliderValue}>
            {Math.round(volumePreview * 100)}%
          </Text>
        </View>
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

      <View style={[styles.row, { alignItems: "flex-start", marginTop: 16 }]}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>Rozmiar fiszki</Text>
          <Text style={styles.rowSubtitle}>
            Zmień wielkość karty, aby lepiej mieścić dłuższe pytania.
          </Text>
        </View>
      </View>

      <View style={styles.flashcardSizeOptions}>
        {flashcardSizeOptions.map((option) => {
          const isActive = flashcardsCardSize === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              activeOpacity={0.7}
              onPress={() => handleFlashcardSizeSelect(option.key)}
              style={[
                styles.flashcardSizeOption,
                isActive && styles.flashcardSizeOptionActive,
              ]}
            >
              <Text
                style={[
                  styles.flashcardSizeLabel,
                  isActive && styles.flashcardSizeLabelActive,
                ]}
              >
                {option.label}
              </Text>
              <Text style={styles.flashcardSizeMeta}>{option.meta}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default AppearanceSection;
