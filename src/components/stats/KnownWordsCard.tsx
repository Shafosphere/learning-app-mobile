import React from "react";
import { Text, View } from "react-native";
import StatsCard from "./StatsCard";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

type Props = {
  knownWordsCount: number;
  lastKnownWordDate: string;
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

const KnownWordsCard: React.FC<Props> = ({
  knownWordsCount,
  lastKnownWordDate,
  dailyProgressCount,
}) => {
  const styles = useStyles();
  return (
    <StatsCard
      title="Opanowane słówka"
      subtitle="Każde trafienie w boxFive to nowy sukces."
    >
      <Text style={styles.value}>{knownWordsCount}</Text>
      <Text style={styles.label}>słów znanych na pewno</Text>
      <View style={styles.row}>
        <View style={styles.metricWrap}>
          <Text style={styles.metricValue}>{dailyProgressCount}</Text>
          <Text style={styles.metricLabel}>Dzisiejsze trafienia w boxFive</Text>
        </View>
        <View style={styles.metricWrap}>
          <Text style={styles.metricValue}>
            {formatDate(lastKnownWordDate)}
          </Text>
          <Text style={styles.metricLabel}>Ostatnie opanowane słowo</Text>
        </View>
      </View>
    </StatsCard>
  );
};

export default KnownWordsCard;
