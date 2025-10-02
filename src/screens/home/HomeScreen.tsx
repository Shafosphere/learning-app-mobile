// index.tsx
import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import { styles } from "./HomeScreen-styles";
import MyButton from "@/src/components/button/button";

export default function HomeScreen() {
  const router = useRouter();

  const goToProfilPanel = () => {
    router.push("/profilpanel");
  };

  const goToStats = () => {
    router.push("/stats");
  };

  const goToCustomProfile = () => {
    router.push("/custom_profile");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hejka!</Text>
      <Text style={styles.text}>
        Stwórz swój pierwszy profil i własny zestaw fiszek!
      </Text>
      <View style={styles.buttons}>
        <MyButton text="Profil" onPress={goToProfilPanel} width={140} />
        <MyButton text="Statystyki" onPress={goToStats} width={140} />
        <MyButton
          text="Własne fiszki"
          onPress={goToCustomProfile}
          width={140}
        />
      </View>
    </View>
  );
}
