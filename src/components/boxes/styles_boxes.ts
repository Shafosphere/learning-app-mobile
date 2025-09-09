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
    // marginTop: 20,
    position: "relative",
    width: 115,
    height: 122,
    paddingBottom: 2,
    borderBottomWidth: 5,
    borderBottomColor: "transparent",
  },
  caroPosition: {
    marginTop: 60,
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
  number: {
    fontSize: 40,
    textAlign: "center",
    paddingTop: 40,
    fontWeight: 800,
    color: colors.headline,
  },
  numberUpdate: {
    marginTop: 40,
  },
  cardsRow: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  mouth: {
    position: "absolute",
    bottom: 15,
    right: 30,
    zIndex: 1000,
  },
  lefteye: {
    position: "absolute",
    bottom: 30,
    right: 50,
    zIndex: 999,
  },
  leftpupil: {
    position: "absolute",
    bottom: 36,
    right: 53,
    zIndex: 1000,
  },
  righteye: {
    position: "absolute",
    bottom: 32,
    right: 20,
    zIndex: 999,
  },
  rightpupil: {
    position: "absolute",
    bottom: 38,
    right: 23,
    zIndex: 1000,
  },
  card1: {
    position: "absolute",
    height: 120,
    width: 100,
    right: 10,
  },
  card2: {
    position: "absolute",
    height: 120,
    width: 110,
    right: 10,
  },
  card3: {
    position: "absolute",
    height: 120,
    width: 100,
    right: 10,
  },
}));
