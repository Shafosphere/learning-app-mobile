import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSettings } from "@/src/contexts/SettingsContext";
import type { CEFRLevel } from "@/src/types/language";
import { useStyles } from "@/src/screens/level/styles_level";
import { countDueReviewsByLevel } from "@/src/components/db/db";

export default function Review() {
  const { setLevel, activeProfile } = useSettings();
  const styles = useStyles();
  const router = useRouter();
  const levels: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

  const [counts, setCounts] = useState<Record<CEFRLevel, number>>({
    A1: 0,
    A2: 0,
    B1: 0,
    B2: 0,
    C1: 0,
    C2: 0,
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const srcId = activeProfile?.sourceLangId;
        const tgtId = activeProfile?.targetLangId;
        if (!srcId || !tgtId) {
          if (mounted)
            setCounts({ A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 });
          return;
        }
        const map = await countDueReviewsByLevel(srcId, tgtId, Date.now());
        if (mounted) setCounts(map);
      } catch (_) {
        if (mounted)
          setCounts({ A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 });
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
            onPress={() => [setLevel(item), router.push("/review/session")]}
            style={styles.tile}
            key={index}
          >
            <Text style={styles.level}>
              {item} {counts[item] ?? 0}
            </Text>
          </Pressable>
        ))}
        <Text style={styles.choose}>Wybierz poziom powtórek</Text>
      </View>
    </View>
  );
}
