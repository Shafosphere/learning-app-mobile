import type { TextStyle, ViewStyle } from "react-native";
import { statsTileStyle } from "@/src/components/stats/statsTileStyle";
import type { ThemePalette } from "@/src/theme/theme";

/**
 * Shared hierarchy and spacing for every statistics section.
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
    fontSize: 14,
    lineHeight: 20,
  },
  cardTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
  },
  badgeText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
  },
  metricValue: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  metricLabel: {
    fontSize: 16,
    lineHeight: 22,
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
    gap: 12,
  },
  card: {
    ...statsTileStyle,
    flex: 0,
    alignSelf: "stretch",
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 88,
    padding: 16,
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
    gap: 12,
  },
  trailingIndicator: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    gap: 4,
  },
  progressTrack: {
    height: 8,
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

/** Repeating decorative backgrounds for course and flashcard thumbnails. */
export const statsIconBackgrounds = ["#E8F0FF", "#E8FAED", "#EEE9FF", "#FFECEF"] as const;

/** Green: progress, success, and learning time; red: streak and errors. */
export function statsIconBackground(color: string) {
  return /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(color)
    ? `${color.slice(0, 7)}26`
    : color;
}

export function statsAccent(colors: ThemePalette) {
  return {
    progress: colors.my_green,
    streak: colors.my_red,
    difficulty: colors.my_red,
    time: colors.my_green,
  };
}
