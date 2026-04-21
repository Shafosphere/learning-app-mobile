import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  root: {
    width: "100%",
  },
  rootCard: {
    gap: 12,
    marginBottom: 16,
  },
  rootModal: {
    marginTop: 16,
  },
  tabsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: "100%",
  },
  tabsRowCard: {
    columnGap: 32,
    rowGap: 12,
    flexWrap: "wrap",
  },
  tabsRowModal: {
    columnGap: 28,
  },
  tab: {
    alignItems: "flex-start",
  },
  tabCard: {
    paddingTop: 2,
  },
  tabLabel: {
    fontWeight: "900",
    color: colors.paragraph,
  },
  tabLabelCard: {
    fontSize: 21,
    lineHeight: 28,
    opacity: 0.45,
  },
  tabLabelModal: {
    fontSize: 18,
    lineHeight: 24,
    opacity: 0.5,
  },
  tabLabelActive: {
    color: colors.my_green,
    opacity: 1,
  },
  tabIndicator: {
    marginTop: 4,
    borderRadius: 999,
    backgroundColor: "transparent",
  },
  tabIndicatorCard: {
    width: 46,
    height: 6,
  },
  tabIndicatorModal: {
    width: 40,
    height: 5,
  },
  tabIndicatorActive: {
    backgroundColor: colors.my_green,
  },
  previewHero: {
    width: "100%",
    overflow: "hidden",
    borderWidth: 10,
    borderColor: colors.secondBackground,
    backgroundColor: colors.secondBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  previewHeroCard: {
    borderRadius: 26,
    padding: 2,
    marginTop: 4,
  },
  previewHeroModal: {
    borderRadius: 24,
    marginTop: 14,
  },
  previewInner: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  previewInnerCard: {
    borderRadius: 18,
  },
  previewInnerModal: {
    borderRadius: 18,
    backgroundColor: colors.background,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.paragraph,
    opacity: 0.82,
  },
  descriptionCard: {
    textAlign: "center",
  },
  descriptionModal: {
    marginTop: 14,
    marginBottom: 6,
    textAlign: "left",
  },
}));
