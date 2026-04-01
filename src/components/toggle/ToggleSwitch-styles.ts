import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  toggle: {
    width: 52,
    height: 32,
    borderRadius: 999,
    padding: 3,
    justifyContent: "center",
  },
  toggleActive: {
    backgroundColor: colors.my_green,
  },
  toggleInactive: {
    backgroundColor: colors.border,
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.lightbg,
  },
  toggleThumbActive: {
    alignSelf: "flex-end",
  },
  toggleThumbInactive: {
    alignSelf: "flex-start",
  },
}));
