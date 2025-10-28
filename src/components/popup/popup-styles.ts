import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    alignItems: "center",
    zIndex: 50,
  },
  bubble: {
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 5,
    maxWidth: 320,
    alignSelf: "center",
    // shadowColor: "#000",
    // shadowOffset: { width: 0, height: 10 },
    // shadowOpacity: 0.18,
    // shadowRadius: 20,
    // elevation: 8,
  },
  text: {
    color: colors.headline,
    fontWeight: "600",
    fontSize: 15,
    textAlign: "center",
  },
  tail: {
    width: 18,
    height: 18,
    borderRadius: 4,
    transform: [{ rotate: "45deg" }],
    marginBottom: -9,
    // shadowColor: "#000",
    // shadowOffset: { width: 0, height: 4 },
    // shadowOpacity: 0.14,
    // shadowRadius: 6,
    // elevation: 6,
  },
}));
