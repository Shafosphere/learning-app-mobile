import React from "react";
import { View, Text, Button } from "react-native";
import { useSettings } from "../../src/contexts/SettingsContext";
import { useStyles } from "../../src/screens/settings/styles_settings";

export default function Settings() {
  const { theme, toggleTheme } = useSettings();
  const styles = useStyles();

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Aktualny motyw: {theme}</Text>
      <Button
        title={theme === "light" ? "Przełącz na ciemny" : "Przełącz na jasny"}
        onPress={toggleTheme}
      />
    </View>
  );
}
