import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";
import { preventWidowsPl } from "@/src/utils/preventWidowsPl";
import { useStyles } from "./SettingsChoiceCard-styles";

type SettingsChoiceCardProps = {
  title: string;
  description: string;
  accessibilityLabel: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  iconSize?: number;
  accent: "blue" | "teal";
  selected: boolean;
  onPress?: () => void;
  disabled?: boolean;
  wide?: boolean;
  emphasizeSelectedBorder?: boolean;
};

export function SettingsChoiceCard({
  title,
  description,
  accessibilityLabel,
  icon,
  iconSize = 26,
  accent,
  selected,
  onPress,
  disabled = false,
  wide = false,
  emphasizeSelectedBorder = false,
}: SettingsChoiceCardProps) {
  const styles = useStyles();
  const isDisabled = disabled || !onPress;
  const isTeal = accent === "teal";
  const accentIcon = isTeal ? styles.tealIcon : styles.blueIcon;
  const accentTint = isTeal ? styles.tealTint : styles.blueTint;
  const optionIcon = (
    <View
      style={[styles.optionIcon, selected && accentTint]}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Ionicons name={icon} size={iconSize} style={selected ? accentIcon : styles.neutralIcon} />
    </View>
  );
  const circle = (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.selectionCircle,
        selected && (isTeal ? styles.tealCircle : styles.blueCircle),
        wide && styles.wideCircle,
      ]}
    >
      {selected ? (
        <Ionicons name="checkmark" size={15} style={isTeal ? styles.tealCheck : styles.blueCheck} />
      ) : null}
    </View>
  );

  return (
    <Pressable
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.card,
        emphasizeSelectedBorder && styles.thinCardBorder,
        selected && (isTeal ? styles.tealSelected : styles.blueSelected),
        selected && emphasizeSelectedBorder && styles.selectedCardBorder,
        isDisabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {selected ? (
        <View
          pointerEvents="none"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.selectedTint, isTeal ? styles.tealSelectedTint : styles.blueSelectedTint]}
        />
      ) : null}
      <View style={[styles.cardBody, wide && styles.wideBody]}>
        {wide ? optionIcon : (
          <View style={styles.visuals}>
            {optionIcon}
            {circle}
          </View>
        )}
        <View style={[styles.optionText, wide && styles.wideText]}>
          <Text style={styles.optionTitle}>{title}</Text>
          <Text style={styles.optionDescription}>{preventWidowsPl(description)}</Text>
        </View>
      </View>
      {wide ? circle : null}
    </Pressable>
  );
}
