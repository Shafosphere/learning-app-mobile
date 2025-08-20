import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  container: {
    flex: 1,
    paddingBottom: 100,
    // backgroundColor: '#FF0000'
  },
  containerSkin: {
    position: "relative",
    width: 115,
    height: 115,
    // paddingBottom: 2,
    // borderBottomWidth: 5,
    // borderBottomColor: "transparent",
        // backgroundColor: '#FF0000'
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
    // borderBottomWidth: 5,
    // borderBottomColor: colors.my_green,
  },
  number: {
    fontSize: 40,
    textAlign: "center",
    paddingTop: 40,
    fontWeight: 800,
    color: colors.headline,
  }
}));
