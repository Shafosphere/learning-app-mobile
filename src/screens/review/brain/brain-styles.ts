import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 24,
    backgroundColor: colors.background,
  },
  logo: {
    width: 200,
    height: 200,
    resizeMode: "contain",
  },
  counter: {
    color: colors.headline,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
}));
