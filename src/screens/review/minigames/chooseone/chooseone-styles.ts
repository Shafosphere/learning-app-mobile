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
    // gap: 32,
  },
  promptContainer: {
    alignItems: "center",
    gap: 8,
    marginTop: 24,
    marginBottom: 12,
    // paddingHorizontal: 12,
    width: "100%",
  },
  promptText: {
    // backgroundColor: colors.my_red,
    fontSize: 28,
    fontWeight: "700",
    color: colors.headline,
    textAlign: "left",
    width: "100%",
  },
  helperText: {
    fontSize: 14,
    color: colors.paragraph,
    textAlign: "center",
  },
  optionsContainer: {
    width: "100%",
    gap: 12,
  },
  optionButton: {
    backgroundColor: colors.secondBackground,
    borderRadius: 4,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: colors.secondBackground,
    alignItems: "flex-start",
  },
  optionButtonPressed: {
    opacity: 0.85,
  },
  optionButtonCorrect: {
    borderColor: colors.my_green,
  },
  optionButtonIncorrect: {
    borderColor: colors.my_red,
  },
  optionButtonSelected: {
    borderColor: colors.my_yellow,
  },
  optionText: {
    fontSize: 18,
    color: colors.headline,
    textAlign: "center",
  },
  resultContainer: {
    gap: 16,
    alignItems: "center",
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
}));
