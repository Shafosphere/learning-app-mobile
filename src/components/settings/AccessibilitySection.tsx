import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import * as Haptics from "expo-haptics";
import { useSettings, type DominantHand } from "@/src/contexts/SettingsContext";
import { useStyles } from "@/src/screens/settings/SettingsScreen/SettingsScreen-styles";
import SettingsItemCard from "@/src/components/settings/SettingsItemCard";
import { useTranslation } from "react-i18next";
import type { ColorBlindMode } from "@/src/theme/theme";
import ToggleSwitch from "@/src/components/toggle/ToggleSwitch";

const colorBlindModeOptions: {
  key: ColorBlindMode;
  labelKey: string;
  defaultLabel: string;
}[] = [
  {
    key: "none",
    labelKey: "settings.accessibility.colorBlind.modes.none",
    defaultLabel: "Off",
  },
  {
    key: "deuteranopia",
    labelKey: "settings.accessibility.colorBlind.modes.deuteranopia",
    defaultLabel: "Deuteranopia",
  },
  {
    key: "protanopia",
    labelKey: "settings.accessibility.colorBlind.modes.protanopia",
    defaultLabel: "Protanopia",
  },
  {
    key: "tritanopia",
    labelKey: "settings.accessibility.colorBlind.modes.tritanopia",
    defaultLabel: "Tritanopia",
  },
];

const dominantHandOptions: {
  key: DominantHand;
  labelKey: string;
  defaultLabel: string;
}[] = [
  {
    key: "left",
    labelKey: "settings.accessibility.dominantHand.options.left",
    defaultLabel: "Left",
  },
  {
    key: "center",
    labelKey: "settings.accessibility.dominantHand.options.center",
    defaultLabel: "Center",
  },
  {
    key: "right",
    labelKey: "settings.accessibility.dominantHand.options.right",
    defaultLabel: "Right",
  },
];

