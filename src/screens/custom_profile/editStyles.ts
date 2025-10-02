import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

import { buildManualCardsStyles } from "./sharedManualCardsStyles";

export const useEditStyles = createThemeStylesHook((colors) => {
  const manualCardsStyles = buildManualCardsStyles(colors);

  return {
    ...manualCardsStyles,
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 18,
      minHeight: "100%",
      paddingTop: 32,
    },
    section: {
      backgroundColor: colors.secondBackground,
      borderRadius: 16,
      padding: 16,
      paddingTop: 32,
    },
    sectionHeader: {
      fontSize: 24,
      textTransform: "uppercase",
      position: "absolute",
      fontWeight: "900",
      right: 24,
      top: 10,
      color: colors.headline,
    },
    miniSectionHeader: {
      fontSize: 16,
      textTransform: "uppercase",
      fontWeight: "900",
      color: colors.headline,
      marginTop: 8,
    },
    iconContainer: {},
    imageContainer: {
      marginBottom: 12,
      display: "flex",
      flexDirection: "row",
      flexWrap: "wrap",
      width: "100%",
      justifyContent: "flex-start",
    },
    iconWrapper: {
      flexBasis: "20%",
      alignItems: "center",
      justifyContent: "center",
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
      display: "flex",
      flexDirection: "row",
      flexWrap: "wrap",
      width: "100%",
      justifyContent: "center",
    },
    profileColor: {
      width: "16%",
      aspectRatio: 1,
      height: 20,
    },
    profileColorSelected: {
      borderWidth: 3,
      borderColor: colors.my_green,
    },
    profileInput: {
      borderColor: colors.my_yellow,
      borderWidth: 3,
      borderRadius: 8,
      paddingLeft: 8,
      fontSize: 16,
    },
    footer: {
      paddingHorizontal: 24,
      paddingBottom: 32,
      paddingTop: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
  };
});
