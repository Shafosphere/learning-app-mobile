import type { ThemeColors } from "@/src/theme/theme";

export const buildManualCardsStyles = (colors: ThemeColors) => ({
  card: {
    flexDirection: "row" as const,
    width: "100%",
    borderBottomWidth: 2,
    borderColor: colors.border,
    alignItems: "flex-start",
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
    alignSelf: "stretch",
  },
  answersContainer: {
    gap: 12,
  },
  answerRow: {
    flexDirection: "row" as const,
    alignItems: "center",
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    gap: 12,
  },
  cardActionButton: {
    alignItems: "center",
    justifyContent: "center",
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
    justifyContent: "flex-end",
    gap: 10,
  },
  manualAddButton: {
    alignSelf: "flex-end",
    backgroundColor: colors.my_yellow,
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  manualAddIcon: {
    color: colors.headline,
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 30,
  },
});

export type ManualCardsStyles = ReturnType<typeof buildManualCardsStyles>;