const AccessibilitySection: React.FC = () => {
  const styles = useStyles();
  const { t } = useTranslation();
  const {
    feedbackEnabled,
    highContrastEnabled,
    toggleHighContrast,
    colorBlindMode,
    setColorBlindMode,
    largeFontEnabled,
    toggleLargeFont,
    correctionErrorMarkersEnabled,
    toggleCorrectionErrorMarkers,
    dominantHand,
    setDominantHand,
  } = useSettings();
  const [colorBlindMenuOpen, setColorBlindMenuOpen] = useState(false);

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

  const handleColorBlindSelect = async (nextMode: ColorBlindMode) => {
    if (nextMode !== colorBlindMode) {
      await setColorBlindMode(nextMode);
      await triggerHaptics();
    }
    setColorBlindMenuOpen(false);
  };

  const handleColorBlindPress = async () => {
    setColorBlindMenuOpen(true);
  };

  const resolveColorBlindModeLabel = (mode: ColorBlindMode): string => {
    const option = colorBlindModeOptions.find((item) => item.key === mode);
    return t(option?.labelKey ?? "settings.accessibility.colorBlind.modes.none", {
      defaultValue: option?.defaultLabel ?? "Off",
    });
  };

  const colorBlindModeLabel = resolveColorBlindModeLabel(colorBlindMode);
  const currentModeLabel = t("settings.accessibility.colorBlind.currentLabel", {
    mode: colorBlindModeLabel,
    defaultValue: `Current mode: ${colorBlindModeLabel}`,
  });

  const handleColorBlindBackdropPress = () => {
    setColorBlindMenuOpen(false);
  };

  const handleLargeFontToggle = async (value: boolean) => {
    if (value !== largeFontEnabled) {
      await toggleLargeFont();
      await triggerHaptics();
    }
  };

  const handleCorrectionErrorMarkersToggle = async (value: boolean) => {
    if (value !== correctionErrorMarkersEnabled) {
      await toggleCorrectionErrorMarkers();
      await triggerHaptics();
    }
  };

  const handleDominantHandSelect = async (hand: DominantHand) => {
    if (hand !== dominantHand) {
      await setDominantHand(hand);
      await triggerHaptics();
    }
  };

  return (
    <View
      style={styles.sectionCard}
      accessibilityLabel={t("settings.accessibility.cardLabel")}
    >
      <Text
        style={styles.appearanceSectionHeader}
        allowFontScaling
        accessibilityRole="header"
      >
        {t("settings.accessibility.section")}
      </Text>
      <View style={styles.settingsList}>
        <SettingsItemCard
          title={t("settings.accessibility.highContrast.title")}
          description={t("settings.accessibility.highContrast.subtitle")}
          control={(
            <View style={styles.switch}>
              <ToggleSwitch
                value={highContrastEnabled}
                onPress={() => void handleHighContrastToggle(!highContrastEnabled)}
                accessibilityLabel={t("settings.accessibility.highContrast.title")}
              />
            </View>
          )}
        />

        <SettingsItemCard
          title={t("settings.accessibility.colorBlind.title", {
            defaultValue: "Color blind mode",
          })}
          description={t("settings.accessibility.colorBlind.subtitle", {
            defaultValue:
              "Applies a palette adjusted for the selected color vision deficiency type.",
          })}
          status={currentModeLabel}
        >
          <View style={styles.languageSegment}>
            <TouchableOpacity
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={currentModeLabel}
              onPress={handleColorBlindPress}
              style={styles.languageSelectTrigger}
            >
              <Text style={styles.languageSelectTriggerText} allowFontScaling>
                {colorBlindModeLabel}
              </Text>
              <Text style={styles.languageSelectChevron}>▾</Text>
            </TouchableOpacity>
          </View>
        </SettingsItemCard>

        <SettingsItemCard
          title={t("settings.accessibility.largeFont.title")}
          description={t("settings.accessibility.largeFont.subtitle")}
          control={(
            <View style={styles.switch}>
              <ToggleSwitch
                value={largeFontEnabled}
                onPress={() => void handleLargeFontToggle(!largeFontEnabled)}
                accessibilityLabel={t("settings.accessibility.largeFont.title")}
              />
            </View>
          )}
        />

        <SettingsItemCard
          title={t("settings.accessibility.correctionErrorMarkers.title")}
          description={t("settings.accessibility.correctionErrorMarkers.subtitle")}
          control={(
            <View style={styles.switch}>
              <ToggleSwitch
                value={correctionErrorMarkersEnabled}
                onPress={() =>
                  void handleCorrectionErrorMarkersToggle(
                    !correctionErrorMarkersEnabled,
                  )
                }
                accessibilityLabel={t(
                  "settings.accessibility.correctionErrorMarkers.title",
                )}
              />
            </View>
          )}
        />

        <SettingsItemCard
          title={t("settings.accessibility.dominantHand.title", {
            defaultValue: "Preferred hand",
          })}
          description={t("settings.accessibility.dominantHand.subtitle", {
            defaultValue:
              "Moves tablet bottom flashcard buttons toward your stronger hand.",
          })}
        >
          <View style={styles.dominantHandSegment}>
            {dominantHandOptions.map((option) => {
              const isActive = dominantHand === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  onPress={() => void handleDominantHandSelect(option.key)}
                  style={[
                    styles.dominantHandOption,
                    isActive && styles.dominantHandOptionActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.dominantHandOptionText,
                      isActive && styles.dominantHandOptionTextActive,
                    ]}
                    allowFontScaling
                  >
                    {t(option.labelKey, { defaultValue: option.defaultLabel })}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </SettingsItemCard>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={colorBlindMenuOpen}
        onRequestClose={handleColorBlindBackdropPress}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.languageModalBackdrop}
          onPress={handleColorBlindBackdropPress}
        >
          <View style={styles.languageModalCard}>
            {colorBlindModeOptions.map((option) => {
              const isActive = colorBlindMode === option.key;
              const label = t(option.labelKey, {
                defaultValue: option.defaultLabel,
              });
              return (
                <TouchableOpacity
                  key={option.key}
                  activeOpacity={0.8}
                  style={[
                    styles.languageMenuOption,
                    isActive && styles.languageMenuOptionActive,
                  ]}
                  onPress={() => void handleColorBlindSelect(option.key)}
                >
                  <Text
                    style={[
                      styles.languageMenuOptionText,
                      isActive && styles.languageMenuOptionTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default AccessibilitySection;
