import React, { useMemo, useState } from "react";
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
  container: {
    alignSelf: "stretch",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.headline,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.paragraph,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  selectionLabel: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: "500",
    color: colors.paragraph,
  },
  grid: {
    flexDirection: "row",
    alignSelf: "stretch",
    paddingVertical: 4,
    flex: 1,
  },
  week: {},
  cell: {},
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    gap: 12,
  },
  legendLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
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
  legendValue: {
    fontSize: 13,
    color: colors.paragraph,
    textAlign: "right",
    flexShrink: 0,
  },
}));

function getScale(base: string, zero: string) {
  // light → strong scale using theme green; zero state uses border color
  return [
    zero,
    base + "33", // ~20%
    base + "66", // ~40%
    base + "99", // ~60%
    base, // 100%
  ];
}

export default function ActivityHeatmap({ data, days = 90, onSelect }: Props) {
  const styles = useStyles();
  const { colors } = useSettings();
  const scale = getScale(colors.my_green, colors.border);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<HeatmapDay | null>(null);

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

  const monthLabel = useMemo(() => {
    const lastDate = daysArr[daysArr.length - 1]?.date;
    if (!lastDate) return "";
    const d = new Date(lastDate);
    if (Number.isNaN(d.getTime())) return lastDate.slice(0, 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, [daysArr]);

  const weeksCount = weeks.length || 1;
  const baseGap = 6;
  const gapFactor = 0.25;
  const minSize = 12;
  const maxSize = 24;

  const { cellSize, cellGap } = useMemo(() => {
    if (!containerWidth) {
      const fallbackSize = minSize;
      const fallbackGap = Math.max(baseGap, Math.floor(fallbackSize * gapFactor));
      return { cellSize: fallbackSize, cellGap: fallbackGap };
    }

    if (weeksCount <= 1) {
      const size = Math.max(minSize, Math.min(maxSize, containerWidth));
      return { cellSize: size, cellGap: 0 };
    }

    // Start with gap proportional to size; solve width equation with gapFactor
    const idealSize = containerWidth / (weeksCount + (weeksCount - 1) * gapFactor);
    let size = Math.max(minSize, Math.min(maxSize, idealSize));
    let gap = Math.max(baseGap, size * gapFactor);

    // Recalculate if we're underfilling; distribute extra space into gaps
    let used = weeksCount * size + (weeksCount - 1) * gap;
    if (used < containerWidth) {
      const extra = containerWidth - used;
      gap += extra / (weeksCount - 1);
      used = weeksCount * size + (weeksCount - 1) * gap;
    }

    // If we overflow, shrink size based on baseGap as minimum
    if (used > containerWidth) {
      size = Math.max(
        minSize,
        Math.min(
          maxSize,
          (containerWidth - (weeksCount - 1) * baseGap) / weeksCount
        )
      );
      gap = Math.max(baseGap, size * gapFactor);
      const overUsed = weeksCount * size + (weeksCount - 1) * gap;
      if (overUsed > containerWidth && weeksCount > 1) {
        const reduce = (overUsed - containerWidth) / (weeksCount - 1);
        gap = Math.max(baseGap, gap - reduce);
      }
    }

    return { cellSize: size, cellGap: gap };
  }, [containerWidth, weeksCount, baseGap, gapFactor, minSize, maxSize]);

  const cellRadius = Math.max(2, Math.floor(cellSize / 4));

  return (
    <View style={styles.container} onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Ostatnia aktywność</Text>
        <View style={styles.headerRight}>
          {selectedDay ? (
            <Text
              style={[
                styles.selectionLabel,
                {
                  color:
                    selectedDay.count === 0 ? colors.my_red : colors.my_green,
                },
              ]}
            >
              {selectedDay.date}: {selectedDay.count}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.grid}>
        {weeks.map((week, wi) => (
          <View
            key={wi}
            style={[
              styles.week,
              wi === weeks.length - 1 ? { marginRight: 0 } : { marginRight: cellGap },
            ]}
          >
            {week.map((day, di) => (
              <Pressable
                key={`${wi}-${di}`}
                onPress={() => {
                  setSelectedDay(day);
                  onSelect?.(day);
                }}
                style={[
                  styles.cell,
                  {
                    width: cellSize,
                    height: cellSize,
                    borderRadius: cellRadius,
                    marginBottom: cellGap,
                    backgroundColor: pickColor(day.count),
                    borderWidth: 1,
                    borderColor: colors.paragraph,
                  },
                ]}
              />
            ))}
          </View>
        ))}
      </View>
      <View style={styles.legendRow}>
        <View style={styles.legendLeft}>
          <Text style={styles.legendLabel}>mniej</Text>
          {scale.map((c, i) => (
            <View
              key={i}
              style={[
                styles.legendCell,
                {
                  backgroundColor: c,
                  borderWidth: 1,
                  borderColor: colors.paragraph,
                },
              ]}
            />
          ))}
          <Text style={styles.legendLabel}>więcej</Text>
        </View>
      </View>
    </View>
  );
}
