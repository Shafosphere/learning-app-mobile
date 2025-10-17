import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { useSettings } from "@/src/contexts/SettingsContext";

export type HeatmapDay = { date: string; count: number };

type Props = {
  data: HeatmapDay[];
  days?: number; // default 90
  onSelect?: (day: HeatmapDay) => void;
};

const useStyles = createThemeStylesHook((colors) => ({
  grid: {
    flexDirection: "row",
  },
  week: {
    marginRight: 4,
  },
  cell: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginBottom: 2,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 6,
  },
  legendCell: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendLabel: {
    fontSize: 12,
    color: colors.paragraph,
  },
}));

function getScale(base: string) {
  // light → strong scale using theme green
  return [
    "#EAEAEA",
    base + "33", // ~20%
    base + "66", // ~40%
    base + "99", // ~60%
    base, // 100%
  ];
}

export default function ActivityHeatmap({ data, days = 90, onSelect }: Props) {
  const styles = useStyles();
  const { colors } = useSettings();
  const scale = getScale(colors.my_green);

  const map = useMemo(() => {
    const m = new Map<string, number>();
    for (const item of data) m.set(item.date, item.count | 0);
    return m;
  }, [data]);

  const daysArr = useMemo(() => {
    const list: { date: string; count: number }[] = [];
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(end.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      list.push({ date: dateStr, count: map.get(dateStr) ?? 0 });
    }
    return list;
  }, [days, map]);

  const max = useMemo(() => {
    let m = 0;
    for (const item of daysArr) m = Math.max(m, item.count);
    return m || 1;
  }, [daysArr]);

  const weeks = useMemo(() => {
    const result: { date: string; count: number }[][] = [];
    for (let i = 0; i < daysArr.length; i += 7) {
      result.push(daysArr.slice(i, i + 7));
    }
    return result;
  }, [daysArr]);

  const pickColor = (count: number) => {
    if (count <= 0) return scale[0];
    const idx = Math.min(4, Math.ceil((count / max) * 4));
    return scale[idx];
  };

  return (
    <View>
      <View style={styles.grid}>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.week}>
            {week.map((day, di) => (
              <Pressable
                key={`${wi}-${di}`}
                onPress={() => onSelect?.(day)}
                style={[styles.cell, { backgroundColor: pickColor(day.count) }]}
              />
            ))}
          </View>
        ))}
      </View>
      <View style={styles.legendRow}>
        <Text style={styles.legendLabel}>mniej</Text>
        {scale.map((c, i) => (
          <View key={i} style={[styles.legendCell, { backgroundColor: c }]} />
        ))}
        <Text style={styles.legendLabel}>więcej</Text>
      </View>
    </View>
  );
}
