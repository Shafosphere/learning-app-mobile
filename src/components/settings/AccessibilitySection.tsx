import React, { useCallback } from "react";
import { View, Text, Switch } from "react-native";
import * as Haptics from "expo-haptics";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useStyles } from "@/src/screens/settings/SettingsScreen-styles";
import { useTranslation } from "react-i18next";

const AccessibilitySection: React.FC = () => {
  const styles = useStyles();
  const { t } = useTranslation();
  const {
    feedbackEnabled,
    highContrastEnabled,
    toggleHighContrast,
    colorBlindMode,
    toggleColorBlindMode,
    largeFontEnabled,
    toggleLargeFont,
  } = useSettings();

  const triggerHaptics = useCallback(async () => {
    if (!feedbackEnabled) return;
    try {
      await Haptics.selectionAsync();
    } catch {
      // Silently ignore when haptics are not available
    }
  }, [feedbackEnabled]);

  const handleHighContrastToggle = async (value: boolean) => {
    if (value !== highContrastEnabled) {
      await toggleHighContrast();
      await triggerHaptics();
    }
  };

  const handleColorBlindToggle = async (value: boolean) => {
    const isDeuteranopia = colorBlindMode === "deuteranopia";
    if (value !== isDeuteranopia) {
      await toggleColorBlindMode();
      await triggerHaptics();
    }
  };

  const handleLargeFontToggle = async (value: boolean) => {
    if (value !== largeFontEnabled) {
      await toggleLargeFont();
      await triggerHaptics();
    }
  };

  return (
    <View
      style={styles.sectionCard}
      accessibilityLabel={t("settings.accessibility.cardLabel")}
    >
      <Text
        style={styles.sectionHeader}
        allowFontScaling
        accessibilityRole="header"
      >
        {t("settings.accessibility.section")}
      </Text>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle} allowFontScaling>
            {t("settings.accessibility.highContrast.title")}
          </Text>
          <Text style={styles.rowSubtitle} allowFontScaling>
            {t("settings.accessibility.highContrast.subtitle")}
          </Text>
        </View>
        <Switch
          style={styles.switch}
          value={highContrastEnabled}
          onValueChange={handleHighContrastToggle}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle} allowFontScaling>
            {t("settings.accessibility.colorBlind.title")}
          </Text>
          <Text style={styles.rowSubtitle} allowFontScaling>
            {t("settings.accessibility.colorBlind.subtitle")}
          </Text>
        </View>
        <Switch
          style={styles.switch}
          value={colorBlindMode === "deuteranopia"}
          onValueChange={handleColorBlindToggle}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle} allowFontScaling>
            {t("settings.accessibility.largeFont.title")}
          </Text>
          <Text style={styles.rowSubtitle} allowFontScaling>
            {t("settings.accessibility.largeFont.subtitle")}
          </Text>
        </View>
        <Switch
          style={styles.switch}
          value={largeFontEnabled}
          onValueChange={handleLargeFontToggle}
        />
      </View>
    </View>
  );
};

export default AccessibilitySection;
