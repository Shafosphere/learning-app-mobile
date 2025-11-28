import React, { useEffect, useState } from "react";
import { ScrollView } from "react-native";
import { useStyles } from "./StatsScreen-styles";
// import { useSettings } from "@/src/contexts/SettingsContext";
import BigKnownWordsCard from "@/src/components/stats/BigKnownWordsCard";
import ActivityHeatmap, { type HeatmapDay } from "@/src/components/stats/ActivityHeatmap";
import PinnedCoursesProgress from "@/src/components/stats/PinnedCoursesProgress";
import HardWordsList from "@/src/components/stats/HardWordsList";
import LearningTimeCard from "@/src/components/stats/HourlyActivityChart";
import { getDailyLearnedCountsBuiltin, getDailyLearnedCountsCustom, getTotalLearningTimeMs } from "@/src/db/sqlite/db";

export default function StatsScreen() {
  const styles = useStyles();
  // const { activeCourse } = useSettings();
  const [heatmapData, setHeatmapData] = useState<HeatmapDay[]>([]);
  const [learningTime, setLearningTime] = useState({
    week: 0,
    month: 0,
    year: 0,
  });

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
        const [builtin, custom] = await Promise.all([
          getDailyLearnedCountsBuiltin(start.getTime(), end.getTime()),
          getDailyLearnedCountsCustom(start.getTime(), end.getTime()),
        ]);
        if (!mounted) return;
        // Merge builtin + custom by date
        const map = new Map<string, number>();
        for (const it of builtin) map.set(it.date, (map.get(it.date) ?? 0) + it.count);
        for (const it of custom) map.set(it.date, (map.get(it.date) ?? 0) + it.count);
        const arr: HeatmapDay[] = Array.from(map.entries())
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date));
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
    <ScrollView contentContainerStyle={styles.container}>
      <BigKnownWordsCard />

      <PinnedCoursesProgress />

      <ActivityHeatmap data={heatmapData} days={90} />

      <HardWordsList />

      <LearningTimeCard timeMs={learningTime} />
    </ScrollView>
  );
};
