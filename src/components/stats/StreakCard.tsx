import React from "react";
import { Text, View } from "react-native";
import StatsCard from "./StatsCard";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

type Props = {
  streakCount: number;
  lastDate: string;
  dailyProgressCount: number;
};

const useStyles = createThemeStylesHook((colors) => ({
  value: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.headline,
  },
  label: {
    fontSize: 14,
    color: colors.paragraph,
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  metricWrap: {
    flex: 1,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.headline,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.paragraph,
    opacity: 0.8,
  },
}));

function formatDate(dateStr: string) {
  if (!dateStr) return "Brak danych";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString?.() ?? dateStr;
}

const StreakCard: React.FC<Props> = ({
  streakCount,
  lastDate,
  dailyProgressCount,
}) => {
  const styles = useStyles();
  return (
    <StatsCard title="Twoja passa" subtitle="Codziennie choć trochę!">
      <Text style={styles.value}>{streakCount}</Text>
      <Text style={styles.label}>dni z rzędu</Text>
      <View style={styles.row}>
        <View style={styles.metricWrap}>
          <Text style={styles.metricValue}>{dailyProgressCount}</Text>
          <Text style={styles.metricLabel}>Dzisiejsze poprawne odpowiedzi</Text>
        </View>
        <View style={styles.metricWrap}>
          <Text style={styles.metricValue}>{formatDate(lastDate)}</Text>
          <Text style={styles.metricLabel}>Ostatnia aktywność</Text>
        </View>
      </View>
    </StatsCard>
  );
};

export default StreakCard;
