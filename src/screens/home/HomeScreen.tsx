// index.tsx
import MyButton from "@/src/components/button/button";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import { styles } from "./HomeScreen-styles";

export default function HomeScreen() {
  const router = useRouter();

  const goToCoursePanel = () => {
    router.push("/coursepanel");
  };

  const goToStats = () => {
    router.push("/stats");
  };

  const goToCustomCourse = () => {
    router.push("/custom_course");
  };

  const goToWiki = () => {
    router.push("/wiki");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hejka!</Text>
      <Text style={styles.text}>
        Stwórz swój pierwszy kurs i własny zestaw fiszek!
      </Text>
      <View style={styles.buttons}>
        <MyButton text="Kursy" onPress={goToCoursePanel} width={140} />
        <MyButton text="Statystyki" onPress={goToStats} width={140} />
        <MyButton
          text="Własne fiszki"
          onPress={goToCustomCourse}
          width={140}
        />
        <MyButton text="Pomoc" onPress={goToWiki} width={140} color="my_yellow" />
      </View>
    </View>
  );
}
