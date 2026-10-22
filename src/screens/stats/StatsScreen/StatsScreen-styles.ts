import { statsTileStyle } from "@/src/components/stats/statsTileStyle";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { statsMetricStyles, statsSectionStyles, statsTypography } from "./statsDesign";

const STATS_TABLET_MAX_WIDTH = 500;

export const useStyles = createThemeStylesHook((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    width: "100%",
    alignSelf: "center",
  },
  contentTablet: {
    maxWidth: STATS_TABLET_MAX_WIDTH,
  },
  tabs: {
    width: "auto",
    maxWidth: STATS_TABLET_MAX_WIDTH,
    alignSelf: "center",
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 0,
  },
  historyContent: {
    flex: 1,
    width: "100%",
    alignSelf: "center",
  },
  scrollContent: {
    padding: 20,
    ...statsSectionStyles.list,
    backgroundColor: colors.background,
  },
  section: { ...statsSectionStyles.section },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  columnCard: {
    flexBasis: "48%",
    flexGrow: 1,
  },
  miniStatsRow: {
    ...statsMetricStyles.list,
  },
  miniStatItem: {
    ...statsTileStyle,
    backgroundColor: colors.secondBackground,
  },
  miniStatCard: {
    ...statsMetricStyles.card,
    overflow: "hidden",
  },
  miniStatCopy: {
    ...statsMetricStyles.copy,
  },
  miniStatIconTile: {
    ...statsMetricStyles.iconContainer,
  },
  miniStatValue: {
    ...statsTypography.metricValue,
    color: colors.headline,
  },
  miniStatShieldStack: {
    ...statsMetricStyles.trailingIndicator,
  },
  miniStatLabel: {
    ...statsTypography.metricLabel,
    color: colors.paragraph,
  },
  emptyWrap: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.headline,
  },
  emptyText: {
    fontSize: 14,
    color: colors.paragraph,
    textAlign: "center",
  },
}));
