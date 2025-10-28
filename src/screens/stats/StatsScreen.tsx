import React, { useEffect, useState } from "react";
import { ScrollView, Text } from "react-native";
import { useStyles } from "./StatsScreen-styles";
// import { useSettings } from "@/src/contexts/SettingsContext";
import BigKnownWordsCard from "@/src/components/stats/BigKnownWordsCard";
import ActivityHeatmap, { type HeatmapDay } from "@/src/components/stats/ActivityHeatmap";
import PinnedCoursesProgress from "@/src/components/stats/PinnedCoursesProgress";
import HardWordsList from "@/src/components/stats/HardWordsList";
import HourlyActivityChart from "@/src/components/stats/HourlyActivityChart";
import { getDailyLearnedCountsBuiltin, getDailyLearnedCountsCustom, getHourlyActivityCounts } from "@/src/db/sqlite/db";

export default function StatsScreen() {
  const styles = useStyles();
  // const { activeCourse } = useSettings();
  const [heatmapData, setHeatmapData] = useState<HeatmapDay[]>([]);
  const [hourly, setHourly] = useState<number[]>(new Array(24).fill(0));
  const [selectedDay, setSelectedDay] = useState<HeatmapDay | null>(null);

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
        const [builtin, custom, hours] = await Promise.all([
          getDailyLearnedCountsBuiltin(start.getTime(), end.getTime()),
          getDailyLearnedCountsCustom(start.getTime(), end.getTime()),
          getHourlyActivityCounts(start.getTime(), end.getTime()),
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
        setHourly(hours);
      } catch (e) {
        if (mounted) {
          setHeatmapData([]);
          setHourly(new Array(24).fill(0));
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

      <ActivityHeatmap
        data={heatmapData}
        days={90}
        onSelect={(d) => setSelectedDay(d)}
      />
      {selectedDay ? (
        <Text style={{ textAlign: "center" }}>
          {selectedDay.date}: {selectedDay.count} opanowanych
        </Text>
      ) : null}

      <HardWordsList />

      <HourlyActivityChart hours={hourly} />
    </ScrollView>
  );
};
