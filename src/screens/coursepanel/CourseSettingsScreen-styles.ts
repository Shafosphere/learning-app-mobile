import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useCourseSettingsStyles = createThemeStylesHook((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 120,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },
  toggleTextWrapper: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.headline,
  },
  toggleSubtitle: {
    fontSize: 13,
    color: colors.paragraph,
    marginTop: 2,
  },
  infoText: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.paragraph,
  },
  infoHint: {
    fontSize: 14,
    color: colors.paragraph,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "flex-end",
  },
}));
