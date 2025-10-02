+ 21- 0
import { View, Text } from "react-native";
import { useStyles } from "./popup-styles";
import { useSettings } from "@/src/contexts/SettingsContext";

export type PopupColor = "my_green" | "my_red" | "my_yellow";

interface PopupProps {
  message: string;
  color: PopupColor;
}

export default function Popup({ message, color }: PopupProps) {
  const styles = useStyles();
  const { colors } = useSettings();

  return (
    <View style={[styles.container, { backgroundColor: colors[color] }]}> 
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}
