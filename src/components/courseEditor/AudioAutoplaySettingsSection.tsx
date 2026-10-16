import {
  SettingsChoiceGrid,
  SettingsChoiceHeader,
  useSettingsChoiceLayout,
} from "./SettingsChoiceLayout";
import { Image, Text, View } from "react-native";
import { getFlagSource } from "@/src/constants/languageFlags";
import { useTranslation } from "react-i18next";
import type { FlashcardAutoplayMode } from "@/src/contexts/settings/types";
import type { NativeLanguage } from "@/src/i18n";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { SettingsChoiceCard } from "./SettingsChoiceCard";
import { useStyles } from "./SettingsChoiceCard-styles";

type Props = {
  value: FlashcardAutoplayMode;
  nativeLanguage: NativeLanguage;
  onSelect: (value: FlashcardAutoplayMode) => void;
  disabled: boolean;
};
const useLocalStyles = createThemeStylesHook((colors) => ({
  heading: {
    textTransform: "none",
  },
  languageRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
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
  flag: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  languageText: {
    flexShrink: 1,
  },
}));

export function AudioAutoplaySettingsSection({
  value,
  nativeLanguage,
  onSelect,
  disabled,
}: Props) {
  const { t } = useTranslation();
  const styles = useStyles();
  const local = useLocalStyles();
  const { stacked, onLayout } = useSettingsChoiceLayout(210);
  const title = t("audioAutoplay.title");
  const language = t(
    nativeLanguage === "pl"
      ? "repeats.labels.polish"
      : "repeats.labels.english",
  );
  const renderOption = (mode: FlashcardAutoplayMode) => (
    <SettingsChoiceCard
      title={t(`audioAutoplay.modes.${mode}.title`, {
        context: nativeLanguage,
      })}
      description={t(`audioAutoplay.modes.${mode}.description`, {
        context: nativeLanguage,
      })}
      accessibilityLabel={`${title}: ${t(`audioAutoplay.modes.${mode}.title`, {
        context: nativeLanguage,
      })}`}
      accessibilityHint={t(`audioAutoplay.modes.${mode}.description`, {
        context: nativeLanguage,
      })}
      icon={
        mode === "non_native"
          ? "chatbubble-ellipses-outline"
          : mode === "all"
            ? "globe-outline"
            : "volume-mute-outline"
      }
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
      onLayout={onLayout}
    >
      <SettingsChoiceHeader
        title={title}
        description={t("audioAutoplay.courseDescription")}
        icon="volume-high-outline"
        titleStyle={local.heading}
      />
      <View
        style={local.languageRow}
        accessible
        accessibilityLabel={t("audioAutoplay.nativeLanguage", {
          language,
        })}
      >
        <Text style={styles.hint}>
          {t("audioAutoplay.nativeLanguage", {
            language: "",
          }).trim()}
        </Text>
        <View style={local.languageBadge}>
          <Image
            source={getFlagSource(nativeLanguage)}
            style={local.flag}
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <Text style={[styles.description, local.languageText]}>
            {language}
          </Text>
        </View>
      </View>
      <SettingsChoiceGrid
        options={["non_native", "all", "off"] as const}
        stacked={stacked}
        renderOption={renderOption}
        firstRowTestID="course-audio-autoplay-first-row"
      />
    </View>
  );
}
