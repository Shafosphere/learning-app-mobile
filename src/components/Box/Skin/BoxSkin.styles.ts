import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useBoxSkinStyles = createThemeStylesHook((colors) => ({
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
    marginTop: 12,
  },
  skin: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  hat: {
    position: "absolute",
    width: 90,
    height: 90,
    left: 16,
    top: -20,
    zIndex: 2,
  },
  activeBox: {
    borderBottomWidth: 5,
    borderBottomColor: colors.my_green,
  },
  cardsRow: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  face: {
    position: "absolute",
    width: 56,
    height: 52,
    bottom: 5,
    right: 12,
    zIndex: 1000,
  },
  content: {
    top: -24,
    right: 4,
  },
  foreground: {
    position: "absolute",
    width: 115,
    height: 122,
    top: 0,
    right: -14,
    zIndex: 1001,
  },
  foregroundImage: {
    width: "100%",
    height: "100%",
  },
  foregroundLabelContainer: {
    position: "absolute",
    left: "15%",
    right: "15%",
    // Center inside the bubble body, excluding its tail and transparent margins.
    top: "18%",
    height: "57%",
    alignItems: "center",
    justifyContent: "center",
  },
  foregroundLabel: {
    color: "#000000",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    includeFontPadding: false,
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
