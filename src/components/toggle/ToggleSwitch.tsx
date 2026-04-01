import { Pressable, View } from "react-native";
import { useStyles } from "./ToggleSwitch-styles";

type ToggleSwitchProps = {
  value: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  disabled?: boolean;
};

export default function ToggleSwitch({
  value,
  onPress,
  accessibilityLabel,
  disabled = false,
}: ToggleSwitchProps) {
  const styles = useStyles();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.toggle,
        value ? styles.toggleActive : styles.toggleInactive,
        disabled ? { opacity: 0.6 } : null,
      ]}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      hitSlop={8}
    >
      <View
        style={[
          styles.toggleThumb,
          value ? styles.toggleThumbActive : styles.toggleThumbInactive,
        ]}
      />
    </Pressable>
  );
}
