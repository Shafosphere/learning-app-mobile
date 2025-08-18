import React from "react";
import { View, Text, Button } from "react-native";
import { useSettings } from "../../src/contexts/SettingsContext";
import { useStyles } from "../../src/screens/settings/styles_settings";
import { regeneratePatches } from "@/src/components/db/dbGenerator";
import { logGeneratedTableContents } from "@/src/components/db/dbGenerator";
import { getWordsFromPatch } from "@/src/components/db/dbGenerator";
import { clearAllFlashcards } from "@/src/utils/flashcardsStorage";

export default function Settings() {
  const { theme, toggleTheme, spellChecking, toggleSpellChecking } =
    useSettings();
  const styles = useStyles();

  async function handleGeneratePatches() {
    try {
      await regeneratePatches({
        srcCode: "en",
        tgtCode: "pl",
        batchSize: 30,
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
      <Text style={styles.text}>Aktualny motyw: {theme}</Text>
      <Button
        title={theme === "light" ? "Przełącz na ciemny" : "Przełącz na jasny"}
        onPress={toggleTheme}
      />

      <Text style={styles.text}>
        Spellchecking: {spellChecking ? "włączone" : "wyłączone"}
      </Text>
      <Button
        title={spellChecking ? "Wyłącz sprawdzanie" : "Włącz sprawdzanie"}
        onPress={toggleSpellChecking}
      />

      <Button title={"Generuj patche"} onPress={handleGeneratePatches} />

      <Button title="Sprawdź tablice" onPress={handleCheckTable} />

      <Button title="Pobierz patch" onPress={loadAndDisplayPatch} />

      <Button title="wyczysc pamiec" onPress={clearAllFlashcards} />
    </View>
  );
}
