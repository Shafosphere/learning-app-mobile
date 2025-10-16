import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";


export const useStyles = createThemeStylesHook((colors) => {
  return {
    card: {
      flexDirection: "row" as const,
      width: "100%",
      borderBottomWidth: 2,
      borderColor: colors.border,
      alignItems: "flex-start" as const,
      paddingVertical: 12,
    },
    cardFirst: {
      borderTopWidth: 2,
    },
    number: {
      fontSize: 16,
      fontWeight: 900,
      width: "10%",
      height: "100%",
      maxHeight: "100%",
      minWidth: 36,
      textAlign: "center" as const,
      textAlignVertical: "center" as const,
      paddingTop: 6,
    },
    inputContainer: {
      flex: 1,
      gap: 12,
    },
    cardinput: {
      width: "100%",
      fontSize: 16,
      fontWeight: 800,
      paddingVertical: 6,
    },
    cardPlaceholder: {
      color: colors.border,
    },
    cardDivider: {
      borderStyle: "dashed" as const,
      borderTopWidth: 2,
      borderColor: colors.border,
      alignSelf: "stretch" as const,
    },
    answersContainer: {
      gap: 12,
    },
    answerRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 8,
    },
    answerIndex: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.headline,
      width: 24,
      textAlign: "right" as const,
    },
    answerInput: {
      flex: 1,
      fontSize: 16,
      fontWeight: 700,
      paddingVertical: 6,
    },
    answerRemoveButton: {
      padding: 4,
    },
    cardActions: {
      width: 48,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      paddingVertical: 12,
      gap: 12,
    },
    cardActionButton: {
      alignItems: "center" as const,
      justifyContent: "center" as const,
      padding: 4,
    },
    cardActionIcon: {
      color: colors.headline,
    },
    removeButtonDisabled: {
      opacity: 0.4,
    },
    buttonContainer: {
      flexDirection: "row" as const,
      justifyContent: "flex-end" as const,
      gap: 10,
    },
    manualAddButton: {
      alignSelf: "flex-end" as const,
      backgroundColor: colors.my_yellow,
      width: 56,
      height: 56,
      borderRadius: 18,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginTop: 16,
    },
    manualAddIcon: {
      color: colors.headline,
      // fontSize: 30,
      fontWeight: "900",
      lineHeight: 30,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 18,
      paddingTop: 32,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: 120,
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
    courseColor: {
      width: "16%",
      aspectRatio: 1,
      height: 20,
    },
    courseColorSelected: {
      borderWidth: 3,
      borderColor: colors.my_green,
    },
    courseInput: {
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
  };
});
