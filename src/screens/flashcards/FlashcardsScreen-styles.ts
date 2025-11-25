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
  introOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    elevation: 6,
    paddingHorizontal: 4,
    paddingTop: 8,
  },
}));
