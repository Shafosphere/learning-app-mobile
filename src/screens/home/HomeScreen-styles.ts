import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
    backgroundColor: colors.background,
  },
  header: {
    gap: 8,
    marginBottom: 18,
    width: "100%",
    height: 110,
    justifyContent: "center"
  },
  quote: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.headline,
    lineHeight: 26,
    textAlign: "center",
  },
  quoteAuthor: {
    fontSize: 14,
    color: colors.paragraph,
    textAlign: "right",
    width: "100%",
    paddingRight: 30,
    fontStyle: "italic",
  },
  gridContent: {
    paddingBottom: 32,
    gap: 14,
  },
  gridRow: {
    gap: 14,
  },
  tile: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: colors.secondBackground,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  tilePressed: {
    transform: [{ scale: 0.98 }],
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.secondBackground,
  },
  iconImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  tileText: {
    alignItems: "center",
    gap: 4,
  },
  tileTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.headline,
  },
  tileSubtitle: {
    fontSize: 12,
    color: colors.headline,
    textAlign: "center",
    lineHeight: 18,
    minHeight: 18 * 2,
  },
  tileSubtitleHidden: {
    opacity: 0,
  },
  placeholderTile: {
    opacity: 0,
  },
}));
