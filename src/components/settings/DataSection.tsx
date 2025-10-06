import React, { useState } from "react";
import { View, Text, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useStyles } from "@/src/screens/settings/SettingsScreen-styles";
import MyButton from "@/src/components/button/button";
import {
  addRandomCustomReviews,
  addRandomReviewsForPair,
} from "@/src/db/sqlite/db";

const DataSection: React.FC = () => {
  const styles = useStyles();
  const router = useRouter();
  const { activeProfile, selectedLevel, activeCustomProfileId } = useSettings();
  const [builtInBusy, setBuiltInBusy] = useState(false);
  const [customBusy, setCustomBusy] = useState(false);

  const handleAddRandom = async () => {
    if (!activeProfile?.sourceLangId || !activeProfile?.targetLangId) {
      Alert.alert("Brak profilu", "Wybierz profil w ustawieniach.");
      return;
    }

    setBuiltInBusy(true);
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
      setBuiltInBusy(false);
    }
  };

  const handleAddRandomCustom = async () => {
    if (activeCustomProfileId == null) {
      Alert.alert(
        "Brak profilu",
        "Wybierz własny profil fiszek w ustawieniach."
      );
      return;
    }

    setCustomBusy(true);
    try {
      const inserted = await addRandomCustomReviews(activeCustomProfileId, 10);
      Alert.alert(
        "Dodano",
        inserted > 0
          ? `Dodano ${inserted} fiszek do powtórek profilu.`
          : "Brak nowych fiszek do dodania."
      );
    } catch {
      Alert.alert("Błąd", "Nie udało się dodać fiszek.");
    } finally {
      setCustomBusy(false);
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
          text={builtInBusy ? "Dodawanie..." : "Dodaj 10"}
          color="my_green"
          disabled={builtInBusy || !activeProfile}
          onPress={handleAddRandom}
          width={140}
        />
      </View>

      {!activeProfile && (
        <Text style={styles.infoText}>Najpierw wybierz profil.</Text>
      )}

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>Dodaj customowe powtórki</Text>
          <Text style={styles.rowSubtitle}>
            Wstaw losowe fiszki z aktywnego profilu własnego.
          </Text>
        </View>
        <MyButton
          text={customBusy ? "Dodawanie..." : "Dodaj 10"}
          color="my_green"
          disabled={customBusy || activeCustomProfileId == null}
          onPress={handleAddRandomCustom}
          width={140}
        />
      </View>

      {activeCustomProfileId == null && (
        <Text style={styles.infoText}>
          Najpierw wybierz własny profil w panelu profili.
        </Text>
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
