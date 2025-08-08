import { Pressable, Text } from "react-native";
import { useStyles } from "./styles_button";
import { useSettings } from "@/src/contexts/SettingsContext";
import { ThemeColors } from "@/src/theme/theme";

interface MyButtonProps {
  text: string;
  onPress?: () => void;
  color?: keyof ThemeColors;
  disabled?: boolean;
  width?: number;
}

export default function MyButton({
  text,
  onPress,
  color = "my_green",
  disabled = false,
  width = 130,
}: MyButtonProps) {
  const styles = useStyles();
  const { colors } = useSettings();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { width, backgroundColor: colors[color] },
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.text}>{text}</Text>
    </Pressable>
  );
}

{/* <MyButton text="Confirm" color="my_green" onPress={} disabled={false} />; */}
