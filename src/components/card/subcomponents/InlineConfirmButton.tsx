import Octicons from "@expo/vector-icons/Octicons";
import { Pressable, StyleSheet } from "react-native";
import { useSettings } from "@/src/contexts/SettingsContext";

export function InlineConfirmButton({ disabled, label, onPress }: {
  disabled: boolean;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useSettings();
  return (
    <Pressable
      testID="card-inline-confirm"
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, { backgroundColor: colors.my_green, opacity: disabled ? 0.45 : 1 }]}
    >
      <Octicons name="check" size={24} color={colors.font} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Phone answer inputs are 44dp tall. A taller sibling increases the entire
  // input row (and card) as soon as keyboard mode reveals this button.
  button: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
});
