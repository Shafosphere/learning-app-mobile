import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useCustomProfileFormStyles = createThemeStylesHook((colors) => {
  return {
    section: {
      backgroundColor: colors.secondBackground,
      borderRadius: 16,
      padding: 16,
      paddingTop: 32,
      marginBottom: 24,
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
    content: {
      gap: 16,
    },
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
    },
    checkboxRow: {
      marginTop: 12,
      marginBottom: 8,
    },
    checkboxPressable: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
    },
    checkboxPressablePressed: {
      opacity: 0.8,
    },
    checkboxBase: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: colors.background,
    },
    checkboxBaseChecked: {
      borderColor: colors.my_green,
      backgroundColor: colors.my_green,
    },
    checkboxIcon: {
      color: colors.background,
    },
    checkboxLabel: {
      fontSize: 14,
      fontWeight: "800",
      textTransform: "uppercase" as const,
      color: colors.headline,
    },
    iconSection: {
      marginTop: 12,
    },
    iconsContainer: {
      marginBottom: 12,
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      width: "100%",
      justifyContent: "flex-start",
    },
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
    profileColor: {
      width: "16%",
      aspectRatio: 1,
      height: 20,
    },
    profileColorSelected: {
      borderWidth: 3,
      borderColor: colors.my_green,
    },
    childrenContainer: {
      marginTop: 24,
      gap: 16,
    },
  };
});
