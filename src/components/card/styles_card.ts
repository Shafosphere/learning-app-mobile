import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  container: {
    // flex: 1,
    // width: "100%",
    alignItems: "center",
    // backgroundColor: colors.my_yellow,
    gap: 15,
    marginTop: 15,
  },
  card: {
    height: 150,
    width: 325,
    backgroundColor: colors.secondBackground,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  cardGood: {
    backgroundColor: colors.my_green,
  },
  cardBad: {
    backgroundColor: colors.my_red,
  },
  cardInput: {
    borderBottomColor: colors.border,
    borderBottomWidth: 3,
    borderStyle: "solid",
    width: "50%",
    padding: 0,
  },
  cardFont: {
    fontSize: 20,
    fontWeight: 600,
    color: colors.headline,
  },
  containerButton: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 15,
    // width: "100%",
  },
}));
