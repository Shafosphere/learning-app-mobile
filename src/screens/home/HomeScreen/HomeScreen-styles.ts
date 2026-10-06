import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { HOME_GRID_BOTTOM_PADDING, HOME_GRID_MAX_WIDTH } from "./homeGridLayout";

export const useStyles = createThemeStylesHook((colors) => ({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
    backgroundColor: colors.background,
  },
  containerTablet: {
    paddingHorizontal: 72,
  },
  gridWrapper: {
    flex: 1,
    width: "100%",
    alignSelf: "center",
  },
  grid: {
    flex: 1,
    alignSelf: "center",
  },
  header: {
    gap: 8,
    width: "100%",
    maxWidth: HOME_GRID_MAX_WIDTH,
    alignSelf: "center",
    minHeight: 110,
    justifyContent: "center",
  },
  headerCompact: {
    minHeight: 86,
    gap: 4,
    marginBottom: 6,
  },
  quote: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.headline,
    lineHeight: 26,
    textAlign: "center",
  },
  quoteCompact: {
    fontSize: 16,
    lineHeight: 22,
  },
  quoteAuthor: {
    fontSize: 14,
    color: colors.paragraph,
    textAlign: "right",
    width: "100%",
    paddingRight: 30,
    fontStyle: "italic",
  },
  quoteAuthorCompact: {
    fontSize: 12,
    paddingRight: 18,
  },
  gridContent: {
    paddingBottom: HOME_GRID_BOTTOM_PADDING,
  },
  tile: {
    backgroundColor: colors.secondBackground,
    borderRadius: 16,
    padding: 14,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  tilePressed: {
    transform: [{ scale: 0.98 }],
  },
  tileVisualArea: {
    position: "absolute",
    top: 20,
    left: 14,
    right: 14,
    bottom: 62,
    alignItems: "center",
    justifyContent: "center",
  },
  tileVisualAreaTablet: {
    top: 6,
    bottom: 48,
  },
  iconBox: {
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.secondBackground,
    transform: [{ rotate: "5deg" }],
  },
  iconBoxTablet: {
    borderRadius: 18,
  },
  iconFlipped: {
    transform: [{ scaleX: -1 }],
  },
  iconImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  tileText: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    alignItems: "center",
    justifyContent: "flex-end",
    minHeight: 54,
  },
  tileTextTablet: {
    bottom: 6,
    minHeight: 40,
  },
  tileTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.headline,
    textAlign: "center",
  },
  tileTitleTablet: {
    fontSize: 22,
  },
  tileSubtitle: {
    fontSize: 12,
    color: colors.headline,
    textAlign: "center",
    lineHeight: 16,
    minHeight: 16,
  },
  tileSubtitleTablet: {
    lineHeight: 15,
  },
  tileSubtitleHidden: {
    opacity: 0,
  },
  placeholderTile: {
    opacity: 0,
  },
}));

export type HomeScreenStyles = ReturnType<typeof useStyles>;
