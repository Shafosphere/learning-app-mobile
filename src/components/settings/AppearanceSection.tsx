import React, { useCallback } from "react";
import { View, Text, Switch, TouchableOpacity, Image } from "react-native";
import * as Haptics from "expo-haptics";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useStyles } from "@/src/screens/settings/SettingsScreen-styles";

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

const AppearanceSection: React.FC = () => {
  const styles = useStyles();
  const {
    theme,
    toggleTheme,
    feedbackEnabled,
    toggleFeedbackEnabled,
    showBoxFaces,
    toggleShowBoxFaces,
    boxesLayout,
    setBoxesLayout,
  } = useSettings();

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
          <Text style={styles.rowTitle}>Dźwięki i haptyka</Text>
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
    </View>
  );
};

export default AppearanceSection;
