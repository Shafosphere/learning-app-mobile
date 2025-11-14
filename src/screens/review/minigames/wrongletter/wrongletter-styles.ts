import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  container: {
    flex: 1,
    width: "100%",
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
    alignItems: "center",
    gap: 24,
  },
  instructions: {
    fontSize: 24,
    width: "100%",
    color: colors.paragraph,
    textAlign: "left",
    // paddingHorizontal: 16,
  },
  tilesContainer: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: 6,
    // paddingHorizontal: 12,
  },
  tile: {
    minWidth: 52,
    minHeight: 64,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.secondBackground,
    backgroundColor: colors.secondBackground,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  tileSelected: {
    borderColor: colors.my_green,
    backgroundColor: colors.background,
  },
  tilePressed: {
    opacity: 0.85,
  },
  tileCorrect: {
    borderColor: colors.my_green,
    backgroundColor: colors.my_green,
  },
  tileIncorrect: {
    borderColor: colors.my_red,
  },
  tileText: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.headline,
  },
  tileTextSelected: {
    color: colors.my_green,
  },
  tileTextCorrect: {
    color: colors.darkbg,
  },
  tileTextIncorrect: {
    color: colors.my_red,
  },
  fallbackContainer: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
  },
  promptText: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.headline,
    textAlign: "center",
  },
  helperText: {
    fontSize: 14,
    color: colors.paragraph,
    textAlign: "center",
  },
}));
