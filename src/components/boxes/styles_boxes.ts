import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  container: {
    // flex: 1,
    width: "100%",
    alignItems: "center",
    // backgroundColor: colors.my_red,
  },
  containerTop: {
    width: "100%",
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  containerBox: {
    display: "flex",
    flexDirection: "column",
  },
  containerSkin: {
    position: "relative",
    width: 115,
    height: 122,
    paddingBottom: 2,
    borderBottomWidth: 5,
    borderBottomColor: "transparent",
  },
  skin: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  boxWords: {
    color: colors.headline,
    fontWeight: 900,
    textAlign: "center",
    fontSize: 20,
    margin: 4,
  },
  activeBox: {
    borderBottomWidth: 5,
    borderBottomColor: colors.my_green,
  },
}));
