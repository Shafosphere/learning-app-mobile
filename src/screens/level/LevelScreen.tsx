import { Pressable, Text, TouchableOpacity, View } from "react-native";
import { useEffect, useState } from "react";
import { useStyles } from "./LevelScreen-styles";
import { useRouter } from "expo-router";
import { useSettings } from "@/src/contexts/SettingsContext";
import type { CEFRLevel } from "@/src/types/language";
import { countLearnedWordsByLevel, getTotalWordsForLevel } from "@/src/db/sqlite/db";

export default function LevelScreen() {
  const { setLevel, activeProfile } = useSettings();
  const styles = useStyles();
  const router = useRouter();
  const levels: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

  const [progressMap, setProgressMap] = useState<Record<CEFRLevel, number>>(
    {} as Record<CEFRLevel, number>
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!activeProfile?.sourceLangId || !activeProfile?.targetLangId) {
          if (mounted) setProgressMap({} as Record<CEFRLevel, number>);
          return;
        }
        const srcId = activeProfile.sourceLangId;
        const tgtId = activeProfile.targetLangId;

        const [learnedCounts, totals] = await Promise.all([
          countLearnedWordsByLevel(srcId, tgtId),
          Promise.all(
            levels.map(async (lvl) => [
              lvl,
              await getTotalWordsForLevel(srcId, lvl),
            ] as const)
          ),
        ]);

        if (!mounted) return;
        const map = totals.reduce((acc, [lvl, total]) => {
          const learned = learnedCounts[lvl] ?? 0;
          acc[lvl] = total > 0 ? Math.min(1, learned / total) : 0;
          return acc;
        }, {} as Record<CEFRLevel, number>);
        setProgressMap(map);
      } catch (_) {
        if (mounted) setProgressMap({} as Record<CEFRLevel, number>);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [activeProfile?.sourceLangId, activeProfile?.targetLangId]);
  
  return (
    <View style={styles.container}>
      <View style={styles.minicontainer}>
        {levels.map((item, index) => {
          const progress = progressMap[item] ?? 0;

          return (
            <Pressable
              onPress={() => [setLevel(item), router.push("/flashcards")]}
              style={styles.tile}
              key={index}
            >
              <Text style={styles.level}>{item}</Text>
              <View
                style={[
                  styles.progressTrack,
                  progress < 0.01 && styles.hiddenProgressTrack,
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progress * 100}%` },
                  ]}
                />
              </View>
            </Pressable>
          );
        })}
        <Text style={styles.choose}>Wybierz poziom</Text>
      </View>
    </View>
  );
}
