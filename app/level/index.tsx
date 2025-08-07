import { Pressable, Text, TouchableOpacity, View } from "react-native";
import { useStyles } from "@/src/screens/level/styles_level";
import { useRouter } from "expo-router";
import { useSettings } from "@/src/contexts/SettingsContext";

export default function Level() {
  const { setLevel } = useSettings();
  const styles = useStyles();
  const router = useRouter();
  const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
  return (
    <View style={styles.container}>
      <View style={styles.minicontainer}>
        {levels.map((item, index) => (
          <Pressable
            onPress={() => [setLevel(item), router.push("/flashcards")]}
            style={styles.tile}
            key={index}
          >
            <Text style={styles.level}>{item}</Text>
          </Pressable>
        ))}
        <Text style={styles.choose}>Wybierz poziom</Text>
      </View>
    </View>
  );
}
