import { useRouter } from "expo-router";
import { styles } from "./styles_navbar";
import { Text, TouchableOpacity, View } from "react-native";

export default function Navbar() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.push("/")}>
        <Text style={styles.link}>Home</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push("/settings")}>
        <Text style={styles.link}> Settings</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push("/flashcards")}>
        <Text style={styles.link}> Flashcards</Text>
      </TouchableOpacity>
    </View>
  );
}
