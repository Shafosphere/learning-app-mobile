import React, { useState } from "react";
import { View, Text, Alert, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useStyles } from "@/src/screens/settings/SettingsScreen-styles";
import MyButton from "@/src/components/button/button";
import {
  addRandomCustomReviews,
  addRandomReviewsForPair,
} from "@/src/db/sqlite/db";
import type { CEFRLevel } from "@/src/types/language";
import { HangulKeyboardOverlay } from "@/src/components/hangul/HangulKeyboardOverlay";

const DEBUG_LEVEL: CEFRLevel = "A1";

const DataSection: React.FC = () => {
  const styles = useStyles();
  const router = useRouter();
  const { activeCourse, activeCustomCourseId, colors } = useSettings();
  const [builtInBusy, setBuiltInBusy] = useState(false);
  const [customBusy, setCustomBusy] = useState(false);
  const [hangulValue, setHangulValue] = useState("");
  const [showHangulKeyboard, setShowHangulKeyboard] = useState(false);

  const handleAddRandom = async () => {
    if (!activeCourse?.sourceLangId || !activeCourse?.targetLangId) {
      Alert.alert("Brak kursu", "Wybierz kurs w ustawieniach.");
      return;
    }

    setBuiltInBusy(true);
    try {
      const inserted = await addRandomReviewsForPair(
        activeCourse.sourceLangId,
        activeCourse.targetLangId,
        DEBUG_LEVEL,
        10
      );
      Alert.alert(
        "Dodano",
        inserted > 0
          ? `Dodano ${inserted} słówek do powtórki (${DEBUG_LEVEL}).`
          : "Brak nowych słówek do dodania."
      );
    } catch {
      Alert.alert("Błąd", "Nie udało się dodać słówek.");
    } finally {
      setBuiltInBusy(false);
    }
  };

  const handleAddRandomCustom = async () => {
    if (activeCustomCourseId == null) {
      Alert.alert(
        "Brak kursu",
        "Wybierz własny kurs fiszek w ustawieniach."
      );
      return;
    }

    setCustomBusy(true);
    try {
      const inserted = await addRandomCustomReviews(activeCustomCourseId, 10);
      Alert.alert(
        "Dodano",
        inserted > 0
          ? `Dodano ${inserted} fiszek do powtórek kursu.`
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
      <View style={styles.keyboardSection}>
        <Text style={styles.rowTitle}>Testuj klawiaturę Hangul</Text>
        <Text style={styles.rowSubtitle}>
          Wpisz koreańskie znaki bez systemowej klawiatury.
        </Text>
        <TextInput
          style={[styles.input, styles.keyboardInput]}
          value={hangulValue}
          editable={false}
          placeholder="Kliknij Pokaż, a potem dodawaj znaki"
          placeholderTextColor={colors.paragraph}
        />
        <View style={styles.keyboardActions}>
          <View style={styles.keyboardButtonWrapper}>
            <MyButton
              text={
                showHangulKeyboard ? "Ukryj klawiaturę" : "Pokaż klawiaturę"
              }
              color="my_green"
              onPress={() => setShowHangulKeyboard((prev) => !prev)}
              width={220}
            />
          </View>
          <View style={styles.keyboardButtonWrapper}>
            <MyButton
              text="Wyczyść"
              color="my_red"
              onPress={() => setHangulValue("")}
              disabled={hangulValue.length === 0}
              width={120}
            />
          </View>
        </View>
        <HangulKeyboardOverlay
          visible={showHangulKeyboard}
          value={hangulValue}
          onChangeText={setHangulValue}
          onSubmit={() =>
            Alert.alert(
              "Hangul",
              hangulValue.length > 0
                ? `Wpisałeś: ${hangulValue}`
                : "Brak znaków do zatwierdzenia."
            )
          }
          onRequestClose={() => setShowHangulKeyboard(false)}
        />
      </View>

      <Text style={styles.sectionHeader}>Kurs i dane</Text>

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
          disabled={builtInBusy || !activeCourse}
          onPress={handleAddRandom}
          width={140}
        />
      </View>

      {!activeCourse && (
        <Text style={styles.infoText}>Najpierw wybierz kurs.</Text>
      )}

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>Dodaj customowe powtórki</Text>
          <Text style={styles.rowSubtitle}>
            Wstaw losowe fiszki z aktywnego kursu własnego.
          </Text>
        </View>
        <MyButton
          text={customBusy ? "Dodawanie..." : "Dodaj 10"}
          color="my_green"
          disabled={customBusy || activeCustomCourseId == null}
          onPress={handleAddRandomCustom}
          width={140}
        />
      </View>

      {activeCustomCourseId == null && (
        <Text style={styles.infoText}>
          Najpierw wybierz własny kurs w panelu kursów.
        </Text>
      )}

      <View style={styles.buttonsContainer}>
        <MyButton
          text="Zarządzaj kursami"
          color="my_yellow"
          onPress={() => router.push("/coursepanel")}
          width={220}
        />
      </View>
    </View>
  );
};

export default DataSection;
