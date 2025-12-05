import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import StatsCard from "./StatsCard";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { getHardFlashcards, type HardFlashcard } from "@/src/db/sqlite/db";
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
  const { activeCustomCourseId } = useSettings();
  const [items, setItems] = useState<HardFlashcard[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (activeCustomCourseId == null) {
          if (mounted) setItems([]);
          return;
        }
        const rows = await getHardFlashcards(activeCustomCourseId, 5);
        if (mounted) setItems(rows);
      } catch {
        if (mounted) setItems([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [activeCustomCourseId]);

  return (
    <StatsCard title="Trudne fiszki" subtitle="Najczęściej mylone fiszki z kursu">
      {items.length === 0 ? (
        <Text style={styles.empty}>Brak danych – spróbuj pograć dłużej.</Text>
      ) : (
        <View>
          {items.map((it) => (
            <View key={it.id} style={styles.item}>
              <Text style={styles.word}>{it.frontText}</Text>
              <Text style={styles.meta}>błędów: {it.wrongCount}</Text>
            </View>
          ))}
        </View>
      )}
    </StatsCard>
  );
}
