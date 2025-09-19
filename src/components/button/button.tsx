import { Pressable, Text } from "react-native";
import { useStyles } from "./styles_button";
import { useSettings } from "@/src/contexts/SettingsContext";
import { ThemeColorKey } from "@/src/theme/theme";

interface MyButtonProps {
  text: string;
  onPress?: () => void;
  color?: ThemeColorKey;
  disabled?: boolean;
  width?: number;
  accessibilityLabel?: string;
}

export default function MyButton({
  text,
  onPress,
  color = "my_green",
  disabled = false,
  width = 130,
  accessibilityLabel,
}: MyButtonProps) {
  const styles = useStyles();
  const { colors } = useSettings();
  const derivedLabel = accessibilityLabel ?? text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={derivedLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        { width, backgroundColor: colors[color] },
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.text} allowFontScaling>
        {text}
      </Text>
    </Pressable>
  );
}

{/* <MyButton text="Confirm" color="my_green" onPress={} disabled={false} />; */}
