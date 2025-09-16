import React, { useState } from "react";
import { View, Text, Switch, Image, TouchableOpacity, TextInput, Alert } from "react-native";
import { useSettings } from "../../src/contexts/SettingsContext";
import { useStyles } from "../../src/screens/settings/styles_settings";
import MyButton from "@/src/components/button/button";
import { addRandomReviewsForPair } from "@/src/components/db/db";

export default function Settings() {
  const {
    theme,
    toggleTheme,
    spellChecking,
    toggleSpellChecking,
    showBoxFaces,
    toggleShowBoxFaces,
    boxesLayout,
    setBoxesLayout,
    flashcardsBatchSize,
    setFlashcardsBatchSize,
    activeProfile,
    selectedLevel,
  } = useSettings();
  const styles = useStyles();
  const [busy, setBusy] = useState(false);

  // debug handlers related to patches have been removed

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.text}>Aktualny motyw: {theme}</Text>
        <Switch
          style={{ transform: [{ scaleX: 1.12 }, { scaleY: 1.12 }] }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          value={theme === "dark"}
          onValueChange={(val) => {
            // true => dark mode enabled
            if ((val && theme !== "dark") || (!val && theme !== "light")) {
              toggleTheme();
            }
          }}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.text}>
          Spellchecking: {spellChecking ? "włączone" : "wyłączone"}
        </Text>
        <Switch
          style={{ transform: [{ scaleX: 1.12 }, { scaleY: 1.12 }] }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          value={spellChecking}
          onValueChange={(val) => {
            if (val !== spellChecking) toggleSpellChecking();
          }}
        />
      </View>

      <View style={styles.bigsection}>
        <Text style={styles.bigsectiontext}>Wybierz schemat pudełek:</Text>
        <View style={styles.options}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setBoxesLayout("classic")}
            style={[
              styles.boxcontainer,
              boxesLayout === "classic" && styles.boxcontainerSelected,
            ]}
          >
            <Image
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
              source={require("../../assets/boxstyle1.png")}
            />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setBoxesLayout("carousel")}
            style={[
              styles.boxcontainer,
              boxesLayout === "carousel" && styles.boxcontainerSelected,
            ]}
          >
            <Image
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
              source={require("../../assets/boxstyle2.png")}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.text}>
          Miny pudełek: {showBoxFaces ? "włączone" : "wyłączone"}
        </Text>
        <Switch
          style={{ transform: [{ scaleX: 1.12 }, { scaleY: 1.12 }] }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          value={showBoxFaces}
          onValueChange={(val) => {
            if (val !== showBoxFaces) toggleShowBoxFaces();
          }}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.text}>Liczba fiszek w partii:</Text>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: "#ccc",
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 6,
            minWidth: 80,
            textAlign: "center",
            color: styles.text.color,
          }}
          keyboardType="number-pad"
          value={String(flashcardsBatchSize ?? "")}
          onChangeText={(txt) => {
            const n = parseInt(txt.replace(/[^0-9]/g, ""), 10);
            if (!Number.isNaN(n) && n > 0 && n <= 200) {
              setFlashcardsBatchSize(n);
            }
          }}
          placeholder="np. 10"
        />
      </View>

      {/* Debug: Add random review items */}
      <View style={[styles.section, { alignItems: "center" }]}>
        <MyButton
          text={busy ? "Dodawanie..." : "Dodaj 10 losowych do review"}
          color="my_green"
          disabled={busy || !activeProfile}
          onPress={async () => {
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
            } catch (e) {
              Alert.alert("Błąd", "Nie udało się dodać słówek.");
            } finally {
              setBusy(false);
            }
          }}
          width={260}
        />
        {!activeProfile && (
          <Text style={[styles.text, { marginTop: 6 }]}>Najpierw wybierz profil.</Text>
        )}
      </View>
    </View>
  );
}
