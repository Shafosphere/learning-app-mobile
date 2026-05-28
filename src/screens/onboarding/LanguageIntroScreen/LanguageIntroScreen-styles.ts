import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  welcomeContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  welcomeScroll: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingVertical: 22,
  },
  card: {
    width: "100%",
    maxWidth: 460,
  },
  welcomeContent: {
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 22,
  },
  welcomeCard: {
    width: "100%",
    maxWidth: 460,
    alignItems: "center",
  },
  welcomeLogoWrap: {
    width: "100%",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  welcomeLogo: {
    width: 128,
    height: 135,
  },
  welcomeLogoCompact: {
    width: 108,
    height: 114,
  },
  welcomeTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    color: colors.headline,
    textAlign: "center",
    letterSpacing: -0.3,
    marginBottom: 20,
  },
  welcomeTitleCompact: {
    fontSize: 24,
    lineHeight: 29,
    marginBottom: 14,
  },
  welcomeMessage: {
    width: "100%",
    borderRadius: 20,
    backgroundColor: colors.secondBackground,
    paddingHorizontal: 20,
    paddingVertical: 22,
  },
  welcomeMessageCompact: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  welcomeDescription: {
    fontSize: 17,
    lineHeight: 26,
    fontWeight: "700",
    color: colors.paragraph,
    letterSpacing: 0.1,
  },
  welcomeDescriptionCompact: {
    fontSize: 15,
    lineHeight: 23,
  },
  welcomeActions: {
    width: "100%",
    marginTop: 26,
  },
  welcomeButton: {
    height: 56,
    borderRadius: 16,
  },
  welcomeButtonText: {
    fontSize: 20,
    textTransform: "none",
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    lineHeight: 35,
    letterSpacing: 0.2,
    color: colors.headline,
    marginBottom: 18,
  },
  languageTiles: {
    width: "100%",
    marginTop: 18,
    gap: 14,
  },
  languageTile: {
    minHeight: 92,
    width: "100%",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.secondBackground,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: "7%",
    paddingRight: "6%",
  },
  languageTileActive: {
    borderColor: colors.my_green,
    backgroundColor: colors.my_green,
  },
  languageTilePressed: {
    transform: [{ scale: 0.98 }],
  },
  languageFlag: {
    width: 72,
    height: 48,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  languageInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: 28,
    marginRight: 14,
  },
  languageTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: colors.headline,
  },
  languageSubtitle: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "500",
    color: colors.paragraph,
  },
  confirmWrap: {
    marginTop: 40,
    alignSelf: "flex-end",
  },
  hint: {
    marginTop: 10,
    color: colors.paragraph,
    fontSize: 13,
    textAlign: "right",
  },
}));
