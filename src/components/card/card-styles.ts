import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  container: {
    // flex: 1,
    // width: "100%",
    alignItems: "center",
    // backgroundColor: colors.my_yellow,
    gap: 15,
    // marginTop: 5,
  },
  hintContainer: {
    width: 325,
    // backgroundColor: colors.my_yellow,
    height: 40,
  },
  hintMarquee: {
    width: "100%",
  },
  dots: {
    color: colors.paragraph,
    fontSize: 36,
    width: 325,
    textAlign: "center",
    // backgroundColor: colors.my_yellow,
  },
  hint: {
    color: colors.paragraph,
    fontSize: 24,
    width: 325,
    // backgroundColor: colors.my_yellow,
  },
  hintInput: {
    width: 325,
    borderBottomColor: colors.border,
    borderBottomWidth: 2,
    paddingVertical: 6,
    fontSize: 18,
    color: colors.paragraph,
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
  cardIntro: {
    alignItems: "flex-start",
  },
  cardInput: {
    borderBottomColor: colors.border,
    borderBottomWidth: 3,
    borderStyle: "solid",
    width: "50%",
    padding: 0,
    // backgroundColor: colors.my_green,
    paddingLeft: 8,
    paddingRight: 8,
    marginTop: 4,
  },
  cardFont: {
    fontSize: 24,
    fontWeight: 800,
    color: colors.headline,
    textAlign: "left",
    width: "100%",
  },

  empty: {
    fontSize: 24,
    fontWeight: 800,
    color: colors.headline,
    textAlign: "center",
    width: "100%",
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
    // backgroundColor: colors.my_green,
  },
  myplaceholder: {
    position: "absolute",
    top: 8,
    left: 8,
    height: 44, // stała wysokość inputa
    lineHeight: 28, // stała wysokość
    opacity: 0.5,
    fontSize: 24,
    fontWeight: 800,
    color: colors.headline,
  },
  myinput: {
    height: 44, // stała wysokość inputa
    lineHeight: 28, // stała wysokość
    width: "100%",
    padding: 8,
    fontSize: 24,
    fontWeight: 800,
    color: colors.headline,
  },
  inputOverlay: {
    position: "absolute",
    top: 8,
    left: 8,
    height: 44, // stała wysokość inputa
    lineHeight: 28, // stała wysokość
    width: "100%",
    fontSize: 24,
    fontWeight: 800,
    pointerEvents: "none",
  },
  overlayCharError: {
    color: colors.my_red,
  },
  overlayCharNeutral: {
    color: colors.headline,
  },
  topContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: 8,
    paddingLeft: 8,
    paddingRight: 8,
    marginBottom: 4,
    // backgroundColor: colors.my_green,
  },
  promptText: {
    flex: 1,
    textAlign: "left",
  },
  cardIconWrapper: {
    width: 32,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  cardIconPlaceholder: {
    width: 32,
  },
  introToggle: {
    position: "absolute",
    top: 0,
    right: 0,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  cardIconColor: {
    color: colors.headline,
  },
}));
