import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  container: {
    flexGrow: 1,
    paddingVertical: 24,
    backgroundColor: colors.background,
  },
  panelWrap: {
    flex: 1,
    justifyContent: "center",
  },
}));
