import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  button: {
    // paddingVertical: 12,
    // paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: 'center',
    backgroundColor: colors.my_green,
    height: 50,
  },
  pressed: {
    transform: [{ scale: 1.02 }],
  },
  text: {
    color: colors.headline,
    fontSize: 16,
    fontWeight: "900",
    textTransform: "uppercase",
  },
}));
