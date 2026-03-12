import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavbarStats } from "@/src/contexts/NavbarStatsContext";
import { useSettings } from "@/src/contexts/SettingsContext";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { OrganicFireEffect } from "./OrganicFireEffect";

const useStyles = createThemeStylesHook((colors) => ({
  container: {
    backgroundColor: colors.secondBackground,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    height: 180,
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  bigNumber: {
    fontSize: 64,
    fontWeight: "800",
    color: colors.headline,
    zIndex: 10,
    marginTop: 0,
  },
  bigNumberWithFlames: {
    marginTop: -20, // Adjust for visual balance with flames
  },
  cornerIcon: {
    position: "absolute",
    right: 18,
    bottom: 18,
    opacity: 0.95,
    zIndex: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.paragraph,
    opacity: 0.8,
    zIndex: 10,
    marginTop: 4,
  },
  flamesWrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    opacity: 0.8, // Slight transparency to blend with background
  },
}));

const BigKnownWordsCard: React.FC = () => {
  const styles = useStyles();
  const { statsFireEffectEnabled, colors } = useSettings();
  const { stats } = useNavbarStats();

  return (
    <View style={styles.container}>
      {statsFireEffectEnabled && (
        <View style={styles.flamesWrapper}>
          <OrganicFireEffect />
        </View>
      )}
      <Text
        style={[
          styles.bigNumber,
          statsFireEffectEnabled && styles.bigNumberWithFlames,
        ]}
      >
        {stats.masteredCount}
      </Text>
      <Text style={styles.label}>Opanowane fiszki</Text>
      <Ionicons
        style={styles.cornerIcon}
        name="trophy-outline"
        size={32}
        color={colors.my_yellow}
      />
    </View>
  );
};

export default BigKnownWordsCard;
