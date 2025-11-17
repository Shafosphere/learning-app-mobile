import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => {
  return {
    card: {
      flexDirection: "row" as const,
      // width: "100%",
      flex: 1,
      borderBottomWidth: 2,
      borderColor: colors.border,
      alignItems: "flex-start" as const,
      paddingVertical: 12,
    },
    cardFirst: {
      borderTopWidth: 2,
    },
    number: {
      fontSize: 21,
      fontWeight: 900,
      width: "10%",
      height: "100%",
      maxHeight: "100%",
      minWidth: 36,
      textAlign: "center" as const,
      textAlignVertical: "center" as const,
      paddingTop: 6,
      color: colors.headline,
    },
    inputContainer: {
      flex: 1,
      gap: 12,
    },
    cardinput: {
      width: "90%",
      fontSize: 16,
      fontWeight: 800,
      paddingVertical: 6,
      color: colors.headline,
    },
    cardPlaceholder: {
      color: colors.paragraph,
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
      color: colors.paragraph,
      width: 24,
      textAlign: "right" as const,
    },
    answerInput: {
      flex: 1,
      fontSize: 16,
      fontWeight: 700,
      paddingVertical: 6,
      color: colors.headline,
    },
    answerRemoveButton: {
      padding: 4,
    },
    cardActions: {
      width: 48,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      // paddingVertical: 12,
      gap: 18,
      // backgroundColor: colors.my_green,
    },
    displayCardCorrect: {
      borderLeftWidth: 4,
      borderLeftColor: colors.my_green,
      backgroundColor: colors.my_green + "12",
    },
    displayCardIncorrect: {
      borderLeftWidth: 4,
      borderLeftColor: colors.my_red,
      backgroundColor: colors.my_red + "12",
    },
    displayTextCorrect: {
      color: colors.my_green,
    },
    displayTextIncorrect: {
      color: colors.my_red,
    },
    cardActionButton: {
      alignItems: "center" as const,
      justifyContent: "center" as const,
      // backgroundColor: colors.my_red,
      padding: 4,
      paddingTop: 8,
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
      fontSize: 30,
    },
    manualAddIcon: {
      color: colors.headline,
      fontSize: 30,
      fontWeight: "900",
      lineHeight: 30,
    },
    flipRow: {
      flexDirection: "row",
      //   paddingVertical: 6,
      alignItems: "center",
      //   backgroundColor: colors.my_green,
    },
    icon: {
      paddingTop: 5,
      marginRight: 3,
    },
    iconFlipActivate: {
      color: colors.headline,
    },
    iconFlipDeactive: {
      color: colors.my_red,
    },
    lockcontainer: {
      height: 25,
      width: 25,
      justifyContent: "center",
      alignItems: "center",
      // backgroundColor: colors.headline,
    },
  };
});
