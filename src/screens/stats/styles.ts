import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  container: {
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
