import Ionicons from "@expo/vector-icons/Ionicons";
import { useStyles as useChoiceStyles } from "./SettingsChoiceCard-styles";
import { preventWidowsPl } from "@/src/utils/preventWidowsPl";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import Animated, { Easing, ReduceMotion, useAnimatedReaction, useAnimatedStyle, useDerivedValue, useSharedValue, withTiming } from "react-native-reanimated";
import type { LetterHintSettings } from "@/src/contexts/settings/types";
import type { ThemeColors } from "@/src/theme/theme";
import { LETTER_HINT_PRESETS, selectLetterHintProfile } from "@/src/utils/letterHints";

type LetterHintControlsProps = {
  expanded: boolean;
  settings: LetterHintSettings;
  onChange: (value: LetterHintSettings) => void;
  colors: ThemeColors;
  disabled: boolean;
};

export function LetterHintControls({ expanded, settings, onChange, colors, disabled }: LetterHintControlsProps) {
  const { t } = useTranslation();
  const shared = useChoiceStyles();
  const titleStyle = shared.optionTitle;
  const detailStyle = shared.optionDescription;
  const contentHeight = useSharedValue(-1);
  const height = useSharedValue(expanded ? -1 : 0);

  useAnimatedReaction(
    () => expanded ? contentHeight.value : 0,
    (targetHeight) => {
      if (targetHeight < 0) return;
      // An already enabled section should appear at full height on first render.
      height.value = height.value < 0 ? targetHeight : withTiming(targetHeight, {
        duration: 260,
        easing: Easing.linear,
        reduceMotion: ReduceMotion.System,
      });
    },
    [expanded],
  );

  const opacity = useDerivedValue(() =>
    withTiming(expanded ? 1 : 0, {
      duration: 140,
      easing: Easing.linear,
      reduceMotion: ReduceMotion.System,
    }),
    [expanded],
  );

  const revealStyle = useAnimatedStyle(() => ({
    height: height.value < 0 ? undefined : height.value,
    opacity: opacity.value,
  }));
  const contentStyle = useAnimatedStyle(() => ({
    // Keep measuring the full content independently of the clipped height.
    position: height.value < 0 ? "relative" : "absolute",
  }));

  return (
    <Animated.View
      style={[styles.reveal, revealStyle]}
      pointerEvents={expanded ? "auto" : "none"}
      accessibilityElementsHidden={!expanded}
      importantForAccessibility={expanded ? "auto" : "no-hide-descendants"}
    >
      <Animated.View
        style={[styles.section, contentStyle]}
        onLayout={({ nativeEvent }) => { contentHeight.value = nativeEvent.layout.height; }}
      >
        <View style={shared.header}>
          <View style={shared.headerText}>
            <Text accessibilityRole="header" style={[shared.heading, styles.heading]}>
              {t("courseLetterHints.profileTitle")}
            </Text>
            <Text style={shared.description}>
              {preventWidowsPl(t("courseLetterHints.profileSubtitle"))}
            </Text>
          </View>
        </View>
        <View style={shared.grid}>
          {(["gentle", "standard", "stronger", "custom"] as const).map((profile) => {
            const selected = settings.profile === profile;
            const preset = profile === "custom" ? null : LETTER_HINT_PRESETS[profile];
            const limits = preset ? [preset.boxOneLimit, preset.boxTwoLimit].map((count, box) => (
              count === 0
                ? t("courseLetterHints.summaryNoHint", { box: box + 1 })
                : t("courseLetterHints.summaryLimit", { box: box + 1, count })
            )) : [];
            return (
              <Pressable
                key={profile}
                accessible
                accessibilityRole="radio"
                accessibilityLabel={t(`courseLetterHints.profiles.${profile}`)}
                accessibilityHint={preset ? limits.join(". ") : t("courseLetterHints.customDescription")}
                accessibilityState={{ checked: selected, disabled }}
                disabled={disabled}
                onPress={disabled ? undefined : () => onChange(selectLetterHintProfile(settings, profile))}
                style={({ pressed }) => [
                  shared.card,
                  styles.profileCard,
                  selected && shared.tealSelected,
                  selected && styles.selectedCard,
                  disabled && shared.disabled,
                  pressed && shared.pressed,
                ]}
              >
                {selected ? (
                  <View
                    pointerEvents="none"
                    accessible={false}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    style={[shared.selectedTint, shared.tealSelectedTint]}
                  />
                ) : null}
                <View style={styles.profileText}>
                  <Text style={titleStyle}>{t(`courseLetterHints.profiles.${profile}`)}</Text>
                  {preset ? (
                    <View style={styles.limitSummary}>
                      {limits.map((label, box) => (
                        <Text key={box} style={detailStyle}>{label}</Text>
                      ))}
                    </View>
                  ) : (
                    <Text style={detailStyle}>{t("courseLetterHints.customDescription")}</Text>
                  )}
                </View>
                <View
                  accessible={false}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  style={[shared.selectionCircle, selected && shared.tealCircle]}
                >
                  {selected ? <Ionicons name="checkmark" size={15} style={shared.tealCheck} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        {settings.profile === "custom" ? (
          <View style={[styles.customSection, disabled && shared.disabled]}>
            {(["boxOneLimit", "boxTwoLimit"] as const).map((field, box) => (
              <View key={field} style={styles.customControl}>
                <Text style={titleStyle}>{t("courseLetterHints.customBoxLabel", { box: box + 1 })}</Text>
                <View style={[styles.segments, { borderColor: colors.border, backgroundColor: colors.secondBackground }]}>
                  {[0, 1, 2, 3].map((limit) => {
                    const selected = settings[field] === limit;
                    return (
                      <Pressable
                        key={limit}
                        accessibilityRole="button"
                        accessibilityLabel={t("courseLetterHints.limitLabel", { box: box + 1, count: limit })}
                        accessibilityState={{ selected, disabled }}
                        disabled={disabled}
                        onPress={() => onChange({ ...settings, profile: "custom", [field]: limit })}
                        style={[styles.segment, selected && { backgroundColor: colors.my_green }]}
                      >
                        <Text style={[titleStyle, styles.limitValue, { color: selected ? colors.font : colors.headline }]}>{limit}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
            <Text style={detailStyle}>{t("courseLetterHints.zeroNote")}</Text>
          </View>
        ) : null}

        <View style={styles.explanation}>
          <Text style={detailStyle}>{preventWidowsPl(t("courseLetterHints.limitsNote"))}</Text>
          <Text style={detailStyle}>{preventWidowsPl(t("courseLetterHints.safetyDescription"))}</Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  reveal: { overflow: "hidden" },
  section: { top: 0, left: 0, right: 0, gap: 14, paddingTop: 8, paddingBottom: 16 },
  heading: { textTransform: "none" },
  profileCard: {
    flex: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderWidth: 1,
  },
  selectedCard: { borderWidth: 2 },
  profileText: { flex: 1, minWidth: 0, gap: 5 },
  limitSummary: { gap: 2 },
  limitValue: { fontVariant: ["tabular-nums"] },
  customSection: { gap: 12, paddingTop: 6 },
  customControl: { gap: 6 },
  segments: { flexDirection: "row", gap: 4, padding: 4, borderWidth: 1, borderRadius: 12 },
  segment: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 8 },
  explanation: { gap: 10 },
});
