import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  container: {
    // flex: 1,
    // width: "100%",
    alignItems: "center",
    // backgroundColor: colors.my_yellow,
    gap: 15,
    marginTop: 15,
  },
  card: {
    height: 120,
    width: 325,
    paddingLeft: 10,
    paddingRight: 10,
    backgroundColor: colors.secondBackground,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  cardGood: {
    backgroundColor: colors.my_green,
    alignItems: "center",
  },
  cardBad: {
    backgroundColor: colors.my_red,
    alignItems: "flex-start",
  },
  cardInput: {
    borderBottomColor: colors.border,
    borderBottomWidth: 3,
    borderStyle: "solid",
    width: "50%",
    padding: 0,
  },
  cardFont: {
    fontSize: 24,
    fontWeight: 800,
    color: colors.headline,
    textAlign: "center",
  },
  containerButton: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 15,
  },
  containerInput: {
    position: "relative",
    width: "100%",
  },
  myplaceholder: {
    position: "absolute",
    top: 8,
    left: 8,
    opacity: 0.5,
    fontSize: 24,
    fontWeight: 800,
  },
  myinput: {
    width: "100%",
    padding: 8,
    fontSize: 24,
    fontWeight: 800,
  },
  topContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  miniArrow: {
    color: colors.headline,
    padding: 5,
  }
}));
