import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { HOME_GRID_BOTTOM_PADDING } from "./homeGridLayout";

export const useStyles = createThemeStylesHook((colors) => ({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 85,
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
  tileDecorations: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 16,
    overflow: "hidden",
  },
  tileCornerDecoration: {
    position: "absolute",
    bottom: 0,
    left: 0,
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
    transform: [{ rotate: "-6deg" }],
  },
  iconBoxTablet: {
    borderRadius: 18,
  },
  mascotFrame: {
    width: 115,
    height: 122,
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
