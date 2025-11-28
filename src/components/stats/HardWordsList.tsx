import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import StatsCard from "./StatsCard";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { getStubbornWords, type StubbornWord } from "@/src/db/sqlite/db";
import { useSettings } from "@/src/contexts/SettingsContext";

const useStyles = createThemeStylesHook((colors) => ({
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  word: {
    color: colors.headline,
    fontSize: 14,
    fontWeight: "600",
    flexShrink: 1,
    marginRight: 8,
  },
  meta: {
    color: colors.paragraph,
    fontSize: 12,
  },
  empty: {
    color: colors.paragraph,
    fontSize: 13,
  },
}));

export default function HardWordsList() {
  const styles = useStyles();
  const { activeCourse, selectedLevel } = useSettings();
  const [items, setItems] = useState<StubbornWord[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (
          !activeCourse ||
          activeCourse.sourceLangId == null ||
          activeCourse.targetLangId == null ||
          !selectedLevel
        ) {
          if (mounted) setItems([]);
          return;
        }
        const rows = await getStubbornWords(
          activeCourse.sourceLangId,
          activeCourse.targetLangId,
          selectedLevel,
          5
        );
        if (mounted) setItems(rows);
      } catch {
        if (mounted) setItems([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [activeCourse, selectedLevel]);

  return (
    <StatsCard title="Trudne słówka" subtitle="Najczęściej przerzucane między boxami">
      {items.length === 0 ? (
        <Text style={styles.empty}>Brak danych – spróbuj pograć dłużej.</Text>
      ) : (
        <View>
          {items.map((it) => (
            <View key={it.id} style={styles.item}>
              <Text style={styles.word}>{it.text}</Text>
              <Text style={styles.meta}>przejścia: {it.moveCount}</Text>
            </View>
          ))}
        </View>
      )}
    </StatsCard>
  );
}
