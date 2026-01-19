import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 160,
  },
  boxContainer: {
    width: "75%",
    gap: 10,
    overflow: "hidden",
  },
  box: {
    width: 75,
    height: 75,
    backgroundColor: colors.secondBackground,
    borderWidth: 5,
    borderColor: colors.border,
    borderRadius: 13,
    zIndex: 2,
  },
  boxLeft: {
    alignSelf: "flex-start",
  },
  boxRight: {
    alignSelf: "flex-end",
  },

  connectorArea: {
    width: "100%",
    height: 80,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -28,
    marginBottom: -28,
    // backgroundColor: colors.my_green,
  },
  connectorStripe: {
    position: "absolute",
    width: "68%",
    zIndex: 0,
    top: 15,
  },
  connectorFromLeft: {
    left: 30,
    transform: [{ rotate: "25deg" }],
  },
  connectorFromRight: {
    right: 30,
    transform: [{ rotate: "-25deg" }, { scaleX: -1 }],
  },
  peekContent: {
    fontSize: 14,
    color: colors.paragraph,
    lineHeight: 20,
  },
}));
