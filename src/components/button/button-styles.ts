import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  button: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: 'center',
    backgroundColor: colors.my_green,
    minHeight: 50,
    maxWidth: "100%",
  },
  pressed: {
    transform: [{ scale: 1.02 }],
  },
  autoWidthButton: {
    paddingHorizontal: 18,
  },
  text: {
    color: colors.headline,
    fontSize: 16,
    fontWeight: "900",
    textTransform: "uppercase",
    textAlign: "center",
    flexShrink: 1,
  },
}));
