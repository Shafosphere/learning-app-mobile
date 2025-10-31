import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  container: {
    width: "100%",
    // alignItems: "flex",
    // paddingHorizontal: 24,
    // marginBottom: 24,
    // backgroundColor: colors.my_green,
  },
  text: {
    fontSize: 16,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: colors.headline,
    textAlign: "left",
  },
}));
