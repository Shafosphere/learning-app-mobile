import type { ReactNode } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import ToggleSwitch from "./ToggleSwitch";

export type ToggleRowProps = {
  value: boolean;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel: string;
  accessibilityHint?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  controlStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
};

export default function ToggleRow({
  value,
  onPress,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  testID,
  style,
  controlStyle,
  children,
}: ToggleRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessible
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ checked: value, disabled }}
      testID={testID}
      style={style}
    >
      {children}
      <View style={controlStyle} pointerEvents="none">
        <ToggleSwitch value={value} disabled={disabled} decorative />
      </View>
    </Pressable>
  );
}
