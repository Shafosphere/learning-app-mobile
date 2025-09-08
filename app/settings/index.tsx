import React from "react";
import {
  View,
  Text,
  Switch,
  Button,
  Image,
  TouchableOpacity,
} from "react-native";
import { useSettings } from "../../src/contexts/SettingsContext";
import { useStyles } from "../../src/screens/settings/styles_settings";
import { regeneratePatches } from "@/src/components/db/dbGenerator";
import { logGeneratedTableContents } from "@/src/components/db/dbGenerator";
import { getWordsFromPatch } from "@/src/components/db/dbGenerator";
import { clearAllFlashcards } from "@/src/utils/flashcardsStorage";

export default function Settings() {
  const {
    theme,
    toggleTheme,
    spellChecking,
    toggleSpellChecking,
    boxesLayout,
    setBoxesLayout,
  } = useSettings();
  const styles = useStyles();

  async function handleGeneratePatches() {
    try {
      await regeneratePatches({
        srcCode: "en",
        tgtCode: "pl",
        batchSize: 10,
      });
    } catch (error) {
      console.log(error);
    }
  }

  async function loadAndDisplayPatch() {
    try {
      const patchData = await getWordsFromPatch({
        sourceLangId: 1,
        targetLangId: 2,
        cefrLevel: "A1",
        batchIndex: 1,
      });

      console.log(JSON.stringify(patchData, null, 2));
    } catch (error) {
      console.error("Wystąpił błąd podczas pobierania paczki:", error);
    }
  }

  async function handleCheckTable() {
    try {
      await logGeneratedTableContents();
    } catch (error) {
      console.log(error);
    }
  }

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

      {/* <Button title={"Generuj patche"} onPress={handleGeneratePatches} />

      <Button title="Sprawdź tablice" onPress={handleCheckTable} />

      <Button title="Pobierz patch" onPress={loadAndDisplayPatch} />

      <Button title="wyczysc pamiec" onPress={clearAllFlashcards} /> */}
    </View>
  );
}
