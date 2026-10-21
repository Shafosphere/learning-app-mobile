import { statsTileStyle } from "./statsTileStyle";
import React from "react";
import { View, Text } from "react-native";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import StatsSectionHeader from "./StatsSectionHeader";
import { useTranslation } from "react-i18next";
import { statsSectionStyles } from "@/src/screens/stats/StatsScreen/statsDesign";

type Props = {
  timeMs: {
    week: number;
    month: number;
    year: number;
  };
};

function withAlpha(color: string, alpha: string) {
  if (/^#[0-9a-f]{8}$/i.test(color)) {
    return `${color.slice(0, 7)}${alpha}`;
  }
  if (/^#[0-9a-f]{6}$/i.test(color)) {
    return `${color}${alpha}`;
  }
  return color;
}

const useStyles = createThemeStylesHook((colors) => ({
  section: {
    ...statsSectionStyles.section,
  },
  metricsList: { gap: 14 },
  metricCard: {
    ...statsTileStyle,
    backgroundColor: colors.secondBackground,
    overflow: "hidden",
  },
  metricTint: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  metricContent: {
    flex: 1,
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  metricHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    columnGap: 16,
    rowGap: 8,
  },
  metricCopy: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 120,
    minWidth: 0,
    gap: 3,
  },
  metricLabel: {
    color: colors.headline,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700",
  },
  metricDescription: {
    color: colors.paragraph,
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
  progressTrack: {
    height: 15,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  metricValue: {
    flexShrink: 1,
    minWidth: 0,
    color: colors.headline,
    fontSize: 36,
    lineHeight: 44,
    fontWeight: "800",
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  metricUnit: {
    fontSize: 24,
    fontWeight: "700",
  },
}));

function formatDuration(ms: number) {
  if (!ms || ms <= 0) return { value: "0", unit: "min" };
  const totalMinutes = Math.max(1, Math.round(ms / 60_000));
  if (totalMinutes < 60) return { value: `${totalMinutes}`, unit: "min" };

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return {
    value: `${hours} h`,
    unit: minutes > 0 ? `${minutes} min` : "",
  };
}

export default function LearningTimeCard({ timeMs }: Props) {
  const styles = useStyles();
  const { t } = useTranslation();
  const rows = [
    {
      key: "week",
      label: t("components.stats.hourlyActivityChart.period.thisWeek"),
      description: t("components.stats.hourlyActivityChart.periodDescription.week"),
      time: timeMs.week,
      value: formatDuration(timeMs.week),
      tint: "#54B7FF",
      accent: "#00BFC6",
    },
    {
      key: "month",
      label: t("components.stats.hourlyActivityChart.period.thisMonth"),
      description: t("components.stats.hourlyActivityChart.periodDescription.month"),
      time: timeMs.month,
      value: formatDuration(timeMs.month),
      tint: "#FFC83D",
      accent: "#F5B800",
    },
    {
      key: "year",
      label: t("components.stats.hourlyActivityChart.period.thisYear"),
      description: t("components.stats.hourlyActivityChart.periodDescription.year"),
      time: timeMs.year,
      value: formatDuration(timeMs.year),
      tint: "#9B78FF",
      accent: "#9270F5",
    },
  ];

  return (
    <View style={styles.section}>
      <StatsSectionHeader
        title={t("components.stats.hourlyActivityChart.title.czasWNauce")}
        subtitle={t(
          "components.stats.hourlyActivityChart.subtitle.sumaCzasuSpedzonegoNaKartach"
        )}
      />

      <View style={styles.metricsList}>
        {rows.map((row) => {
          // The nested calendar periods are shown relative to the year's total.
          const progress = timeMs.year > 0
            ? Math.max(0, Math.min(1, row.time / timeMs.year))
            : 0;

          return (
            <View key={row.key} style={styles.metricCard}>
              <View
                pointerEvents="none"
                style={[styles.metricTint, { backgroundColor: withAlpha(row.tint, "18") }]}
              />
              <View style={styles.metricContent}>
                <View style={styles.metricHeader}>
                  <View style={styles.metricCopy}>
                    <Text style={styles.metricLabel}>{row.label}</Text>
                    <Text style={styles.metricDescription}>{row.description}</Text>
                  </View>
                  <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>
                    {row.value.value}
                    {row.value.unit ? (
                      <Text style={styles.metricUnit}>{` ${row.value.unit}`}</Text>
                    ) : null}
                  </Text>
                </View>
                <View
                  accessible
                  accessibilityRole="progressbar"
                  accessibilityLabel={t("components.stats.hourlyActivityChart.shareOfYear", { period: row.label })}
                  accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
                  style={[styles.progressTrack, { backgroundColor: withAlpha(row.accent, "26") }]}
                >
                  <View style={[
                    styles.progressFill,
                    {
                      width: `${progress * 100}%`,
                      minWidth: progress > 0 ? 15 : 0,
                      backgroundColor: row.accent,
                    },
                  ]} />
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
