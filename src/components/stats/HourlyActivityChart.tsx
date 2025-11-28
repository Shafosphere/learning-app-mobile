import React from "react";
import { View, Text } from "react-native";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import StatsCard from "./StatsCard";

type Props = {
  timeMs: {
    week: number;
    month: number;
    year: number;
  };
};

const useStyles = createThemeStylesHook((colors) => ({
  list: {
    gap: 10,
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    color: colors.paragraph,
    fontSize: 14,
  },
  value: {
    color: colors.headline,
    fontSize: 16,
    fontWeight: "700",
  },
  hint: {
    marginTop: 10,
    color: colors.paragraph,
    fontSize: 12,
  },
}));

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return "0 min";
  const hours = ms / 3_600_000;
  if (hours >= 10) return `${Math.round(hours)} h`;
  if (hours >= 1) return `${hours.toFixed(1)} h`;
  const minutes = Math.max(1, Math.round(ms / 60_000));
  return `${minutes} min`;
}

export default function LearningTimeCard({ timeMs }: Props) {
  const styles = useStyles();
  const rows = [
    { label: "Ten tydzień", value: formatDuration(timeMs.week) },
    { label: "Ten miesiąc", value: formatDuration(timeMs.month) },
    { label: "Ten rok", value: formatDuration(timeMs.year) },
  ];

  return (
    <StatsCard title="Czas w nauce" subtitle="Suma czasu spędzonego na kartach">
      <View style={styles.list}>
        {rows.map((row) => (
          <View key={row.label} style={styles.row}>
            <Text style={styles.label}>{row.label}</Text>
            <Text style={styles.value}>{row.value}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.hint}>
        Liczymy czas od pokazania karty do potwierdzenia odpowiedzi (bez przerw między kartami).
      </Text>
    </StatsCard>
  );
}
