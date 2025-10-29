import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: "flex-start",
    alignItems: "center",
    gap: 24,
  },
  promptContainer: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  caption: {
    fontSize: 14,
    color: colors.paragraph,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  promptText: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.headline,
    textAlign: "center",
  },
  helperText: {
    fontSize: 14,
    color: colors.paragraph,
    textAlign: "center",
  },
  pairsContainer: {
    width: "100%",
    gap: 16,
  },
  pairButton: {
    backgroundColor: colors.secondBackground,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: colors.border,
    width: "100%",
  },
  pairButtonPressed: {
    opacity: 0.85,
  },
  pairButtonSelected: {
    backgroundColor: colors.my_green,
    borderColor: colors.my_green,
  },
  pairButtonCorrect: {
    borderColor: colors.my_green,
  },
  pairButtonIncorrect: {
    borderColor: colors.my_red,
  },
  pairContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    width: "100%",
  },
  termText: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.headline,
    flex: 1,
  },
  translationText: {
    fontSize: 18,
    color: colors.headline,
    flex: 1,
    textAlign: "right",
  },
  pairTextSelected: {
    color: colors.darkbg,
  },
  actionsContainer: {
    width: "100%",
    alignItems: "center",
    gap: 12,
  },
  resultContainer: {
    gap: 12,
    alignItems: "center",
    width: "100%",
  },
  resultText: {
    fontSize: 16,
    textAlign: "center",
  },
  resultTextSuccess: {
    color: colors.my_green,
  },
  resultTextError: {
    color: colors.my_red,
  },
  resultSummary: {
    backgroundColor: colors.secondBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resultSummaryText: {
    fontSize: 14,
    textAlign: "center",
    color: colors.paragraph,
  },
}));
