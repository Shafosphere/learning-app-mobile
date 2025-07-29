// index.tsx
import { useRouter } from "expo-router";
import { ActivityIndicator, Button, StyleSheet, Text, View } from "react-native";
import { getRandomEnglishWord, logTableContents } from "@/src/components/db/db"; // Dodaj import
import { useEffect, useState } from "react";

export default function Index() {
  const router = useRouter();
  const [word, setWord] = useState<string | null>(null);

  useEffect(() => {
    getRandomEnglishWord()
      .then((w) => setWord(w))
      .catch((err) => {
        console.error("Błąd pobierania słowa:", err);
        setWord("…");
      });
  }, []);

  const handleLogTables = async () => {
    try {
      await logTableContents();
    } catch (error) {
      console.error("Błąd logowania tabel:", error);
    }
  };

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
      <Button title="Sprawdź tabele" onPress={handleLogTables} />
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