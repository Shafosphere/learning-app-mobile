import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    // gap: 16,
  },
  promptBar: {
    backgroundColor: colors.lightbg,
    borderColor: colors.my_green,
    borderWidth: 3,
    // paddingVertical: 14,
    paddingHorizontal: 18,
    alignContent: "center",
    justifyContent: "center",
    borderRadius: 8,
    height: 65,
  },
  promptBarCorrect: {
    backgroundColor: colors.my_green,
    borderColor: colors.my_green,
    borderWidth: 3,
  },
  promptBarWrong: {
    backgroundColor: colors.my_red,
    borderColor: colors.my_red,
    borderWidth: 3,
  },
  content:{
    height: '100%',
    width: '100%',
    gap: 10,
  },
  promptText: {
    color: colors.headline,
    fontSize: 30,
    fontWeight: "800",
    textAlign: "left",
    textTransform: "uppercase",
    width: '100%',
  },
  promptTextCorrect: {
    color: colors.lightbg,
  },
  promptTextWrong: {
    color: colors.lightbg,
  },
  answerInput: {
    height: 60,
    width: "100%",
    backgroundColor: colors.lightbg,
    borderColor: colors.my_yellow,
    borderWidth: 3,
    borderRadius: 8,
    // paddingVertical: 14,
    paddingHorizontal: 18,
    fontSize: 25,
    color: colors.font,
  },
  buttonRow: {
    flexDirection: "row",
    // alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    // marginTop: 12,
  },
  emptyText: {
    color: colors.headline,
    fontSize: 18,
    textAlign: "center",
  },
  emptyspace: {
    height: '13%'
  },
}));
