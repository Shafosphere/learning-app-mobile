import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  promptBar: {
    backgroundColor: colors.my_red,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 8,
    minWidth: "80%",
  },
  promptText: {
    color: colors.lightbg,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    textTransform: "uppercase",
  },
  answerInput: {
    width: "80%",
    backgroundColor: colors.lightbg,
    borderColor: colors.my_yellow,
    borderWidth: 3,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 20,
    color: colors.font,
  },
  correctionText: {
    color: colors.headline,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "80%",
    marginTop: 12,
  },
  baseBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  resetBtn: {
    backgroundColor: colors.my_red,
  },
  submitBtn: {
    backgroundColor: colors.my_green,
  },
  keepBtn: {
    backgroundColor: colors.my_yellow,
  },
  btnText: {
    color: colors.darkbg,
    fontWeight: "900",
    fontSize: 16,
    textTransform: "uppercase",
  },
  emptyText: {
    color: colors.headline,
    fontSize: 18,
    textAlign: "center",
  },
}));

