import MyButton from "@/src/components/button/button";
import { HangulKeyboardOverlay } from "@/src/components/hangul/HangulKeyboardOverlay";
import LogoMessage from "@/src/components/logoMessage/LogoMessage";
import { usePopup } from "@/src/contexts/PopupContext";
import { useQuote } from "@/src/contexts/QuoteContext";
import { useSettings } from "@/src/contexts/SettingsContext";
import {
  addRandomCustomReviews,
} from "@/src/db/sqlite/db";
import { unlockAchievement } from "@/src/db/sqlite/repositories/achievements";
import { useStyles } from "@/src/screens/settings/SettingsScreen-styles";
import { setOnboardingCheckpoint } from "@/src/services/onboardingCheckpoint";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import React, { useState } from "react";
import { Alert, Switch, Text, TextInput, View } from "react-native";

const DebuggingSection: React.FC = () => {
  const styles = useStyles();
  const {
    activeCustomCourseId,
    colors,
    learningRemindersEnabled,
    toggleLearningRemindersEnabled,
    statsBookshelfEnabled,
    toggleStatsBookshelfEnabled,
    statsFireEffectEnabled,
    toggleStatsFireEffectEnabled,
    resetActiveCustomCourseReviews,
  } = useSettings();
  const setPopup = usePopup();
  const { showQuote } = useQuote();
  const [customBusy, setCustomBusy] = useState(false);
  const [hangulValue, setHangulValue] = useState("");
  const [showHangulKeyboard, setShowHangulKeyboard] = useState(false);
  const [showLogoMessage, setShowLogoMessage] = useState(false);
  const [logoFloating, setLogoFloating] = useState(true);
  const [clearingStorage, setClearingStorage] = useState(false);
  const [resettingIntro, setResettingIntro] = useState(false);
  const [resettingDb, setResettingDb] = useState(false);

  const handleAddRandomCustom = async () => {
    if (activeCustomCourseId == null) {
      Alert.alert("Brak kursu", "Wybierz własny kurs fiszek w ustawieniach.");
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

  const handleTestPopup = () => {
    setPopup({
      message: "Hej! To ja, Boxik. Dymek działa!",
      color: "disoriented",
      duration: 3600,
    });
  };

  const handleResetCustomReviews = async () => {
    setCustomBusy(true);
    try {
      const deleted = await resetActiveCustomCourseReviews();
      Alert.alert(
        "Zresetowano kurs własny",
        deleted > 0
          ? `Usunięto ${deleted} wpisów powtórek kursu własnego.`
          : "Brak wpisów do usunięcia."
      );
    } catch {
      Alert.alert("Błąd", "Nie udało się zresetować kursu własnego.");
    } finally {
      setCustomBusy(false);
    }
  };

  const handleClearAsyncStorage = () => {
    Alert.alert(
      "Wyczyść AsyncStorage",
      "Usunie WSZYSTKIE zapisane ustawienia (również poza settings). Na dev tylko.",
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Wyczyść",
          style: "destructive",
          onPress: async () => {
            setClearingStorage(true);
            try {
              await AsyncStorage.clear();
              Alert.alert("Gotowe", "AsyncStorage wyczyszczony.");
            } catch {
              Alert.alert("Błąd", "Nie udało się wyczyścić AsyncStorage.");
            } finally {
              setClearingStorage(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteDatabase = () => {
    Alert.alert(
      "Usuń bazę SQLite",
      "Skasuje lokalną bazę mygame.db (flashcards/custom). Potrzebny restart aplikacji.",
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Usuń bazę",
          style: "destructive",
          onPress: async () => {
            setResettingDb(true);
            try {
              const dbPath = `${FileSystem.documentDirectory}SQLite/mygame.db`;
              await FileSystem.deleteAsync(dbPath, { idempotent: true });
              Alert.alert("Gotowe", "Baza mygame.db została usunięta.");
            } catch {
              Alert.alert("Błąd", "Nie udało się usunąć bazy.");
            } finally {
              setResettingDb(false);
            }
          },
        },
      ]
    );
  };

  const handleSetOnboarding = async (checkpoint: "pin_required" | "activate_required" | "done") => {
    try {
      await setOnboardingCheckpoint(checkpoint);
      Alert.alert("Ustawiono", `Checkpoint: ${checkpoint}`);
    } catch {
      Alert.alert("Błąd", "Nie udało się ustawić checkpointu.");
    }
  };

  const handleResetIntro = async () => {
    setResettingIntro(true);
    try {
      await AsyncStorage.multiRemove([
        "@course_pin_intro_seen_v1",
        "@course_activate_intro_seen_v1",
        "@flashcards_intro_seen_v1",
        "@review_brain_intro_seen_v1",
        "@review_courses_intro_seen_v1",
      ]);
      await setOnboardingCheckpoint("pin_required");
      Alert.alert("Gotowe", "Intro zresetowane. Onboarding startuje od przypinania kursu.");
    } catch {
      Alert.alert("Błąd", "Nie udało się zresetować dymków.");
    } finally {
      setResettingIntro(false);
    }
  };

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionHeader}>Debug / dev tools</Text>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>Przetestuj popup Boxika</Text>
          <Text style={styles.rowSubtitle}>
            Podgląd komunikatu (tylko środowisko deweloperskie).
          </Text>
        </View>
        <MyButton
          text="Pokaż popup"
          color="my_yellow"
          onPress={handleTestPopup}
          width={140}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>Testuj cytaty (QuoteBubble)</Text>
          <Text style={styles.rowSubtitle}>
            Wywołaj losowy cytat w zależności od kategorii.
          </Text>
        </View>
      </View>
      <View style={styles.keyboardActions}>
        <View style={styles.keyboardButtonWrapper}>
          <MyButton
            text="Win"
            color="my_green"
            onPress={() => showQuote("win")}
            width={100}
          />
        </View>
        <View style={styles.keyboardButtonWrapper}>
          <MyButton
            text="Loss"
            color="my_red"
            onPress={() => showQuote("loss")}
            width={100}
          />
        </View>
        <View style={styles.keyboardButtonWrapper}>
          <MyButton
            text="Startup"
            color="my_yellow"
            onPress={() => showQuote("startup")}
            width={100}
          />
        </View>
      </View>

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
              text={showHangulKeyboard ? "Ukryj klawiaturę" : "Pokaż klawiaturę"}
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

      <Text style={styles.sectionHeader}>UI preview</Text>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>Dymek z logo</Text>
          <Text style={styles.rowSubtitle}>
            Podgląd komunikatu onboardingowego z logo.
          </Text>
        </View>
        <MyButton
          text={showLogoMessage ? "Ukryj" : "Pokaż"}
          color="my_yellow"
          onPress={() => setShowLogoMessage((prev) => !prev)}
          width={140}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>Tryb floating</Text>
          <Text style={styles.rowSubtitle}>
            Wyświetlaj dymek nad zawartością (absolute).
          </Text>
        </View>
        <MyButton
          text={logoFloating ? "Floating: ON" : "Floating: OFF"}
          color="my_yellow"
          onPress={() => setLogoFloating((prev) => !prev)}
          width={160}
        />
      </View>

      {showLogoMessage && (
        <View
          style={[
            styles.messagePreview,
            logoFloating && styles.messagePreviewFloating,
          ]}
          pointerEvents={logoFloating ? "box-none" : "auto"}
        >
          <LogoMessage
            variant="pin"
            title="Dodaj kurs kodem"
            description="To Twoje miejsce do fiszek. Zacznij od przypięcia kursu kodem od prowadzącego."
            floating={logoFloating}
            offset={
              logoFloating
                ? {
                  top: 8,
                  left: 8,
                  right: 8,
                }
                : undefined
            }
          />
        </View>
      )}

      <Text style={styles.sectionHeader}>Seed danych</Text>

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

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>Reset kursu własnego (dev)</Text>
          <Text style={styles.rowSubtitle}>
            Usuń wpisy powtórek aktywnego kursu własnego.
          </Text>
        </View>
        <MyButton
          text={customBusy ? "Resetuję..." : "Reset custom"}
          color="my_red"
          disabled={customBusy || activeCustomCourseId == null}
          onPress={handleResetCustomReviews}
          width={160}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>Dodaj testowe puchary</Text>
          <Text style={styles.rowSubtitle}>
            Odblokuj losowe 3 osiągnięcia (test bookshelf).
          </Text>
        </View>
        <MyButton
          text="Daj puchary"
          color="my_green"
          onPress={async () => {
            await unlockAchievement("debug_" + Math.random().toString().slice(2, 6));
            await unlockAchievement("debug_" + Math.random().toString().slice(2, 6));
            await unlockAchievement("debug_" + Math.random().toString().slice(2, 6));
            Alert.alert("Gotowe", "Dodano 3 testowe osiągnięcia.");
          }}
          width={140}
        />
      </View>

      <Text style={styles.sectionHeader}>Twarde resety (dev)</Text>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>Wyczyść AsyncStorage</Text>
          <Text style={styles.rowSubtitle}>
            Usuwa wszystkie klucze aplikacji (tylko na dev).
          </Text>
        </View>
        <MyButton
          text={clearingStorage ? "Czyszczę..." : "Wyczyść"}
          color="my_red"
          onPress={handleClearAsyncStorage}
          disabled={clearingStorage}
          width={140}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>Usuń bazę mygame.db</Text>
          <Text style={styles.rowSubtitle}>
            Kasuje lokalną bazę SQLite (wymaga restartu).
          </Text>
        </View>
        <MyButton
          text={resettingDb ? "Usuwam..." : "Usuń bazę"}
          color="my_red"
          onPress={handleDeleteDatabase}
          disabled={resettingDb}
          width={160}
        />
      </View>

      <Text style={styles.sectionHeader}>Onboarding checkpoint</Text>

      <View style={styles.keyboardActions}>
        <View style={styles.keyboardButtonWrapper}>
          <MyButton
            text="pin_required"
            color="my_yellow"
            onPress={() => handleSetOnboarding("pin_required")}
            width={140}
          />
        </View>
        <View style={styles.keyboardButtonWrapper}>
          <MyButton
            text="activate_required"
            color="my_yellow"
            onPress={() => handleSetOnboarding("activate_required")}
            width={140}
          />
        </View>
        <View style={styles.keyboardButtonWrapper}>
          <MyButton
            text="done"
            color="my_green"
            onPress={() => handleSetOnboarding("done")}
            width={120}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>Zresetuj dymki intro</Text>
          <Text style={styles.rowSubtitle}>
            Usuwa flagi "seen" dla wszystkich ekranów.
          </Text>
        </View>
        <MyButton
          text={resettingIntro ? "Resetuję..." : "Reset Intro"}
          color="my_red"
          onPress={handleResetIntro}
          disabled={resettingIntro}
          width={160}
        />
      </View>

      <Text style={styles.sectionHeader}>Feature flags / eksperymenty</Text>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>Powiadomienia o nauce (dev)</Text>
          <Text style={styles.rowSubtitle}>
            Szybki toggle na niewydany ficzer przypomnień.
          </Text>
        </View>
        <Switch
          style={styles.switch}
          value={learningRemindersEnabled}
          onValueChange={toggleLearningRemindersEnabled}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>Statystyki: animacja ognia (dev)</Text>
          <Text style={styles.rowSubtitle}>
            Pokazuje animowane płomienie w tle “Opanowane słówka”.
          </Text>
        </View>
        <Switch
          style={styles.switch}
          value={statsFireEffectEnabled}
          onValueChange={toggleStatsFireEffectEnabled}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>Statystyki: komoda z półkami (dev)</Text>
          <Text style={styles.rowSubtitle}>
            Pokazuje moduł bookshelf / puchary na ekranie statystyk.
          </Text>
        </View>
        <Switch
          style={styles.switch}
          value={statsBookshelfEnabled}
          onValueChange={toggleStatsBookshelfEnabled}
        />
      </View>
    </View>
  );
};

export default DebuggingSection;
