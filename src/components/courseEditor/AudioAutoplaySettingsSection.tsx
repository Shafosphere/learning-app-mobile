import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Image, Text, View, useWindowDimensions } from "react-native";
import { getFlagSource } from "@/src/constants/languageFlags";
import { useTranslation } from "react-i18next";
import { useThemeSettings } from "@/src/contexts/SettingsContext";
import type { FlashcardAutoplayMode } from "@/src/contexts/settings/types";
import type { NativeLanguage } from "@/src/i18n";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { preventWidowsPl } from "@/src/utils/preventWidowsPl";
import { SettingsChoiceCard } from "./SettingsChoiceCard";
import { useStyles } from "./SettingsChoiceCard-styles";

type Props = {
  value: FlashcardAutoplayMode;
  nativeLanguage: NativeLanguage;
  onSelect: (value: FlashcardAutoplayMode) => void;
  disabled: boolean;
};

const useLocalStyles = createThemeStylesHook((colors) => ({
  heading: { textTransform: "none" },
  languageRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  languageBadge: {
    alignSelf: "flex-start",
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: "100%",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.secondBackground,
  },
  flag: { width: 22, height: 22, borderRadius: 11 },
  languageText: { flexShrink: 1 },
}));

export function AudioAutoplaySettingsSection({ value, nativeLanguage, onSelect, disabled }: Props) {
  const { t } = useTranslation();
  const styles = useStyles();
  const local = useLocalStyles();
  const { width, fontScale } = useWindowDimensions();
  const { fontScaleMultiplier } = useThemeSettings();
  const [contentWidth, setContentWidth] = useState<number>();
  // Keep two columns on phones; let larger accessibility text use the full width.
  const stacked = (contentWidth ?? width - 32) < 210 * fontScale * fontScaleMultiplier;
  const title = t("audioAutoplay.title");
  const language = t(nativeLanguage === "pl" ? "repeats.labels.polish" : "repeats.labels.english");

  const renderOption = (mode: FlashcardAutoplayMode) => (
    <SettingsChoiceCard
      title={t(`audioAutoplay.modes.${mode}.title`, { context: nativeLanguage })}
      description={t(`audioAutoplay.modes.${mode}.description`, { context: nativeLanguage })}
      accessibilityLabel={`${title}: ${t(`audioAutoplay.modes.${mode}.title`, { context: nativeLanguage })}`}
      accessibilityHint={t(`audioAutoplay.modes.${mode}.description`, { context: nativeLanguage })}
      icon={mode === "non_native" ? "chatbubble-ellipses-outline" : mode === "all" ? "globe-outline" : "volume-mute-outline"}
      accent="teal"
      selected={value === mode}
      onPress={() => onSelect(mode)}
      disabled={disabled}
      wide={mode === "off"}
      emphasizeSelectedBorder
    />
  );

  return (
    <View
      testID="course-audio-autoplay-settings"
      style={styles.section}
      onLayout={({ nativeEvent }) => setContentWidth(nativeEvent.layout.width)}
    >
      <View style={styles.header}>
        <View style={[styles.headerIcon, styles.tealTint]} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Ionicons name="volume-high-outline" size={21} style={styles.tealIcon} />
        </View>
        <View style={styles.headerText}>
          <Text accessibilityRole="header" style={[styles.heading, local.heading]}>{title}</Text>
          <Text style={styles.description}>{preventWidowsPl(t("audioAutoplay.courseDescription"))}</Text>
        </View>
      </View>
      <View
        style={local.languageRow}
        accessible
        accessibilityLabel={t("audioAutoplay.nativeLanguage", { language })}
      >
        <Text style={styles.hint}>{t("audioAutoplay.nativeLanguage", { language: "" }).trim()}</Text>
        <View style={local.languageBadge}>
          <Image
            source={getFlagSource(nativeLanguage)}
            style={local.flag}
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <Text style={[styles.description, local.languageText]}>{language}</Text>
        </View>
      </View>
      <View style={styles.grid}>
        <View testID="course-audio-autoplay-first-row" style={[styles.row, stacked && styles.stackedRow]}>
          {renderOption("non_native")}
          {renderOption("all")}
        </View>
        <View style={styles.row}>{renderOption("off")}</View>
      </View>
    </View>
  );
}
