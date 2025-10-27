import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 18,
    paddingTop: 32,
    paddingBottom: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 120,
  },
  section: {
    backgroundColor: colors.secondBackground,
    borderRadius: 16,
    padding: 16,
    paddingTop: 32,
  },
  sectionHeader: {
    fontSize: 24,
    textTransform: "uppercase",
    position: "absolute" as const,
    fontWeight: "900",
    right: 24,
    top: 24,
    color: colors.headline,
  },
  manualAddIcon: {
    color: colors.headline,
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 30,
  },
  cardActionIcon: {
    color: colors.headline,
  },
  footer: {
    width: "100%",
    paddingBottom: 24,
    backgroundColor: colors.background,
    alignItems: "center" as const,
  },
  buttonsRow: {
    borderColor: colors.border,
    borderTopWidth: 3,
    paddingTop: 15,
    width: "100%",
    flexDirection: "row" as const,
    justifyContent: "flex-end" as const,
    gap: 10,
  },
}));
