import React from "react";
import { View, Text, Button } from "react-native";
import { useSettings } from "../../src/contexts/SettingsContext";
import { useStyles } from "../../src/screens/settings/styles_settings";
import { regeneratePatches } from "@/src/components/db/dbGenerator";
import { logGeneratedTableContents } from "@/src/components/db/dbGenerator";
export default function Settings() {
  const { theme, toggleTheme } = useSettings();
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

  async function handleCheckTable(){
    try {
      await logGeneratedTableContents();
    } catch (error) {
      console.log(error)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Aktualny motyw: {theme}</Text>
      <Button
        title={theme === "light" ? "Przełącz na ciemny" : "Przełącz na jasny"}
        onPress={toggleTheme}
      />

      <Button title={"Generuj patche"} onPress={handleGeneratePatches} />

      <Button title="Sprawdź tablice" onPress={handleCheckTable}/>
    </View>
  );
}
