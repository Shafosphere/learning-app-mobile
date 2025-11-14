import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
    justifyContent: "flex-start",
    alignItems: "center",
    gap: 24,
    width: "100%",
  },
  fallbackContainer: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
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
  wordsContainer: {
    width: "100%",
    gap: 16,
  },
  wordCard: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 4,
    backgroundColor: colors.secondBackground,
    borderWidth: 1,
    borderColor: colors.secondBackground,
  },
  wordRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  staticLetterBox: {
    minWidth: 32,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  staticLetterText: {
    fontSize: 24,
    fontWeight: "600",
    color: colors.headline,
  },
  missingLetterBox: {
    minWidth: 40,
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.background,
    backgroundColor: colors.background,
  },
  missingLetterBoxFilled: {
    backgroundColor: colors.secondBackground,
  },
  missingLetterBoxActive: {
    borderColor: colors.my_green,
  },
  missingLetterBoxCorrect: {
    borderColor: colors.my_green,
    backgroundColor: colors.my_green,
  },
  missingLetterBoxIncorrect: {
    borderColor: colors.my_red,
  },
  missingLetterBoxPressed: {
    opacity: 0.85,
  },
  missingLetterText: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.headline,
  },
  missingLetterTextFilled: {
    color: colors.headline,
  },
  missingLetterTextCorrect: {
    color: colors.darkbg,
  },
  missingLetterTextIncorrect: {
    color: colors.my_red,
  },
  lettersContainer: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
  },
  letterButton: {
    minWidth: 40,
    minHeight: 52,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.secondBackground,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
    backgroundColor: colors.secondBackground,
  },
  letterButtonPressed: {
    opacity: 0.85,
  },
  letterButtonUsed: {
    opacity: 0.4,
  },
  letterButtonText: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.headline,
  },
  letterButtonTextUsed: {
    color: colors.paragraph,
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
    gap: 4,
    alignItems: "center",
  },
  resultSummaryText: {
    fontSize: 14,
    color: colors.paragraph,
    textAlign: "center",
  },
}));
