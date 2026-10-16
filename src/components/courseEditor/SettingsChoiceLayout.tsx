import Ionicons from "@expo/vector-icons/Ionicons";
import { useState, type ComponentProps, type ReactNode } from "react";
import {
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type TextStyle,
} from "react-native";
import { useThemeSettings } from "@/src/contexts/SettingsContext";
import { preventWidowsPl } from "@/src/utils/preventWidowsPl";
import { useStyles } from "./SettingsChoiceCard-styles";

export function SettingsChoiceHeader({
  title,
  description,
  hint,
  icon,
  accent = "teal",
  titleStyle,
}: {
  title: string;
  description: string;
  hint?: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  accent?: "blue" | "teal";
  titleStyle?: StyleProp<TextStyle>;
}) {
  const styles = useStyles();
  return (
    <View style={styles.header}>
      <View
        style={[
          styles.headerIcon,
          accent === "teal" ? styles.tealTint : styles.blueTint,
        ]}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Ionicons
          name={icon}
          size={21}
          style={accent === "teal" ? styles.tealIcon : styles.blueIcon}
        />
      </View>
      <View style={styles.headerText}>
        <Text accessibilityRole="header" style={[styles.heading, titleStyle]}>
          {title}
        </Text>
        <Text style={styles.description}>{preventWidowsPl(description)}</Text>
        {hint ? <Text style={styles.hint}>{preventWidowsPl(hint)}</Text> : null}
      </View>
    </View>
  );
}

// Measure the container, rather than assuming window width on tablets/split-screen.

export function useSettingsChoiceLayout(minTwoColumnWidth = 284) {
  const { width, fontScale } = useWindowDimensions();
  const { fontScaleMultiplier } = useThemeSettings();
  const [contentWidth, setContentWidth] = useState<number>();
  return {
    stacked:
      (contentWidth ?? width - 32) <
      minTwoColumnWidth * fontScale * fontScaleMultiplier,
    onLayout: ({
      nativeEvent,
    }: Parameters<NonNullable<ComponentProps<typeof View>["onLayout"]>>[0]) =>
      setContentWidth(nativeEvent.layout.width),
  };
}

export function SettingsChoiceGrid<T extends string>({
  options,
  renderOption,
  fullWidthOption,
  stacked,
  firstRowTestID,
}: {
  options: readonly T[];
  renderOption: (value: T) => ReactNode;
  fullWidthOption?: T;
  stacked: boolean;
  firstRowTestID?: string;
}) {
  const styles = useStyles();
  const rows: T[][] = [];
  for (const option of options) {
    const previous = rows[rows.length - 1];
    if (
      option !== fullWidthOption &&
      previous?.length === 1 &&
      previous[0] !== fullWidthOption
    ) {
      previous.push(option);
    } else {
      rows.push([option]);
    }
  }
  return (
    <View style={styles.grid}>
      {rows.map((row, index) => (
        <View
          key={row[0]}
          testID={index === 0 ? firstRowTestID : undefined}
          style={[styles.row, stacked && styles.stackedRow]}
        >
          {row.map((option) => (
            <View key={option} style={styles.gridCell}>
              {renderOption(option)}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
