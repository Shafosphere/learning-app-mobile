import { useRouter } from "expo-router";
import { ActivityIndicator, Button, StyleSheet, Text, View } from "react-native";
import { getRandomEnglishWord } from "@/src/components/db/db";
import { useEffect, useState } from "react";

export default function Index() {
  const router = useRouter();
  const [word, setWord] = useState<string | null>(null);

  useEffect(() => {
    // pobieramy słowo raz przy montowaniu komponentu
    getRandomEnglishWord()
      .then((w) => setWord(w))
      .catch((err) => {
        console.error("Błąd pobierania słowa:", err);
        setWord("…");
      });
  }, []);

  // pokazujemy loader do czasu, aż word będzie !== null
  if (word === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{word}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 24,
    fontWeight: "bold",
  },
});
