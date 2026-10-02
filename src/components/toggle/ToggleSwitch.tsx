import { Pressable, View } from "react-native";
import { useStyles } from "./ToggleSwitch-styles";

type ToggleSwitchProps = {
  value: boolean;
  disabled?: boolean;
} & (
  | { onPress: () => void; accessibilityLabel?: string; decorative?: false }
  | { decorative: true; onPress?: never; accessibilityLabel?: never }
);

export default function ToggleSwitch({
  value,
  onPress,
  accessibilityLabel,
  disabled = false,
  decorative = false,
}: ToggleSwitchProps) {
  const styles = useStyles();
  const toggleStyle = [
    styles.toggle,
    value ? styles.toggleActive : styles.toggleInactive,
    disabled ? { opacity: 0.6 } : null,
  ];
  const thumb = (
    <View
      style={[
        styles.toggleThumb,
        value ? styles.toggleThumbActive : styles.toggleThumbInactive,
      ]}
    />
  );

  if (decorative) {
    return (
      <View
        style={toggleStyle}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {thumb}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={toggleStyle}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      hitSlop={8}
    >
      {thumb}
    </Pressable>
  );
}
