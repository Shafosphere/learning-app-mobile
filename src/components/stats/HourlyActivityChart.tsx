import React from "react";
import Svg, { Circle, Path, Text as SvgText } from "react-native-svg";
import { useSettings } from "@/src/contexts/SettingsContext";
import StatsProgressCard from "./StatsProgressCard";
import StatsDataBar from "./StatsDataBar";
import { View, Text } from "react-native";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { useTranslation } from "react-i18next";
import { statsAccent, statsIconSizes, statsMetricStyles, statsProgressStyles, statsSectionStyles, statsTypography } from "@/src/screens/stats/StatsScreen/statsDesign";

type Props = {
  timeMs: {
    week: number;
    month: number;
    year: number;
  };
};

const useStyles = createThemeStylesHook((colors) => ({
  section: {
    ...statsSectionStyles.section,
  },
  metricContent: { ...statsProgressStyles.row, borderBottomColor: colors.border },
  lastRow: { ...statsProgressStyles.lastRow },
  icon: { ...statsMetricStyles.iconContainer, backgroundColor: colors.background },
  metricHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    columnGap: 12,
    rowGap: 8,
  },
  metricCopy: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 120,
    minWidth: 0,
    gap: 4,
  },
  metricLabel: {
    color: colors.headline,
    fontSize: 16,
    fontWeight: "600",
  },
  metricDescription: {
    color: colors.paragraph,
    fontSize: 13,
    lineHeight: 18,
  },
  metricValue: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    color: colors.headline,
    ...statsTypography.metricValue,
    fontSize: 28,
    lineHeight: 34,
    textAlign: "right",
  },
  metricUnit: {
    ...statsTypography.metricLabel,
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

function LearningPeriodIcon({ days, color }: { days: number; color: string }) {
  return (
    <Svg width={statsIconSizes.metric} height={statsIconSizes.metric} viewBox="0 0 48 48" accessible={false}>
      <Circle cx={24} cy={28} r={17} fill="none" stroke={color} strokeWidth={4} />
      <Path
        d="M20 3h8M24 3v8M37 15l4-4"
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <SvgText
        x={24}
        y={28}
        fill={color}
        fontSize={days === 365 ? 15 : 20}
        fontWeight="900"
        textAnchor="middle"
        alignmentBaseline="central"
      >
        {days}
      </SvgText>
    </Svg>
  );
}

export default function LearningTimeCard({ timeMs }: Props) {
  const styles = useStyles();
  const { t } = useTranslation();
  const { colors } = useSettings();
  const accents = statsAccent(colors);
  const rows = [
    {
      key: "week",
      days: 7,
      label: t("components.stats.hourlyActivityChart.period.thisWeek"),
      description: t("components.stats.hourlyActivityChart.periodDescription.week"),
      time: timeMs.week,
      value: formatDuration(timeMs.week),
    },
    {
      key: "month",
      days: 31,
      label: t("components.stats.hourlyActivityChart.period.thisMonth"),
      description: t("components.stats.hourlyActivityChart.periodDescription.month"),
      time: timeMs.month,
      value: formatDuration(timeMs.month),
    },
    {
      key: "year",
      days: 365,
      label: t("components.stats.hourlyActivityChart.period.thisYear"),
      description: t("components.stats.hourlyActivityChart.periodDescription.year"),
      time: timeMs.year,
      value: formatDuration(timeMs.year),
    },
  ];

  return (
    <View style={styles.section}>
      <StatsProgressCard
        title={t("components.stats.hourlyActivityChart.title.czasWNauce")}
        subtitle={t("components.stats.hourlyActivityChart.subtitle.sumaCzasuSpedzonegoNaKartach")}
        headerDivider
      >
        {rows.map((row, index) => {
          // The nested calendar periods are shown relative to the year's total.
          const progress = timeMs.year > 0
            ? Math.max(0, Math.min(1, row.time / timeMs.year))
            : 0;

          return (
            <View key={row.key} style={[styles.metricContent, index === rows.length - 1 && styles.lastRow]}>
              <View style={styles.metricHeader}>
                <View
                  style={styles.icon}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                >
                  <LearningPeriodIcon days={row.days} color={accents.time} />
                </View>
                <View style={styles.metricCopy}>
                  <Text style={styles.metricLabel}>{row.label}</Text>
                  <Text style={styles.metricDescription}>{row.description}</Text>
                </View>
                <Text style={styles.metricValue}>
                  {row.value.value}
                  {row.value.unit ? (
                    <Text style={styles.metricUnit}>{` ${row.value.unit}`}</Text>
                  ) : null}
                </Text>
              </View>
              <StatsDataBar
                progress={progress}
                color={accents.time}
                label={t("components.stats.hourlyActivityChart.shareOfYear", { period: row.label })}
              />
            </View>
          );
        })}
      </StatsProgressCard>
    </View>
  );
}
