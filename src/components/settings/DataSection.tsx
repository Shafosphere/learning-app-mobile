import React, { useState } from "react";
import { View, Text, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useStyles } from "@/src/screens/settings/styles";
import MyButton from "@/src/components/button/button";
import { addRandomReviewsForPair } from "@/src/components/db/db";

const DataSection: React.FC = () => {
  const styles = useStyles();
  const router = useRouter();
  const { activeProfile, selectedLevel } = useSettings();
  const [busy, setBusy] = useState(false);

  const handleAddRandom = async () => {
    if (!activeProfile?.sourceLangId || !activeProfile?.targetLangId) {
      Alert.alert("Brak profilu", "Wybierz profil w ustawieniach.");
      return;
    }

    setBusy(true);
    try {
      const inserted = await addRandomReviewsForPair(
        activeProfile.sourceLangId,
        activeProfile.targetLangId,
        selectedLevel,
        10
      );
      Alert.alert(
        "Dodano",
        inserted > 0
          ? `Dodano ${inserted} słówek do powtórki (${selectedLevel}).`
          : "Brak nowych słówek do dodania."
      );
    } catch {
      Alert.alert("Błąd", "Nie udało się dodać słówek.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionHeader}>Profil i dane</Text>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>Dodaj fiszki testowe</Text>
          <Text style={styles.rowSubtitle}>
            Przyspiesz testowanie aplikacji, dodając losowe powtórki.
          </Text>
        </View>
        <MyButton
          text={busy ? "Dodawanie..." : "Dodaj 10"}
          color="my_green"
          disabled={busy || !activeProfile}
          onPress={handleAddRandom}
          width={140}
        />
      </View>

      {!activeProfile && (
        <Text style={styles.infoText}>Najpierw wybierz profil.</Text>
      )}

      <View style={styles.buttonsContainer}>
        <MyButton
          text="Zarządzaj profilami"
          color="my_yellow"
          onPress={() => router.push("/profilpanel")}
          width={220}
        />
      </View>
    </View>
  );
};

export default DataSection;
