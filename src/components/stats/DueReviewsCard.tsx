import React from "react";
import { View, Text } from "react-native";
import type { CEFRLevel } from "@/src/types/language";
import StatsCard from "./StatsCard";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

const LEVELS: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

type Props = {
  dueReviews: Record<CEFRLevel, number>;
};

const useStyles = createThemeStylesHook((colors) => ({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  level: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.paragraph,
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.headline,
  },
}));

const DueReviewsCard: React.FC<Props> = ({ dueReviews }) => {
  const styles = useStyles();

  return (
    <StatsCard title="Powtórki do wykonania" subtitle="Stan na teraz">
      {LEVELS.map((level, idx) => (
        <View
          key={level}
          style={[styles.row, idx === LEVELS.length - 1 && styles.lastRow]}
        >
          <Text style={styles.level}>{level}</Text>
          <Text style={styles.value}>{dueReviews[level] ?? 0}</Text>
        </View>
      ))}
    </StatsCard>
  );
};

export default DueReviewsCard;
