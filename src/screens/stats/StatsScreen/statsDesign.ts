import type { TextStyle, ViewStyle } from "react-native";
import { statsTileStyle } from "@/src/components/stats/statsTileStyle";

/**
 * Statistics screen defaults, taken from the ActivityHeatmap metric tiles.
 * Spread typography into createThemeStylesHook so accessibility text scaling
 * still applies. Keep theme colors and component-specific margins local.
 */
export const statsTypography = {
  sectionTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
  },
  badgeText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
  },
  metricValue: {
    fontSize: 44,
    lineHeight: 48,
    fontWeight: "800",
  },
  metricLabel: {
    fontSize: 22,
    lineHeight: 28,
  },
} satisfies Record<string, TextStyle>;

export const statsIconSizes = {
  badge: 16,
  indicator: 32,
  metric: 44,
} as const;

export const statsMetricStyles = {
  list: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 16,
  },
  card: {
    ...statsTileStyle,
    flex: 0,
    alignSelf: "stretch",
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    minHeight: 100,
    padding: 12,
  },
  iconContainer: {
    width: 68,
    height: 68,
    borderRadius: 18,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  trailingIndicator: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    gap: 4,
  },
  indicatorChart: {
    alignSelf: "flex-end",
    height: statsIconSizes.metric,
    flexDirection: "row",
    alignItems: "flex-end",
    flexShrink: 0,
    gap: 4,
  },
  indicatorChartBar: {
    width: 8,
    borderRadius: 4,
  },
  progressTrack: {
    height: 15,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressContent: {
    gap: 8,
  },
} satisfies Record<string, ViewStyle>;

/** A heading and its content share this frame; adjacent sections are 24 apart. */
export const statsSectionStyles = {
  section: { gap: 12 },
  list: { gap: 24 },
} satisfies Record<string, ViewStyle>;

/** Shared frame and row layout for statistics progress lists. */
export const statsProgressStyles = {
  wrapper: { ...statsSectionStyles.section },
  card: { marginBottom: 0, padding: 0 },
  cardContent: { ...statsTileStyle, overflow: "hidden" },
  row: {
    ...statsMetricStyles.card,
    ...statsMetricStyles.progressContent,
    flexDirection: "column",
    alignItems: "stretch",
    borderRadius: 0,
    borderBottomWidth: 1,
  },
  lastRow: { borderBottomWidth: 0 },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
} satisfies Record<string, ViewStyle | TextStyle>;

export const statsIconBackgrounds = ["#E8F0FF", "#E8FAED", "#EEE9FF", "#FFECEF"] as const;
