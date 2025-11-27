import MyButton from "@/src/components/button/button";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useStyles } from "@/src/screens/settings/SettingsScreen-styles";
import { exportAndShareUserData } from "@/src/services/exportUserData";
import { importUserData } from "@/src/services/importUserData";
import { setOnboardingCheckpoint } from "@/src/services/onboardingCheckpoint";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Text, View } from "react-native";

const CoursesDataSection: React.FC = () => {
  const styles = useStyles();
  const router = useRouter();
  const { resetLearningSettings } = useSettings();
  const [resettingOnboarding, setResettingOnboarding] = useState(false);
  const [resettingLearning, setResettingLearning] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [importingData, setImportingData] = useState(false);

  const handleExportUserData = async () => {
    setExportingData(true);
    try {
      const result = await exportAndShareUserData();
      const sizeKb = (result.bytesWritten / 1024).toFixed(1);
      const shareNote = result.sharingSupported
        ? "Otworzyłem okno udostępniania — wybierz Zapisz/Podziel się lub anuluj."
        : "Udostępnianie systemowe jest niedostępne na tej platformie. Skopiuj plik ręcznie.";
      Alert.alert(
        "Eksport zapisany",
        `Zapisano do pliku:\n${result.fileUri}\n\nRozmiar: ${sizeKb} kB\n\n${shareNote}`
      );
    } catch (error) {
      console.error("[CoursesDataSection] export error", error);
      Alert.alert("Błąd", "Nie udało się wyeksportować danych użytkownika.");
    } finally {
      setExportingData(false);
    }
  };

  const handleImportUserData = async () => {
    setImportingData(true);
    try {
      const result = await importUserData();
      if (result.success) {
        const stats = result.stats;
        Alert.alert(
          "Import zakończony",
          `Pomyślnie zaimportowano dane.\n\n` +
          `Kursy (własne): ${stats?.coursesCreated}\n` +
          `Fiszki (własne): ${stats?.flashcardsCreated}\n` +
          `Postęp (własne): ${stats?.reviewsRestored}\n` +
          `Postęp (oficjalne): ${stats?.builtinReviewsRestored}\n` +
          `Stany pudełek: ${stats?.boxesSnapshotsRestored}`
        );
      } else {
        if (result.message !== "Anulowano wybór pliku.") {
          Alert.alert("Błąd importu", result.message);
        }
      }
    } catch (error) {
      console.error("[CoursesDataSection] import error", error);
      Alert.alert("Błąd", "Wystąpił nieoczekiwany błąd podczas importu.");
    } finally {
      setImportingData(false);
    }
  };

  const handleResetOnboarding = async () => {
    setResettingOnboarding(true);
    try {
      await setOnboardingCheckpoint("pin_required");
      await AsyncStorage.removeItem("@flashcards_intro_seen_v1");
      Alert.alert(
        "Intro włączone",
        "Przekierowuję do przypięcia kursu.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/createcourse"),
          },
        ],
        { cancelable: true }
      );
    } catch {
      Alert.alert("Błąd", "Nie udało się ustawić stanu intro.");
    } finally {
      setResettingOnboarding(false);
    }
  };

  const handleResetLearningSettings = () => {
    Alert.alert(
      "Przywróć ustawienia nauki",
      "Przywróć domyślne ustawienia (spellcheck, ogonki, miny pudełek, layout, batch, przypomnienia)?",
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Przywróć",
          style: "default",
          onPress: async () => {
            setResettingLearning(true);
            try {
              await resetLearningSettings();
              Alert.alert("Gotowe", "Ustawienia nauki przywrócone.");
            } catch {
              Alert.alert("Błąd", "Nie udało się przywrócić ustawień nauki.");
            } finally {
              setResettingLearning(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionHeader}>Inne</Text>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>Eksportuj dane użytkownika</Text>
          <Text style={styles.rowSubtitle}>
            Postępy w kursach, pudełka i własne kursy zostaną zapisane do pliku JSON w pamięci urządzenia.
          </Text>
        </View>
        <MyButton
          text={exportingData ? "Eksportuję..." : "Eksportuj"}
          color="my_green"
          onPress={handleExportUserData}
          disabled={exportingData}
          width={160}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>Importuj dane użytkownika</Text>
          <Text style={styles.rowSubtitle}>
            Wczytaj postępy i kursy z pliku JSON.
          </Text>
        </View>
        <MyButton
          text={importingData ? "Importuję..." : "Importuj"}
          color="my_green"
          onPress={handleImportUserData}
          disabled={importingData}
          width={160}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>Przywróć ustawienia nauki</Text>
          <Text style={styles.rowSubtitle}>
            Spellcheck, diakrytyki, miny pudełek, layout, batch size, przypomnienia.
          </Text>
        </View>
        <MyButton
          text={resettingLearning ? "Przywracam..." : "Przywróć domyślne"}
          color="my_yellow"
          onPress={handleResetLearningSettings}
          disabled={resettingLearning}
          width={160}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>Włącz intro od nowa</Text>
          <Text style={styles.rowSubtitle}>
            Zresetuj onboarding i przejdź do przypięcia kursu.
          </Text>
        </View>
        <MyButton
          text={resettingOnboarding ? "Ustawiam..." : "Uruchom intro"}
          color="my_green"
          onPress={handleResetOnboarding}
          disabled={resettingOnboarding}
          width={160}
        />
      </View>
    </View>
  );
};

export default CoursesDataSection;
