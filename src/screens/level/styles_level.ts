import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  minicontainer: {
    width: "75%",
    height: "90%",
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    // backgroundColor: colors.my_red,
  },
  tile: {
    marginTop: 30,
    alignItems: "center",
    justifyContent: "center",
    width: "50%",
    // backgroundColor: colors.my_red,
  },
  level: {
    fontSize: 80,
    color: colors.headline,
    fontWeight: 900,
  },
  progressTrack: {
    backgroundColor: colors.my_red,
    height: 12,
    width: '80%',
    // borderRadius: 4,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: colors.my_green,
    height: '100%',
    // borderRadius: 4,
  },
  choose: {
    marginTop: 10,
    width: "100%",
    fontSize: 25,
    color: colors.headline,
    textAlign: "center",
    fontWeight: 800,
    textTransform: "uppercase",
  },
}));
