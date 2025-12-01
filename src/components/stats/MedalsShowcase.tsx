import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import StatsCard from "./StatsCard";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { useSettings } from "@/src/contexts/SettingsContext";

const medals = [
  { id: "eng", source: require("@/assets/medals/ENG.png") },
  { id: "fr", source: require("@/assets/medals/FR.png") },
  { id: "kr", source: require("@/assets/medals/KR.png") },
];

const useStyles = createThemeStylesHook((colors) => {
  const isDark = colors.background === colors.darkbg || colors.headline === "#fffffe";
  const woodFront = isDark ? "#8b6a42" : "#c28a58";
  const woodTop = isDark ? "#a37c4e" : "#d19a67";
  const woodShadow = isDark ? "#3d2b17" : "#a06f3f";
  const glassTint = isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.32)";
  const glassLine = isDark ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.38)";
  const backPanel = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";

  return {
    wrapper: {
      // gap: 10,
    },
    case: {
      borderRadius: 18,
      backgroundColor: backPanel,
      // padding: 14,
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 5,
    },
    caseInner: {
      position: "relative",
      backgroundColor: isDark ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.42)",
      borderRadius: 14,
      overflow: "hidden",
      paddingVertical: 18,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: glassLine,
    },
    medalRow: {
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
    },
    medalShadow: {
      // width: 82,
      // height: 82,
      // justifyContent: "center",
      // alignItems: "center",
      // borderRadius: 20,
      // backgroundColor: isDark ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.35)",
      // shadowColor: woodShadow,
      // shadowOpacity: 0.4,
      // shadowRadius: 8,
      // shadowOffset: { width: 0, height: 4 },
      // elevation: 2,
    },
    medal: {
      width: 300,
      height: 300,
    },
    glassPane: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: glassLine,
    },
    glassOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: glassTint,
      borderRadius: 14,
    },
    glassSheen: {
      position: "absolute",
      left: "6%",
      top: -4,
      width: "38%",
      height: "90%",
      backgroundColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.35)",
      transform: [{ rotate: "-8deg" }],
      borderRadius: 50,
    },
    glassShimmer: {
      position: "absolute",
      right: "10%",
      bottom: 6,
      width: "26%",
      height: "40%",
      backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.2)",
      transform: [{ rotate: "10deg" }],
      borderRadius: 30,
    },
    glassEdge: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 10,
      backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.22)",
      opacity: 0.8,
    },
    base: {
      // marginTop: 10,
      // height: 62,
      borderRadius: 14,
      overflow: "hidden",
      backgroundColor: woodFront,
      shadowColor: woodShadow,
      shadowOpacity: 0.45,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    baseTop: {
      height: 18,
      backgroundColor: woodTop,
    },
    baseFront: {
      flex: 1,
      backgroundColor: woodFront,
      borderBottomLeftRadius: 14,
      borderBottomRightRadius: 14,
    },
    baseAccent: {
      position: "absolute",
      top: 18,
      left: 0,
      right: 0,
      height: 6,
      backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.16)",
    },
    caption: {
      marginTop: 2,
      fontSize: 13,
      color: colors.paragraph,
      opacity: 0.8,
    },
  };
});

export default function MedalsShowcase() {
  const styles = useStyles();
  const { theme } = useSettings();
  const blurTint = theme === "dark" ? "dark" : "light";

  return (
    <StatsCard
      title="Gablota medali"
      subtitle=""
    >
      <View style={styles.wrapper}>
        <View style={styles.case}>
          <View style={styles.caseInner}>
            <View style={styles.medalRow}>
              {medals.map((medal) => (
                <View key={medal.id} style={styles.medalShadow}>
                  <Image source={medal.source} style={styles.medal} contentFit="contain" />
                </View>
              ))}
            </View>

            {/* Szklana tafla na medalami */}
            <BlurView tint={blurTint} intensity={30} style={styles.glassPane} />
            <View pointerEvents="none" style={styles.glassOverlay} />
            {/* <View pointerEvents="none" style={styles.glassSheen} /> */}
            {/* <View pointerEvents="none" style={styles.glassShimmer} /> */}
            <View pointerEvents="none" style={styles.glassEdge} />
          </View>
        </View>

        {/* <View style={styles.base}>
          <View style={styles.baseTop} />
          <View style={styles.baseFront} />
          <View style={styles.baseAccent} />
        </View> */}
      </View>
    </StatsCard>
  );
}
