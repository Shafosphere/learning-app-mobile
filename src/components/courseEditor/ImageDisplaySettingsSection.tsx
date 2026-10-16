import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { useTranslation } from "react-i18next";
import { useThemeSettings } from "@/src/contexts/SettingsContext";
import type { CourseFrontImageRole } from "@/src/contexts/settings/types";
import { preventWidowsPl } from "@/src/utils/preventWidowsPl";
import { SettingsChoiceCard } from "./SettingsChoiceCard";
import { useStyles } from "./SettingsChoiceCard-styles";

type Props = {
  value: CourseFrontImageRole;
  onSelect: (value: CourseFrontImageRole) => void;
  disabled: boolean;
};

const COPY = "courseFrontImageRole";

export function ImageDisplaySettingsSection({ value, onSelect, disabled }: Props) {
  const { t } = useTranslation();
  const styles = useStyles();
  const { width, fontScale } = useWindowDimensions();
  const { fontScaleMultiplier } = useThemeSettings();
  const [contentWidth, setContentWidth] = useState<number>();
  // Measure the available section width, including on tablets and in split-screen.
  // Account for both the app's text size preference and Android's font scaling.
  const stacked = (contentWidth ?? width - 32) < 284 * fontScale * fontScaleMultiplier;

  const renderOption = (role: CourseFrontImageRole) => (
    <SettingsChoiceCard
      key={role}
      title={t(`${COPY}.${role}.title`)}
      description={t(`${COPY}.${role}.description`)}
      accessibilityLabel={`${t(`${COPY}.title`)}: ${t(`${COPY}.${role}.title`)}`}
      accessibilityHint={t(`${COPY}.${role}.description`)}
      icon="image"
      accent="teal"
      selected={value === role}
      onPress={() => onSelect(role)}
      disabled={disabled}
      emphasizeSelectedBorder
    />
  );

  return (
    <View
      style={styles.section}
      onLayout={({ nativeEvent }) => setContentWidth(nativeEvent.layout.width)}
      testID="course-image-display-settings"
    >
      <View style={styles.header}>
        <View
          style={[styles.headerIcon, styles.tealTint]}
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Ionicons name="image-outline" size={21} style={styles.tealIcon} />
        </View>
        <View style={styles.headerText}>
          <Text accessibilityRole="header" style={styles.heading}>{t(`${COPY}.title`)}</Text>
          <Text style={styles.description}>{preventWidowsPl(t(`${COPY}.description`))}</Text>
        </View>
      </View>
      <View style={styles.grid}>
        <View testID="course-image-display-first-row" style={[styles.row, stacked && styles.stackedRow]}>
          {renderOption("standard")}
          {renderOption("replace_front")}
        </View>
        <View style={styles.row}>{renderOption("replace_back")}</View>
      </View>
      <View style={styles.informationNote}>
        <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Ionicons name="information-circle-outline" size={20} style={styles.neutralIcon} />
        </View>
        <Text style={[styles.hint, styles.informationText]}>
          {preventWidowsPl(t(`${COPY}.answerNote`))}
        </Text>
      </View>
    </View>
  );
}
