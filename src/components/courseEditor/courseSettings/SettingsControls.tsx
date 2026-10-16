import ToggleRow from "@/src/components/toggle/ToggleRow";
import { preventWidowsPl } from "@/src/utils/preventWidowsPl";
import { Pressable, Text, View } from "react-native";
export type SharedStyles = {
  sectionGroup: object;
  switch: object;
  settingsSectionHeader: object;
  settingsGroupLabel: object;
  settingsGroupCard: object;
  settingsGroupRows: object;
  settingsGroupRow: object;
  settingsGroupDivider: object;
  settingsRowText: object;
  settingsRowTitle: object;
  settingsRowDescription: object;
  settingsDependentRow: object;
  settingsDependentRowDisabled: object;
  settingsChoiceBlock: object;
  settingsChoiceHeader: object;
  settingsChoiceTitle: object;
  settingsChoiceDescription: object;
  settingsChoiceHint: object;
  settingsChoiceGrid: object;
  settingsChoiceOption: object;
  settingsChoiceOptionActive: object;
  settingsChoiceOptionDisabled: object;
  settingsChoiceOptionTitle: object;
  settingsChoiceOptionDescription: object;
};
type ToggleRowProps = {
  styles: SharedStyles;
  title: string;
  description: string;
  value: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
  dependent?: boolean;
  dimmed?: boolean;
};

type ChoiceOption<T extends string> = {
  key: T;
  title: string;
  subtitle: string;
};
type ChoiceBlockProps<T extends string> = {
  styles: SharedStyles;
  title: string;
  description: string;
  hint?: string;
  footer?: string;
  options: ChoiceOption<T>[];
  value: T;
  onSelect?: (value: T) => void;
  disabled?: boolean;
  titleStyle?: object;
  accessibilityLabelPrefix?: string;
};

export function SettingsToggleRow({
  styles,
  title,
  description,
  value,
  onPress,
  accessibilityLabel,
  disabled = false,
  dependent = false,
  dimmed = false,
}: ToggleRowProps) {
  return (
    <ToggleRow
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={description}
      style={[
        styles.settingsGroupRow,
        dependent && styles.settingsDependentRow,
        dimmed && styles.settingsDependentRowDisabled,
      ]}
      value={value}
      controlStyle={styles.switch}
    >
      <View style={styles.settingsRowText}>
        <Text style={styles.settingsRowTitle}>{title}</Text>
        <Text style={styles.settingsRowDescription}>
          {preventWidowsPl(description)}
        </Text>
      </View>
    </ToggleRow>
  );
}

export function SettingsChoiceBlock<T extends string>({
  styles,
  title,
  description,
  hint,
  options,
  value,
  onSelect,
  disabled = false,
  titleStyle,
  accessibilityLabelPrefix,
  footer,
}: ChoiceBlockProps<T>) {
  return (
    <View style={styles.settingsChoiceBlock}>
      <View style={styles.settingsChoiceHeader}>
        <Text style={titleStyle ?? styles.settingsChoiceTitle}>{title}</Text>
        {description ? (
          <Text style={styles.settingsChoiceDescription}>
            {preventWidowsPl(description)}
          </Text>
        ) : null}
        {hint ? (
          <Text style={styles.settingsChoiceHint}>{preventWidowsPl(hint)}</Text>
        ) : null}
      </View>
      <View style={styles.settingsChoiceGrid}>
        {options.map((option) => {
          const isActive = value === option.key;
          return (
            <Pressable
              key={option.key}
              style={[
                styles.settingsChoiceOption,
                isActive && styles.settingsChoiceOptionActive,
                disabled && styles.settingsChoiceOptionDisabled,
              ]}
              onPress={
                disabled || !onSelect ? undefined : () => onSelect(option.key)
              }
              disabled={disabled || !onSelect}
              accessibilityRole="button"
              accessibilityLabel={
                accessibilityLabelPrefix
                  ? `${accessibilityLabelPrefix}: ${option.title}`
                  : undefined
              }
              accessibilityHint={option.subtitle || undefined}
              accessibilityState={{
                disabled: disabled || !onSelect,
                selected: isActive,
              }}
            >
              <Text style={styles.settingsChoiceOptionTitle}>
                {option.title}
              </Text>
              {option.subtitle ? (
                <Text style={styles.settingsChoiceOptionDescription}>
                  {preventWidowsPl(option.subtitle)}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      {footer ? (
        <Text style={styles.settingsChoiceDescription}>
          {preventWidowsPl(footer)}
        </Text>
      ) : null}
    </View>
  );
}
