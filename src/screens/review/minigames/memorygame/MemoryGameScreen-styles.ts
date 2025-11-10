import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
    backgroundColor: colors.background,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center" as const,
    marginTop: 8,
    marginBottom: 24,
    color: colors.headline,
  },
  grid: {
    flexGrow: 1,
    justifyContent: "center" as const,
  },
  row: {
    flex: 1,
    justifyContent: "space-between" as const,
    marginBottom: 20,
  },
  card: {
    flex: 1,
    aspectRatio: 1.8,
    marginHorizontal: 8,
  },
  placeholderCard: {
    flex: 1,
    // aspectRatio: 0.85,
    marginHorizontal: 8,
    opacity: 0,
  },
  cardInner: {
    flex: 1,
    overflow: "hidden",
    position: "relative" as const,
  },
  cardFace: {
    position: "absolute" as const,
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 16,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backfaceVisibility: "hidden" as const,
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  cardFrontLabel: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.headline,
    textAlign: "center" as const,
  },
  loader: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  emptyText: {
    fontSize: 18,
    color: colors.headline,
    textAlign: "center" as const,
  },
}));
