import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  container: {
    flex: 1,
    // justifyContent: "center",
    // alignItems: "center",
    backgroundColor: colors.background,
    // marginTop: 20,
    paddingTop: 50,
    position: "relative",
    display: "flex",
    gap: 30,
  },
}));
