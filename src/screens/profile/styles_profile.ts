import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  minicontainer: {
    width: "75%",
    // height: "50%",
  },
  title: {
    fontSize: 25,
    fontWeight: "bold",
    color: colors.headline,
    marginTop: 20,
    marginBottom: 5,
  },
  grid: {
    width: "100%",
    gap: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  flag: {
    width: 90,
    height: 60,
    borderRadius: 4,
    overflow: "hidden",
  },
  flagActive: {
    borderColor: colors.my_green,
    borderWidth: 4,
    borderRadius: 10,
  },
  buttoncontainer: {
    // flex: 1,
    width: "75%",
    height: "20%",
    marginTop: 40,
    // padding: 20,
    display: "flex",
    flexDirection: "row-reverse",
  },
}));
