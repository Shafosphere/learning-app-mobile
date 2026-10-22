import React from "react";
import { View, type ViewProps } from "react-native";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { statsProgressStyles } from "@/src/screens/stats/StatsScreen/statsDesign";
import StatsCard, { type StatsCardHeaderProps } from "./StatsCard";

const useStyles = createThemeStylesHook(() => ({
  card: { ...statsProgressStyles.card },
  content: { ...statsProgressStyles.cardContent },
  header: { padding: 16 },
  body: { marginTop: 0 },
}));

export default function StatsProgressCard({
  children, style, title, subtitle, action, leading, headerDivider, ...props
}: ViewProps & StatsCardHeaderProps) {
  const styles = useStyles();

  return (
    <StatsCard
      style={styles.card}
      title={title}
      subtitle={subtitle}
      action={action}
      leading={leading}
      headerDivider={headerDivider}
      headerStyle={styles.header}
      contentStyle={styles.body}
    >
      <View {...props} style={[styles.content, style]}>{children}</View>
    </StatsCard>
  );
}
