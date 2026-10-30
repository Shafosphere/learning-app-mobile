import { SCREEN_ACTION_BOTTOM_PADDING } from "@/src/theme/layout";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

const COURSE_APPEARANCE_TABLET_MAX_WIDTH = 500;
const COURSE_APPEARANCE_LANDSCAPE_MAX_WIDTH = 1000;

export const useStyles = createThemeStylesHook((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 18,
    paddingTop: 32,
    paddingBottom: 0,
  },
  containerLandscape: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  scrollView: {
    flex: 1,
    width: "100%",
    alignSelf: "center" as const,
  },
  scrollViewTablet: {
    maxWidth: COURSE_APPEARANCE_TABLET_MAX_WIDTH,
  },
  scrollViewLandscape: {
    maxWidth: COURSE_APPEARANCE_LANDSCAPE_MAX_WIDTH,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 120,
  },
  scrollContentLandscape: {
    paddingBottom: 16,
  },
  section: {
    borderRadius: 16,
    // paddingTop: 12,
  },
  sectionHeader: {
    fontSize: 24,
    textTransform: "uppercase",
    fontWeight: "900",
    color: colors.headline,
    alignSelf: "flex-end" as const,
    marginBottom: -16,
    marginRight: 8,
    zIndex: 3,
  },
  sectionHeaderLandscape: {
    marginBottom: 12,
  },
  formContent: {
    gap: 14,
  },
  labelRow: {
    flexDirection: "row" as const,
    alignItems: "baseline" as const,
    justifyContent: "space-between" as const,
    gap: 10,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.9,
    color: colors.paragraph,
  },
  nameInputWrap: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor:
      colors.secondBackground === colors.background
        ? colors.background
        : colors.secondBackground,
    paddingHorizontal: 12,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  nameInputDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.my_green,
  },
  nameInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
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
    paddingBottom: SCREEN_ACTION_BOTTOM_PADDING,
    backgroundColor: colors.background,
    alignItems: "center" as const,
  },
  footerLandscape: {
    paddingBottom: SCREEN_ACTION_BOTTOM_PADDING,
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
  buttonsRowTablet: {
    maxWidth: COURSE_APPEARANCE_TABLET_MAX_WIDTH,
    alignSelf: "center" as const,
  },
  buttonsRowLandscape: {
    maxWidth: COURSE_APPEARANCE_LANDSCAPE_MAX_WIDTH,
    borderTopWidth: 1,
    paddingTop: 10,
  },
}));
