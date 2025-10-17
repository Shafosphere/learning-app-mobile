import React, { useEffect, useState } from "react";
import { Text } from "react-native";
import StatsCard from "./StatsCard";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { countTotalLearnedWordsGlobal } from "@/src/db/sqlite/db";

const useStyles = createThemeStylesHook((colors) => ({
  bigNumber: {
    fontSize: 48,
    fontWeight: "800",
    color: colors.headline,
  },
  label: {
    marginTop: 4,
    fontSize: 14,
    color: colors.paragraph,
    opacity: 0.9,
  },
}));

const BigKnownWordsCard: React.FC = () => {
  const styles = useStyles();
  const [total, setTotal] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    void countTotalLearnedWordsGlobal()
      .then((cnt) => {
        if (mounted) setTotal(cnt | 0);
      })
      .catch(() => {
        if (mounted) setTotal(0);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <StatsCard title="Opanowane słówka">
      <Text style={styles.bigNumber}>{total}</Text>
      <Text style={styles.label}>łączna liczba opanowanych słówek</Text>
    </StatsCard>
  );
};

export default BigKnownWordsCard;

