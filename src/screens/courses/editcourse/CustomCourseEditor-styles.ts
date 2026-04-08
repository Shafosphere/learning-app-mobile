import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
    paddingTop: 24,
    gap: 24,
  },
  scrollContentWithManualToolbar: {
    paddingBottom: 236,
  },
  sectionCard: {
    backgroundColor: colors.secondBackground,
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  sectionHeader: {
    fontSize: 24,
    fontWeight: "900",
    textTransform: "uppercase" as const,
    color: colors.headline,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.paragraph,
  },
  sectionGroup: {
    marginTop: 8,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "900",
    textTransform: "uppercase" as const,
    color: colors.headline,
  },
  toggleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: 12,
  },
  toggleTextWrapper: {
    flex: 1,
    paddingRight: 12,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.paragraph,
  },
  toggleSubtitle: {
    fontSize: 13,
    color: colors.paragraph,
    opacity: 0.75,
    marginTop: 4,
  },
  switch: {
    transform: [{ scaleX: 1.12 }, { scaleY: 1.12 }],
  },
  iconSection: {
    gap: 12,
  },
  iconSelectorWrapper: {
    gap: 12,
  },
  iconsContainer: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    width: "100%",
    justifyContent: "flex-start" as const,
  },
  iconWrapper: {
    flexBasis: "20%",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 6,
    padding: 8,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  iconWrapperSelected: {
    borderColor: colors.my_green,
  },
  colorsContainer: {
    width: "100%",
    justifyContent: "flex-start" as const,
  },
  courseColor: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
  },
  courseColorSelected: {
    borderWidth: 3,
    borderColor: colors.my_green,
  },
  manualHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  manualTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.headline,
    textTransform: "uppercase" as const,
  },
  manualHint: {
    fontSize: 13,
    color: colors.paragraph,
  },
  manualToolbarWrap: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  manualToolbar: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  manualTypeSelector: {
    flex: 1,
  },
  manualAddButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: colors.my_yellow,
    borderWidth: 1,
    borderColor: colors.border,
  },
  manualAddIcon: {
    fontSize: 28,
    lineHeight: 28,
    fontWeight: "900" as const,
    color: colors.headline,
  },
  manualHistoryRow: {
    marginTop: 16,
    flexDirection: "row" as const,
    justifyContent: "flex-end" as const,
  },
  manualHistoryButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: colors.secondBackground,
    borderWidth: 2,
    borderColor: colors.border,
  },
  manualHistoryButtonDisabled: {
    opacity: 0.4,
  },
  manualHistoryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.headline,
  },
  footerButtons: {
    marginTop: 24,
    flexDirection: "row" as const,
    justifyContent: "flex-end" as const,
    gap: 12,
  },
  footerBar: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "flex-end" as const,
  },
  footerButtonsRow: {
    borderColor: colors.border,
    borderTopWidth: 3,
    paddingTop: 15,
    width: "75%",
    flexDirection: "row" as const,
    justifyContent: "flex-end" as const,
    gap: 10,
  },
  buttonscontainer: {
    width: "100%",
    paddingBottom: 24,
    backgroundColor: colors.background,
    alignItems: "center",
  },
  buttonsRow: {
    borderColor: colors.border,
    borderTopWidth: 3,
    paddingTop: 15,
    width: "90%",
    flexDirection: "row",
    alignItems: "center",
    // klucz: rozciągamy środek, więc nie potrzebujemy już flex-end
    justifyContent: "flex-start",
    gap: 10,
  },
  spacer: {
    flex: 1, // zajmuje całe wolne miejsce
  },
  rightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
}));
