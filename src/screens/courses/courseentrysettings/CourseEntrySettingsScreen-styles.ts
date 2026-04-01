import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { Platform } from "react-native";

export const useStyles = createThemeStylesHook((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: colors.background,
  },
  contentContainer: {
    flex: 1,
  },
  contentContainerInner: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 24,
    flexGrow: 1,
  },
  content: {
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
  },
  title: {
    fontSize: 34,
    lineHeight: 35,
    fontWeight: "900",
    letterSpacing: -0.8,
    color: colors.headline,
  },
  lead: {
    marginTop: 14,
    marginBottom: 26,
    fontSize: 17,
    lineHeight: 24,
    color: colors.paragraph,
  },
  options: {
    gap: 14,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.secondBackground,
  },
  optionMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    minWidth: 0,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconText: {
    fontSize: 21,
    lineHeight: Platform.OS === "android" ? 24 : 22,
    color: colors.my_green,
  },
  optionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  optionTitle: {
    fontSize: 22,
    lineHeight: 23,
    fontWeight: "900",
    letterSpacing: -0.3,
    color: colors.headline,
  },
  optionDescription: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 22,
    color: colors.paragraph,
  },
  switchWrap: {
    justifyContent: "center",
    alignItems: "center",
  },
  buttonscontainer: {
    width: "100%",
    paddingBottom: 24,
    paddingHorizontal: 20,
    backgroundColor: colors.background,
    alignItems: "center",
  },
  buttonsRow: {
    borderColor: colors.border,
    borderTopWidth: 3,
    paddingTop: 15,
    width: "100%",
    maxWidth: 460,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  ctaButton: {
    minHeight: 50,
  },
  ctaButtonPressed: {
    transform: [{ scale: 1.02 }],
  },
  ctaLabel: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.2,
    textTransform: "none",
  },
}));
