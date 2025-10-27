import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  label: {
    fontSize: 16,
    textTransform: "uppercase",
    fontWeight: "900",
    color: colors.headline,
  },
      nameInput: {
      borderColor: colors.my_yellow,
      borderWidth: 3,
      borderRadius: 8,
      marginTop: 8,
      paddingLeft: 8,
      fontSize: 16,
      color: colors.headline,
    },
}));
