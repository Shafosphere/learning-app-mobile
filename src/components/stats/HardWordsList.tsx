import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import StatsCard from "./StatsCard";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { getHardFlashcards, type HardFlashcard } from "@/src/db/sqlite/db";
import { useSettings } from "@/src/contexts/SettingsContext";
import { PromptImage } from "@/src/components/card/subcomponents/PromptImage";

const useStyles = createThemeStylesHook((colors) => ({
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    gap: 10,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    gap: 8,
  },
  word: {
    color: colors.headline,
    fontSize: 14,
    fontWeight: "600",
    flexShrink: 1,
  },
  imageSlot: {
    width: 36,
    height: 24,
    aspectRatio: 3 / 2,
    borderRadius: 4,
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

  const renderFront = (it: HardFlashcard) => {
    const frontText = (it.frontText ?? "").trim();
    const backText = (it.backText ?? "").trim();
    const imageUri = it.imageFront ?? it.imageBack ?? null;
    if (imageUri) {
      return <PromptImage uri={imageUri} imageStyle={styles.imageSlot} />;
    }
    const label = frontText || backText || "—";
    return (
      <Text style={styles.word} numberOfLines={1}>
        {label}
      </Text>
    );
  };

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
              <View style={styles.left}>{renderFront(it)}</View>
              <Text style={styles.meta}>błędów: {it.wrongCount}</Text>
            </View>
          ))}
        </View>
      )}
    </StatsCard>
  );
}
