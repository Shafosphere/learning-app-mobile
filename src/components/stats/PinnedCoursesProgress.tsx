import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { Text, View } from "react-native";
import StatsCard from "./StatsCard";
import ProgressBar from "./ProgressBar";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { useSettings } from "@/src/contexts/SettingsContext";
import {
  getCustomCourseMasteryProgress,
  getCustomCoursesWithCardCounts,
} from "@/src/db/sqlite/db";
import { useTranslation } from "react-i18next";

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
  skeletonRow: {
    marginBottom: 14,
  },
  skeletonLabel: {
    width: "58%",
    height: 16,
    borderRadius: 999,
    backgroundColor: colors.border,
    opacity: 0.18,
    marginBottom: 8,
  },
  skeletonMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  skeletonMetaLeft: {
    width: 52,
    height: 14,
    borderRadius: 999,
    backgroundColor: colors.border,
    opacity: 0.16,
  },
  skeletonMetaRight: {
    width: 26,
    height: 14,
    borderRadius: 999,
    backgroundColor: colors.border,
    opacity: 0.16,
  },
  skeletonBar: {
    height: 15,
    marginHorizontal: 4,
    borderRadius: 999,
    backgroundColor: colors.border,
    opacity: 0.14,
  },
}));

const SKELETON_ROWS = 4;

export default function PinnedCoursesProgress() {
  const styles = useStyles();
  const { t } = useTranslation();
  const { activeCustomCourseId, pinnedOfficialCourseIds } = useSettings();
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      setIsLoading(true);

      (async () => {
        try {
          const allCourses = await getCustomCoursesWithCardCounts();
          const officialPinned = new Set(pinnedOfficialCourseIds);
          const eligible = allCourses.filter((course) => {
            if (!course.reviewsEnabled) return false;
            if (course.isOfficial) {
              return (
                officialPinned.has(course.id) ||
                course.id === activeCustomCourseId
              );
            }
            return true;
          });

          const results = await Promise.all(
            eligible.map(async (course) => {
              const mastery = await getCustomCourseMasteryProgress(course.id);
              const total = course.cardsCount ?? 0;
              const learned = Math.min(total, mastery.completedCardsCount);
              return {
                key: course.id.toString(),
                label: course.name,
                learned,
                total,
                progress: total > 0 ? Math.min(1, learned / total) : 0,
              };
            })
          );

          if (!mounted) return;
          setItems(results);
          setIsLoading(false);
        } catch {
          if (!mounted) return;
          setItems([]);
          setIsLoading(false);
        }
      })();
      return () => {
        mounted = false;
      };
    }, [activeCustomCourseId, pinnedOfficialCourseIds])
  );

  return (
    <StatsCard
      title={t(
        "components.stats.pinnedCoursesProgress.title.postepPrzypietychKursow"
      )}
    >
      {isLoading ? (
        <View>
          {Array.from({ length: SKELETON_ROWS }, (_, index) => (
            <View key={index} style={styles.skeletonRow}>
              <View style={styles.skeletonLabel} />
              <View style={styles.skeletonMetaRow}>
                <View style={styles.skeletonMetaLeft} />
                <View style={styles.skeletonMetaRight} />
              </View>
              <View style={styles.skeletonBar} />
            </View>
          ))}
        </View>
      ) : items.length === 0 ? (
        <Text style={styles.empty}>
          {t(
            "components.stats.pinnedCoursesProgress.textChild.brakDanychDoWyswietlenia"
          )}
        </Text>
      ) : (
        <View>
          {items.map((it) => (
            <View key={it.key} style={styles.row}>
              <Text style={styles.label}>{it.label}</Text>
              <ProgressBar
                value={it.progress}
                label={t(
                  "components.stats.pinnedCoursesProgress.label.valueValue",
                  { learned: it.learned, total: it.total }
                )}
                showPercent={true}
              />
            </View>
          ))}
        </View>
      )}
    </StatsCard>
  );
}
