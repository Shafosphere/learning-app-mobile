import React from "react";
import { View, Text, Switch } from "react-native";
import * as Haptics from "expo-haptics";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useStyles } from "@/src/screens/settings/styles_settings";

const AppearanceSection: React.FC = () => {
  const styles = useStyles();
  const {
    theme,
    toggleTheme,
    feedbackEnabled,
    toggleFeedbackEnabled,
  } = useSettings();

  const handleThemeToggle = async (value: boolean) => {
    if ((value && theme !== "dark") || (!value && theme !== "light")) {
      await toggleTheme();
      if (feedbackEnabled) {
        try {
          await Haptics.selectionAsync();
        } catch {
          // Ignored: haptyka może być niedostępna na danym urządzeniu
        }
      }
    }
  };

  const handleFeedbackToggle = async (value: boolean) => {
    if (value !== feedbackEnabled) {
      if (value) {
        try {
          await Haptics.selectionAsync();
        } catch {
          // Ignored
        }
      }
      await toggleFeedbackEnabled();
    }
  };

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionHeader}>Wygląd</Text>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>Ciemny motyw</Text>
          <Text style={styles.rowSubtitle}>
            Przełącz interfejs pomiędzy jasnym a ciemnym trybem.
          </Text>
        </View>
        <Switch
          style={styles.switch}
          value={theme === "dark"}
          onValueChange={handleThemeToggle}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>Dźwięki i haptyka</Text>
          <Text style={styles.rowSubtitle}>
            Krótkie wibracje w kluczowych interakcjach aplikacji.
          </Text>
        </View>
        <Switch
          style={styles.switch}
          value={feedbackEnabled}
          onValueChange={handleFeedbackToggle}
        />
      </View>
    </View>
  );
};

export default AppearanceSection;
