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
  hintRow: {
    width: 325,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
    flex: 1,
    borderBottomColor: colors.border,
    borderBottomWidth: 2,
    paddingVertical: 6,
    fontSize: 18,
    color: colors.paragraph,
  },
  hintActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  hintActionButton: {
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.secondBackground,
  },
  hintActionGhost: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  // hintActionPrimary: {
  //   backgroundColor: colors.primary,
  // },
  hintActionDisabled: {
    opacity: 0.6,
  },
  hintActionPressed: {
    opacity: 0.7,
  },
  hintActionText: {
    color: colors.paragraph,
    fontSize: 16,
    fontWeight: "600",
  },
  hintActionTextPrimary: {
    color: colors.background,
    fontSize: 16,
    fontWeight: "700",
  },
  hintActionTextPrimaryAcept: {
    color: colors.headline,
    fontSize: 16,
    fontWeight: "700",
    // backgroundColor: colors.my_green,
  },
  card: {
    paddingLeft: 10,
    paddingRight: 10,
    backgroundColor: colors.secondBackground,
    borderRadius: 15,
    // alignItems: "center",
    // justifyContent: "center",
  },
  cardSmall: {
    minHeight: 120,
    width: 325,
  },
  cardLarge: {
    width: 325,
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
    // marginTop: 4,
  },
  cardFont: {
    fontSize: 24,
    fontWeight: 800,
    color: colors.headline,
    textAlign: "left",
    width: "100%",
  },
  testing: {
    backgroundColor: colors.my_green,
    height: 200,
    width: 100,
    position: "absolute",
    zIndex: 1000,
  },
  empty: {
    fontSize: 24,
    fontWeight: 800,
    color: colors.headline,
    textAlign: "center",
    textAlignVertical: "center",
    // backgroundColor: colors.my_green,
    width: "100%",
    height: "100%",
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
    height: "50%",
    // backgroundColor: colors.my_green,
  },
  containerInputFirst: {
    paddingTop: 8,
  },
  inputScroll: {
    width: "100%",
    height: 52,
  },
  inputScrollContent: {
    height: 52,
  },
  inputRow: {
    position: "relative",
    height: 52,
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
    // color: "tra"
  },
  overlayCharError: {
    color: colors.my_red,
  },
  overlayCharNeutral: {
    color: colors.headline,
  },
  topContainer: {
    flexDirection: "column",
    width: "100%",
    paddingLeft: 8,
    paddingRight: 8,
    gap: 8,
  },
  promptRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  cardContentLarge: {
    flex: 1,
    width: "100%",
    alignSelf: "stretch",
  },
  topContainerLarge: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    // backgroundColor: colors.my_green,
  },
  topContainerLargePrompt: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    flex: 1,
    paddingLeft: 8,
    paddingRight: 8,
  },
  inputContainerLarge: {
    justifyContent: "flex-end",
    width: "100%",
    paddingBottom: 14,
  },
  inputContainerLargeCorrection: {
    paddingBottom: 6,
  },
  containerInputLarge: {
    position: "relative",
    width: "100%",
    height: undefined,
    alignSelf: "stretch",
  },
  promptText: {
    flex: 1,
    textAlign: "left",
  },
  promptTextMultiline: {
    flexWrap: "wrap",
    // alignSelf: "flex-start",
    textAlign: "left",
  },
  promptMarquee: {
    flex: 1,
    minWidth: 0,
  },
  promptMarqueeText: {
    width: undefined,
  },
  promptScroll: {
    flex: 1,
    minWidth: 0,
    // backgroundColor: colors.my_green,
  },
  promptScrollContent: {
    paddingRight: 4,
  },
  promptScrollText: {
    width: undefined,
    flexShrink: 1,
  },
  cardIconWrapper: {
    width: 32,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  cardIconPlaceholder: {
    width: 32,
  },
  promptImageWrapper: {
    width: "100%",
    maxHeight: 180,
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.secondBackground,
  },
  promptImage: {
    width: "100%",
    height: "100%",
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
  measureContainer: {
    position: "absolute",
    left: -9999,
    opacity: 0,
  },
  measureText: {
    fontSize: 24,
    fontWeight: 800,
    lineHeight: 28,
  },
  typoError: {
    color: colors.my_red,
    textDecorationLine: "line-through",
  },
  typoCorrection: {
    color: colors.my_yellow,
  },
}));
