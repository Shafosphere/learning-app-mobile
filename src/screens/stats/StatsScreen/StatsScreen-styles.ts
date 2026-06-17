import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

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
  scrollContent: {
    padding: 20,
    gap: 16,
    backgroundColor: colors.background,
  },
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
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  miniStatItem: {
    flex: 1,
  },
  miniStatCard: {
    minHeight: 86,
    borderRadius: 16,
    backgroundColor: colors.secondBackground,
    paddingVertical: 16,
    paddingHorizontal: 14,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  miniStatValue: {
    fontSize: 34,
    fontWeight: "800",
    color: colors.headline,
  },
  miniStatCornerIcon: {
    position: "absolute",
    right: 12,
    bottom: 12,
    opacity: 0.95,
  },
  miniStatShieldStack: {
    position: "absolute",
    left: 12,
    bottom: 12,
    flexDirection: "row",
    gap: 2,
    opacity: 0.95,
  },
  miniStatLabel: {
    marginTop: 6,
    fontSize: 12,
    color: colors.paragraph,
    opacity: 0.8,
    textAlign: "center",
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
