import { Pressable, Text, TouchableOpacity, View } from "react-native";
import { useEffect, useState } from "react";
import { useStyles } from "@/src/screens/level/styles_level";
import { useRouter } from "expo-router";
import { useSettings } from "@/src/contexts/SettingsContext";
import type { CEFRLevel } from "@/src/types/language";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getTotalWordsForLevel } from "@/src/components/db/db";
import { makeScopeId } from "@/src/hooks/useBoxesPersistenceSnapshot";

export default function Level() {
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

        const entries = await Promise.all(
          levels.map(async (lvl) => {
            try {
              const storageKey = `boxes:${makeScopeId(srcId, tgtId, lvl)}`;
              const raw = await AsyncStorage.getItem(storageKey);
              let usedWordIdsLen = 0;
              if (raw) {
                const parsed = JSON.parse(raw);
                if (
                  parsed &&
                  parsed.v === 2 &&
                  Array.isArray(parsed.usedWordIds)
                ) {
                  usedWordIdsLen = parsed.usedWordIds.length;
                }
              }
              const total = await getTotalWordsForLevel(srcId, lvl);
              const progress =
                total > 0 ? Math.min(1, usedWordIdsLen / total) : 0;
              return [lvl, progress] as const;
            } catch (_) {
              return [lvl, 0] as const;
            }
          })
        );

        if (!mounted) return;
        const map = entries.reduce((acc, [lvl, prog]) => {
          acc[lvl] = prog;
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
        {levels.map((item, index) => (
          <Pressable
            onPress={() => [setLevel(item), router.push("/flashcards")]}
            style={styles.tile}
            key={index}
          >
            <Text style={styles.level}>{item}</Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(progressMap[item] ?? 0) * 100}%` },
                ]}
              />
            </View>
          </Pressable>
        ))}
        <Text style={styles.choose}>Wybierz poziom</Text>
      </View>
    </View>
  );
}
