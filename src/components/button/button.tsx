import { ReactNode } from "react";
import {
  DimensionValue,
  Pressable,
  StyleProp,
  Text,
  TextStyle,
  ViewStyle,
} from "react-native";
import { useSettings } from "@/src/contexts/SettingsContext";
import { ThemeColorKey } from "@/src/theme/theme";
import { useStyles } from "./button-styles";

interface MyButtonBaseProps {
  onPress?: () => void;
  color?: ThemeColorKey;
  disabled?: boolean;
  width?: DimensionValue;
  textLines?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  pressedStyle?: StyleProp<ViewStyle>;
}

type MyButtonProps =
  | (MyButtonBaseProps & { text: string; children?: ReactNode })
  | (MyButtonBaseProps & { text?: string; children: ReactNode });

export default function MyButton({
  text,
  children,
  onPress,
  color = "my_green",
  disabled = false,
  width = 130,
  textLines = 1,
  accessibilityLabel,
  style,
  textStyle,
  pressedStyle,
}: MyButtonProps) {
  const styles = useStyles();
  const { colors } = useSettings();
  const derivedLabel =
    accessibilityLabel ?? (typeof text === "string" ? text : undefined);
  const backgroundColor = disabled ? colors.border : colors[color];

  const renderContent = (pressed: boolean) => {
    if (children) return children;
    if (text === undefined) return null;

    const textColor =
      color === "my_yellow" && !disabled
        ? pressed
          ? colors.headline
          : colors.font
        : colors.headline;

    return (
      <Text
        style={[styles.text, { color: textColor }, textStyle]}
        allowFontScaling={false}
        numberOfLines={textLines}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
      >
        {text}
      </Text>
    );
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={derivedLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        { width, backgroundColor },
        !disabled && pressed && (pressedStyle ?? styles.pressed),
        style,
      ]}
    >
      {({ pressed }) => renderContent(pressed)}
    </Pressable>
  );
}

{/* <MyButton text="Confirm" color="my_green" onPress={} disabled={false} />; */}
