import React, { useEffect, useState } from "react";
import { ScrollView } from "react-native";
import { useStyles } from "./StatsScreen-styles";
import { useSettings } from "@/src/contexts/SettingsContext";
import ActivityHeatmap, { type HeatmapDay } from "@/src/components/stats/ActivityHeatmap";
import BigKnownWordsCard from "@/src/components/stats/BigKnownWordsCard";
// import MedalsShowcase from "@/src/components/stats/bookshelf";
import HardWordsList from "@/src/components/stats/HardWordsList";
import LearningTimeCard from "@/src/components/stats/HourlyActivityChart";
import PinnedCoursesProgress from "@/src/components/stats/PinnedCoursesProgress";
import {
  getDailyLearnedCountsCustom,
  getDailyLearningTimeMsCustom,
  getTotalLearningTimeMs,
} from "@/src/db/sqlite/db";

export default function StatsScreen() {
  const styles = useStyles();
  const { statsBookshelfEnabled } = useSettings();
  const [heatmapData, setHeatmapData] = useState<HeatmapDay[]>([]);
  const [learningTime, setLearningTime] = useState({
    week: 0,
    month: 0,
    year: 0,
  });
  const [isBookshelfEditing, setIsBookshelfEditing] = useState(false);

  useEffect(() => {
    if (!statsBookshelfEnabled) setIsBookshelfEditing(false);
  }, [statsBookshelfEnabled]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      const start = new Date(end);
      start.setDate(start.getDate() - 89);
      start.setHours(0, 0, 0, 0);
      try {
        const [customCounts, customTimes] = await Promise.all([
          getDailyLearnedCountsCustom(start.getTime(), end.getTime()),
          getDailyLearningTimeMsCustom(start.getTime(), end.getTime()),
        ]);
        if (!mounted) return;
        const merged = new Map<string, HeatmapDay>();
        for (const item of customCounts) {
          merged.set(item.date, {
            date: item.date,
            count: item.count,
            timeMs: 0,
          });
        }
        for (const item of customTimes) {
          const prev = merged.get(item.date);
          merged.set(item.date, {
            date: item.date,
            count: prev?.count ?? 0,
            timeMs: item.ms,
          });
        }
        const arr: HeatmapDay[] = Array.from(merged.values()).sort((a, b) =>
          a.date.localeCompare(b.date)
        );
        setHeatmapData(arr);
      } catch {
        if (mounted) {
          setHeatmapData([]);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const now = new Date();
    const end = now.getTime();

    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay(); // Sunday = 0, Monday = 1
    const diff = day === 0 ? -6 : 1 - day;
    startOfWeek.setDate(startOfWeek.getDate() + diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now);
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const startOfYear = new Date(now);
    startOfYear.setMonth(0, 1);
    startOfYear.setHours(0, 0, 0, 0);

    (async () => {
      try {
        const [weekMs, monthMs, yearMs] = await Promise.all([
          getTotalLearningTimeMs(startOfWeek.getTime(), end),
          getTotalLearningTimeMs(startOfMonth.getTime(), end),
          getTotalLearningTimeMs(startOfYear.getTime(), end),
        ]);
        if (!mounted) return;
        setLearningTime({
          week: weekMs,
          month: monthMs,
          year: yearMs,
        });
      } catch {
        if (mounted) {
          setLearningTime({
            week: 0,
            month: 0,
            year: 0,
          });
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      scrollEnabled={!isBookshelfEditing}
    >
      <BigKnownWordsCard />

      {/* {statsBookshelfEnabled && (
        <MedalsShowcase onEditModeChange={setIsBookshelfEditing} />
      )} */}

      <PinnedCoursesProgress />

      <ActivityHeatmap data={heatmapData} days={90} />

      <HardWordsList />

      <LearningTimeCard timeMs={learningTime} />
    </ScrollView>
  );
};
