import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  container: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  text: {
    fontSize: 24,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: colors.headline,
    textAlign: "center",
  },
}));
