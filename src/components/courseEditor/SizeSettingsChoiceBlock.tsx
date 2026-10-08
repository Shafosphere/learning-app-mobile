import Ionicons from "@expo/vector-icons/Ionicons";
import { Text, View } from "react-native";
import { preventWidowsPl } from "@/src/utils/preventWidowsPl";
import { useStyles } from "./SettingsChoiceCard-styles";
import { SettingsChoiceCard } from "./SettingsChoiceCard";

const IMAGE_ICON_SIZES: Record<string, number> = {
  small: 20,
  medium: 24,
  very_large: 32,
};

type SizeSettingsChoiceBlockProps<T extends string> = {
  title: string;
  description: string;
  hint?: string;
  kind: "flashcard" | "image";
  options: { key: T; title: string; subtitle: string }[];
  value: T;
  onSelect?: (value: T) => void;
  disabled?: boolean;
  fullWidthOption?: T;
  separated?: boolean;
};

export function SizeSettingsChoiceBlock<T extends string>({
  title,
  description,
  hint,
  kind,
  options,
  value,
  onSelect,
  disabled = false,
  fullWidthOption,
  separated = false,
}: SizeSettingsChoiceBlockProps<T>) {
  const styles = useStyles();
  const isImage = kind === "image";
  const isDisabled = disabled || !onSelect;
  const accentIcon = isImage ? styles.tealIcon : styles.blueIcon;
  const accentTint = isImage ? styles.tealTint : styles.blueTint;
  const rows: (typeof options)[] = [];

  // Explicit rows keep siblings equally tall without measuring text or fixing heights.
  for (const option of options) {
    const previousRow = rows[rows.length - 1];
    if (
      option.key !== fullWidthOption &&
      previousRow?.length === 1 &&
      previousRow[0].key !== fullWidthOption
    ) {
      previousRow.push(option);
    } else {
      rows.push([option]);
    }
  }

  return (
    <View style={[styles.section, separated && styles.separatedSection]}>
      <View style={styles.header}>
        <View
          style={[styles.headerIcon, accentTint]}
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Ionicons
            name={isImage ? "image-outline" : "document-outline"}
            size={21}
            style={accentIcon}
          />
        </View>
        <View style={styles.headerText}>
          <Text accessibilityRole="header" style={styles.heading}>
            {title}
          </Text>
          <Text style={styles.description}>{preventWidowsPl(description)}</Text>
          {hint ? <Text style={styles.hint}>{preventWidowsPl(hint)}</Text> : null}
        </View>
      </View>
      <View style={styles.grid}>
        {rows.map((row) => (
          <View key={row[0].key} style={styles.row}>
            {row.map((option) => (
              <SettingsChoiceCard
                key={option.key}
                title={option.title}
                description={option.subtitle}
                accessibilityLabel={`${title}, ${option.title}, ${option.subtitle}`}
                icon={isImage ? "image" : option.key === "small" ? "reader-outline" : "document-text-outline"}
                iconSize={isImage ? IMAGE_ICON_SIZES[option.key] ?? 28 : 26}
                accent={isImage ? "teal" : "blue"}
                selected={value === option.key}
                disabled={isDisabled}
                onPress={onSelect ? () => onSelect(option.key) : undefined}
                wide={option.key === fullWidthOption}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}
