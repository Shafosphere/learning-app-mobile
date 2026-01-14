import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 18,
    paddingTop: 32,
    paddingBottom: 0,
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
  segmentedControl: {
    marginTop: 28,
    flexDirection: "row" as const,
    backgroundColor: colors.lightbg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  segmentOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  segmentOptionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.paragraph,
  },
  segmentOptionActive: {
    backgroundColor: colors.my_green,
  },
  segmentOptionLabelActive: {
    color: colors.darkbg,
  },
  modeContainer: {
    marginTop: 12,
  },
  cardTypeSection: {
    marginTop: 2,
    marginBottom: 18,
    gap: 12,
  },
  cardTypeSelector: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.secondBackground,
    gap: 8,
  },
  cardTypeSelectorOpen: {
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  cardTypeSelectorText: {
    flex: 1,
    gap: 4,
  },
  cardTypeDropdown: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.secondBackground,
    overflow: "hidden" as const,
  },
  cardTypeDropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 0,
  },
  cardTypeDropdownItemFirst: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  cardTypeDropdownItemLast: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderBottomWidth: 0,
  },
  cardTypeDropdownItemActive: {
    backgroundColor: colors.my_green,
    borderColor: colors.my_green,
  },
  cardTypeChevron: {
    color: colors.headline,
  },
  cardTypeOptionLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.headline,
  },
  cardTypeOptionLabelActive: {
    color: colors.darkbg,
  },
  modeTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: colors.headline,
  },
  modeDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.paragraph,
    marginBottom: 16,
  },
  modeActions: {
    gap: 12,
    alignSelf: "flex-end" as const,
  },
  csvSelectedFile: {
    fontSize: 13,
    fontStyle: "italic",
    color: colors.paragraph,
  },
  miniSectionHeader: {
    fontSize: 16,
    textTransform: "uppercase",
    fontWeight: "900",
    color: colors.headline,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 24,
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
  returnbtn: {
    color: colors.headline,
  },
}));
