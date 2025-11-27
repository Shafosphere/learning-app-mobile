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
      width: "100%",
      gap: 0,
      padding: 12,
    },
    colorsRow: {
      flexDirection: "row" as const,
      width: "100%",
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
      flex: 1, // 5 items per row -> each takes equal width
      aspectRatio: 1,
      borderRadius: 2,
    },
    selectionOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderWidth: 3,
      borderColor: colors.my_green,
      borderRadius: 2,
    },
  };
});
