import React from "react";
import { View, Text, Switch, Image, TouchableOpacity } from "react-native";
import { useSettings } from "../../src/contexts/SettingsContext";
import { useStyles } from "../../src/screens/settings/styles_settings";

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

      {/* Optional debug buttons removed (patches no longer used) */}
    </View>
  );
}
