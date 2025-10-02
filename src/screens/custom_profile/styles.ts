import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

import { buildManualCardsStyles } from "./sharedManualCardsStyles";

export const useStyles = createThemeStylesHook((colors) => {
  const manualCardsStyles = buildManualCardsStyles(colors);

  return {
    ...manualCardsStyles,
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 18,
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
    },
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
    iconContainer: {},
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
      marginBottom: 8,
      paddingLeft: 8,
      fontSize: 16,
    },
    segmentedControl: {
      marginTop: 8,
      flexDirection: "row",
      backgroundColor: colors.lightbg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    segmentOption: {
      flex: 1,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    segmentOptionLabel: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.paragraph,
    },
    segmentOptionActive: {
      backgroundColor: colors.my_green,
    },
    segmentOptionLabelActive: {
      color: colors.darkbg,
    },
    modeContainer: {
      marginTop: 24,
    },
    modeTitle: {
      fontSize: 24,
      fontWeight: "900",
      color: colors.headline,
    },
    modeDescription: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.paragraph,
      marginBottom: 16,
    },
    modeActions: {
      gap: 12,
      alignSelf: "flex-end",
    },
    csvSelectedFile: {
      fontSize: 13,
      fontStyle: "italic",
      color: colors.paragraph,
    },
    footer: {
      paddingHorizontal: 24,
      paddingBottom: 32,
      paddingTop: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    footerActionRight: {
      marginLeft: "auto",
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginHorizontal: 24,
    },
    buttonscontainer: {
      width: "100%",
      alignItems: "flex-end",
      padding: 10,
    },
  };
});
