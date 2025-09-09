// index.tsx
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import MyButton from "@/src/components/button/button";

export default function Index() {
  const router = useRouter();

  const goToProfilPanel = () => {
    router.push("/profilpanel");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hejka!</Text>
      <Text style={styles.text}>Stwórz swój pierwszy profil!</Text>
      <MyButton text="Przejdź do profilu" onPress={goToProfilPanel} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 30,
    // justifyContent: "center",
    alignItems: "flex-end",
  },
  text: {
    textAlign: "left",
    width: "100%",
    fontSize: 24,
    fontWeight: "bold",
  },
});
