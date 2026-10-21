import React from "react";
import { View, type ViewProps } from "react-native";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { statsProgressStyles } from "@/src/screens/stats/StatsScreen/statsDesign";
import StatsCard from "./StatsCard";

const useStyles = createThemeStylesHook(() => ({
  card: { ...statsProgressStyles.card },
  content: { ...statsProgressStyles.cardContent },
}));

export default function StatsProgressCard({ children, style, ...props }: ViewProps) {
  const styles = useStyles();

  return (
    <StatsCard style={styles.card}>
      <View {...props} style={[styles.content, style]}>{children}</View>
    </StatsCard>
  );
}
