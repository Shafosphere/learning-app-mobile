import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
export const useStyles = createThemeStylesHook((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    // justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: 800,
    color: colors.headline,
    marginTop: 20,
  },
  minicontainer: {
    width: "75%",
  },
  profilecontainer: {
    width: "100%",
    height: 100,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 80,
    maxHeight: "75%",
  },
  buttonscontainer: {
    width: "100%",
    flexDirection: "column",
    gap: 12,
    borderColor: colors.border,
    borderTopWidth: 3,
    paddingTop: 15,
  },
  buttonsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 15,
  },
  flag: {
    width: 99/1.3,
    height: 66/1.3,
    margin: 10,
  },
  arrow: {
    color: colors.border,
  },
  clicked: {
    backgroundColor: colors.my_green,
    borderRadius: 10,
  },
}));
