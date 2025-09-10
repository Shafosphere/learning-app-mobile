// index.tsx
import { useEffect } from "react";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import MyButton from "@/src/components/button/button";
import { getDueReviews, getLanguagePairs } from "@/src/components/db/db";

export default function Index() {
  const router = useRouter();
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const pairs = await getLanguagePairs();
        if (pairs.length === 0) return;
        const { source_id, target_id } = pairs[0];
        const due = await getDueReviews(source_id, target_id, Date.now());
        if (mounted && due && due.length > 0) {
          router.push("/review");
        }
      } catch (e) {
        // Silently ignore optional review redirect errors
      } finally {
        // noop
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

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
