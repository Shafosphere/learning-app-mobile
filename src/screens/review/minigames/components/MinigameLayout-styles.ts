import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  root: {
    flex: 1,
    width: "100%",
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    width: "100%",
  },
  footerContainer: {
    width: "100%",
    paddingTop: 12,
    gap: 12,
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
    backgroundColor: colors.background,
  },
  footerRow: {
    borderColor: colors.border,
    borderTopWidth: 3,
    paddingTop: 15,
    width: "90%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  footerWave: {
    position: "absolute",
    top: 0,
    bottom: 0,
  },
  footerActionsWrapper: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 10,
  },
  exitButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  exitButtonPressed: {
    opacity: 0.85,
  },
  topRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 12,
  },
  headingContainer: {
    flex: 1,
  },
}));

export const FOOTER_BASE_PADDING = 24;
