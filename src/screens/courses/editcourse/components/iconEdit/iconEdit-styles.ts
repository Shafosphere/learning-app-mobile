import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => {
  return {
    container: {},
    iconWrapper: {
      flexBasis: "20%",
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginBottom: 6,
      padding: 8,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: "transparent",
    },
    iconWrapperSelected: {
      borderColor: colors.my_green,
    },
    colorsContainer: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      width: "100%",
      justifyContent: "center",
    },
    iconsContainer: {
      marginBottom: 12,
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      width: "100%",
      justifyContent: "flex-start",
    },
    courseColorSelected: {
      borderWidth: 3,
      borderColor: colors.my_green,
    },
    colorSwatch: {
      width: 48,
      height: 48,
      borderRadius: 12,
    },
    colorSwatchSelected: {
      borderWidth: 3,
      borderColor: colors.my_green,
    },
  };
});
