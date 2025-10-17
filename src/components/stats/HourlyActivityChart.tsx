import React from "react";
import { View, Text } from "react-native";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import StatsCard from "./StatsCard";

type Props = {
  hours: number[]; // length 24
};

const useStyles = createThemeStylesHook((colors) => ({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 80,
    gap: 2,
  },
  bar: {
    width: 6,
    backgroundColor: colors.my_green,
    borderRadius: 2,
  },
  scale: {
    marginTop: 8,
    fontSize: 12,
    color: colors.paragraph,
  },
}));

export default function HourlyActivityChart({ hours }: Props) {
  const styles = useStyles();
  const max = Math.max(1, ...hours);
  return (
    <StatsCard title="Godziny aktywności">
      <View style={styles.row}>
        {hours.map((v, i) => (
          <View key={i} style={[styles.bar, { height: Math.max(2, (v / max) * 80) }]} />
        ))}
      </View>
      <Text style={styles.scale}>0–23 h (ostatnie 90 dni)</Text>
    </StatsCard>
  );
}

