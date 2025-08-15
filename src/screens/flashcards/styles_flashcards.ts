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
  containeroflevel: {
    position: "absolute",
    top: 0,
    right: 0,
    paddingRight: 32,
    marginTop: 10,
  },
  flag: {
    width: 99/3,
    height: 66/3,
  },
  levelText: {
    width: "100%",
    textAlign: "right",
    fontSize: 15,
    fontWeight: 900,
    color: colors.headline,
  },
}));
