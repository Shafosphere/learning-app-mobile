import React, { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";

import { useSettings } from "@/src/contexts/SettingsContext";
import type { CEFRLevel } from "@/src/types/language";
import { useStyles } from "@/src/screens/level/LevelScreen-styles";
import { countDueReviewsByLevel } from "@/src/db/sqlite/db";

export default function ReviewLevelsScreen() {
  const { setLevel, activeCourse, colors } = useSettings();
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

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      const fetchCounts = async () => {
        try {
          const srcId = activeCourse?.sourceLangId;
          const tgtId = activeCourse?.targetLangId;
          if (!srcId || !tgtId) {
            if (mounted)
              setCounts({ A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 });
            return;
          }
          const map = await countDueReviewsByLevel(srcId, tgtId, Date.now());
          if (mounted) setCounts(map);
        } catch (_) {
          if (mounted) setCounts({ A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 });
        }
      };

      void fetchCounts();

      return () => {
        mounted = false;
      };
    }, [activeCourse?.sourceLangId, activeCourse?.targetLangId])
  );

  return (
    <View style={styles.container}>
      <View style={styles.reviewMinicontainer}>
        <Text style={styles.choose}>POWÓTRKI Z SEKCJI:</Text>

        {levels.map((item, index) => (
          <Pressable
            onPress={() => {
              setLevel(item);
              router.push("/review/memory");
            }}
            style={styles.reviewTile}
            key={index}
          >
            <View style={styles.test}>
              <Text style={styles.reviewLevel}>{item}</Text>
              <Text
                style={[
                  styles.number,
                  (counts[item] ?? 0) === 0
                    ? { color: colors.my_green }
                    : { color: colors.my_red },
                ]}
              >
                {counts[item] ?? 0}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
