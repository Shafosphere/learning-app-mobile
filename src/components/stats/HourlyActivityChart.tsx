import React from "react";
import { View, Text } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import StatsSectionHeader from "./StatsSectionHeader";
import { useTranslation } from "react-i18next";

type Props = {
  timeMs: {
    week: number;
    month: number;
    year: number;
  };
};

const CLOCK_COLOR = "#079A7F";

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
  card: {
    backgroundColor: colors.secondBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  header: {
    marginBottom: 18,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minHeight: 116,
    borderWidth: 1,
    borderColor: withAlpha(colors.my_green, "22"),
    borderRadius: 14,
    backgroundColor: withAlpha(colors.my_green, "08"),
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 14,
  },
  metricLabel: {
    color: colors.paragraph,
    fontSize: 14,
    lineHeight: 18,
    textAlign: "center",
    opacity: 0.86,
  },
  metricValue: {
    marginTop: 18,
    color: colors.headline,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800",
    textAlign: "center",
  },
  metricUnit: {
    color: colors.headline,
    fontSize: 16,
    lineHeight: 20,
    textAlign: "center",
  },
  infoBox: {
    marginTop: 18,
    borderRadius: 16,
    backgroundColor: withAlpha(colors.my_green, "10"),
    borderWidth: 1,
    borderColor: withAlpha(colors.my_green, "20"),
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  infoCopy: {
    minWidth: 0,
  },
  infoTitle: {
    color: colors.headline,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "800",
  },
  infoText: {
    marginTop: 5,
    color: colors.paragraph,
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.8,
  },
}));

function formatDuration(ms: number) {
  if (!ms || ms <= 0) return { value: "0", unit: "min" };
  const hours = ms / 3_600_000;
  if (hours >= 10) return { value: `${Math.round(hours)}`, unit: "h" };
  if (hours >= 1) return { value: hours.toFixed(1), unit: "h" };
  const minutes = Math.max(1, Math.round(ms / 60_000));
  return { value: `${minutes}`, unit: "min" };
}

export default function LearningTimeCard({ timeMs }: Props) {
  const styles = useStyles();
  const { t } = useTranslation();
  const rows = [
    {
      label: t("components.stats.hourlyActivityChart.period.thisWeek"),
      value: formatDuration(timeMs.week),
    },
    {
      label: t("components.stats.hourlyActivityChart.period.thisMonth"),
      value: formatDuration(timeMs.month),
    },
    {
      label: t("components.stats.hourlyActivityChart.period.thisYear"),
      value: formatDuration(timeMs.year),
    },
  ];

  return (
    <View style={styles.card}>
      <StatsSectionHeader
        style={styles.header}
        icon={<Ionicons name="time-outline" size={30} color={CLOCK_COLOR} />}
        iconBackgroundColor="#DFF7EF"
        iconShadowColor={CLOCK_COLOR}
        title={t("components.stats.hourlyActivityChart.title.czasWNauce")}
        subtitle={t(
          "components.stats.hourlyActivityChart.subtitle.sumaCzasuSpedzonegoNaKartach"
        )}
      />

      <View style={styles.metricsRow}>
        {rows.map((row) => (
          <View key={row.label} style={styles.metricCard}>
            <Text style={styles.metricLabel}>{row.label}</Text>
            <Text style={styles.metricValue}>{row.value.value}</Text>
            <Text style={styles.metricUnit}>{row.value.unit}</Text>
          </View>
        ))}
      </View>

      <View style={styles.infoBox}>
        <View style={styles.infoCopy}>
          <Text style={styles.infoTitle}>
            {t("components.stats.hourlyActivityChart.textChild.jakLiczymyCzas")}
          </Text>
          <Text style={styles.infoText}>
            {t(
              "components.stats.hourlyActivityChart.textChild.czasLiczonyJestOdMomentu"
            )}
          </Text>
        </View>
      </View>
    </View>
  );
}
