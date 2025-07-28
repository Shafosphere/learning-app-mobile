import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
const LOGO_ASPECT_RATIO = 523 / 555;
export const useStyles = createThemeStylesHook((colors) => ({
  container: {
    flexDirection: "row",
    height: 55,
    alignItems: "center",
    justifyContent: "flex-start",
    backgroundColor: colors.secondBackground,
    padding: 7,
    paddingLeft: 14,
  },
  logo: {
    width: 40,
    aspectRatio: LOGO_ASPECT_RATIO,
    marginRight: 20,
  },
  icon: {
    color: colors.headline,
  },
  iconCon: {
    paddingTop: 5,
    paddingBottom: 5,
    padding: 3,
    borderRadius: 5,
    marginLeft: 1,
  },
  iconConPressed: {
    backgroundColor: colors.my_green,
  },
}));
