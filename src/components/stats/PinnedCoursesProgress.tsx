import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import StatsCard from "./StatsCard";
import ProgressBar from "./ProgressBar";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { useSettings } from "@/src/contexts/SettingsContext";
import {
  countCustomLearnedForCourse,
  getCustomCoursesWithCardCounts,
} from "@/src/db/sqlite/db";

type Item = {
  key: string;
  label: string;
  learned: number;
  total: number;
  progress: number; // 0..1
};

const useStyles = createThemeStylesHook((colors) => ({
  row: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.headline,
    marginBottom: 6,
  },
  empty: {
    color: colors.paragraph,
    fontSize: 13,
  },
}));

export default function PinnedCoursesProgress() {
  const styles = useStyles();
  const { pinnedOfficialCourseIds } = useSettings();
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const allCourses = await getCustomCoursesWithCardCounts();
        const officialPinned = new Set(pinnedOfficialCourseIds);
        const eligible = allCourses.filter((course) => {
          if (!course.reviewsEnabled) return false;
          if (course.isOfficial) {
            return officialPinned.has(course.id);
          }
          return true;
        });

        const results: Item[] = [];
        for (const course of eligible) {
          const learned = await countCustomLearnedForCourse(course.id);
          const total = course.cardsCount ?? 0;
          results.push({
            key: course.id.toString(),
            label: course.name,
            learned,
            total,
            progress: total > 0 ? Math.min(1, learned / total) : 0,
          });
        }
        if (mounted) setItems(results);
      } catch {
        if (mounted) setItems([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [pinnedOfficialCourseIds]);

  return (
    <StatsCard title="Postęp przypiętych kursów">
      {items.length === 0 ? (
        <Text style={styles.empty}>Brak danych do wyświetlenia.</Text>
      ) : (
        <View>
          {items.map((it) => (
            <View key={it.key} style={styles.row}>
              <Text style={styles.label}>{it.label}</Text>
              <ProgressBar value={it.progress} label={`${it.learned} / ${it.total}`} showPercent={true} />
            </View>
          ))}
        </View>
      )}
    </StatsCard>
  );
}
