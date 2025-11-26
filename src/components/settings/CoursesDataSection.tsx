import React, { useState } from "react";
import { View, Text, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useStyles } from "@/src/screens/settings/SettingsScreen-styles";
import MyButton from "@/src/components/button/button";
import { setOnboardingCheckpoint } from "@/src/services/onboardingCheckpoint";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSettings } from "@/src/contexts/SettingsContext";

const CoursesDataSection: React.FC = () => {
  const styles = useStyles();
  const router = useRouter();
  const { resetLearningSettings } = useSettings();
  const [resettingOnboarding, setResettingOnboarding] = useState(false);
  const [resettingLearning, setResettingLearning] = useState(false);

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
