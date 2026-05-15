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
  onPressIn?: () => void;
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
  onPressIn,
  color = "my_green",
  disabled = false,
  width = 130,
  textLines = 2,
  accessibilityLabel,
  style,
  textStyle,
  pressedStyle,
}: MyButtonProps) {
  const styles = useStyles();
  const { colors, highContrastEnabled } = useSettings();
  const derivedLabel =
    accessibilityLabel ?? (typeof text === "string" ? text : undefined);
  const disabledHighContrast = disabled && highContrastEnabled;
  const backgroundColor = disabled
    ? disabledHighContrast
      ? colors.secondBackground
      : colors.border
    : colors[color];

  const renderContent = (pressed: boolean) => {
    if (children) return children;
    if (text === undefined) return null;

    const textColor = disabledHighContrast
      ? colors.paragraph
      : color === "my_yellow" && !disabled
        ? pressed
          ? colors.headline
          : colors.font
        : colors.headline;

    return (
      <Text
        style={[
          styles.text,
          { color: textColor },
          textStyle,
          disabledHighContrast && { color: textColor },
        ]}
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
      onPressIn={onPressIn}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={derivedLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        { width, backgroundColor },
        disabledHighContrast && {
          borderColor: colors.border,
          borderWidth: 2,
        },
        !disabled && pressed && (pressedStyle ?? styles.pressed),
        style,
      ]}
    >
      {({ pressed }) => renderContent(pressed)}
    </Pressable>
  );
}

{/* <MyButton text="Confirm" color="my_green" onPress={} disabled={false} />; */}
