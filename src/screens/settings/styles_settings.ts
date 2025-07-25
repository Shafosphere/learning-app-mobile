import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export  const useStyles = createThemeStylesHook((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  text: {
    fontSize: 18,
    color: colors.paragraph,
    marginBottom: 20,
  },
}));
