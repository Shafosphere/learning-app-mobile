import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
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

const SKELETON_ROWS = 4;
const MAX_VISIBLE_ROWS = 5;
const PROGRESS_ROW_MARGIN_BOTTOM = 12;

const useStyles = createThemeStylesHook((colors) => ({
  wrapper: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.headline,
    marginBottom: 8,
  },
  card: {
    marginBottom: 0,
  },
  row: {
    marginBottom: PROGRESS_ROW_MARGIN_BOTTOM,
  },
  lastRow: {
    marginBottom: 0,
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

export default function PinnedCoursesProgress() {
  const styles = useStyles();
  const { t } = useTranslation();
  const { activeCustomCourseId, pinnedOfficialCourseIds } = useSettings();
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rowHeights, setRowHeights] = useState<Record<number, number>>({});

  const measuredListMaxHeight = useMemo(() => {
    if (items.length <= MAX_VISIBLE_ROWS) return undefined;

    const visibleHeights = Array.from(
      { length: MAX_VISIBLE_ROWS },
      (_, index) => rowHeights[index]
    );

    if (visibleHeights.some((height) => !height)) return undefined;

    const visibleContentHeight = visibleHeights.reduce(
      (sum, height) => sum + height,
      0
    );

    return Math.ceil(
      visibleContentHeight +
        PROGRESS_ROW_MARGIN_BOTTOM * (MAX_VISIBLE_ROWS - 1)
    );
  }, [items.length, rowHeights]);

  const handleRowLayout = useCallback((index: number, height: number) => {
    if (index >= MAX_VISIBLE_ROWS) return;

    setRowHeights((current) => {
      if (current[index] === height) return current;
      return { ...current, [index]: height };
    });
  }, []);

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
          const sortedResults = results.sort(
            (a, b) => b.progress - a.progress || a.label.localeCompare(b.label)
          );

          if (!mounted) return;
          setItems(sortedResults);
          setRowHeights({});
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
    <View style={styles.wrapper}>
      <Text style={styles.title}>
        {t(
          "components.stats.pinnedCoursesProgress.title.postepPrzypietychKursow"
        )}
      </Text>
      <StatsCard style={styles.card}>
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
          <ScrollView
            testID="pinned-courses-progress-list"
            style={
              measuredListMaxHeight ? { maxHeight: measuredListMaxHeight } : null
            }
            nestedScrollEnabled
            showsVerticalScrollIndicator={items.length > MAX_VISIBLE_ROWS}
          >
            {items.map((it, index) => (
              <View
                key={it.key}
                style={[
                  styles.row,
                  index === items.length - 1 && styles.lastRow,
                ]}
                onLayout={(event) =>
                  handleRowLayout(index, event.nativeEvent.layout.height)
                }
              >
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
          </ScrollView>
        )}
      </StatsCard>
    </View>
  );
}
