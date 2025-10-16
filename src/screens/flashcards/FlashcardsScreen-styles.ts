import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  container: {
    flex: 1,
    // justifyContent: "center",
    // alignItems: "center",
    backgroundColor: colors.background,
    // marginTop: 20,
    paddingTop: 50,
    position: "relative",
    display: "flex",
    gap: 30,
  },
  text: {
    fontSize: 24,
    fontWeight: "bold",
  },
  containerofcourse: {
    position: "absolute",
    top: 0,
    right: 0,
    paddingRight: 32,
    marginTop: 10,
  },
  containeroflevel: {
    position: "absolute",
    top: 0,
    left: 0,
    paddingLeft: 32,
    marginTop: 10,
  },
  flag: {
    width: 99 / 2.5,
    height: 66 / 2.5,
  },
  levelText: {
    width: "100%",
    textAlign: "right",
    fontSize: 20,
    fontWeight: 900,
    color: colors.headline,
  },
  // New level indicator with progress bar
  levelContainer: {
    gap: 6,
    alignItems: "flex-start",
  },
  levelLabel: {
    fontSize: 20,
    fontWeight: 900,
    color: colors.headline,
  },
  progressTrack: {
    backgroundColor: colors.my_red,
    height: 8,
    width: 120,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    backgroundColor: colors.my_green,
    height: "100%",
  },
}));
