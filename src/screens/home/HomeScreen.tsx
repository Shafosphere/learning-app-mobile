// index.tsx
import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import { styles } from "./HomeScreen-styles";
import MyButton from "@/src/components/button/button";

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
      </View>
    </View>
  );
}
