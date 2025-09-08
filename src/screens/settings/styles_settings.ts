import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    // justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  section: {
    display: "flex",
    flexDirection: "row",
    height: 50,
    width: "100%",
    backgroundColor: colors.secondBackground,
    // padding: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 10,
    paddingRight: 10,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  bigsection: {
    height: 220,
    width: "100%",
    backgroundColor: colors.secondBackground,
    paddingLeft: 10,
    paddingTop: 15,
    paddingRight: 10,
  },
  text: {
    fontSize: 17,
    fontWeight: 900,
    textTransform: "uppercase",
    color: colors.paragraph,
  },
  options: {
    height: "100%",
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-around",
  },
  boxcontainer: {
    width: "45%",
    aspectRatio: 1, // kwadrat
    overflow: "hidden",
    borderRadius: 8,
  },
  boxcontainerSelected: {
    borderWidth: 5,
    borderColor: colors.my_green,
  },
  bigsectiontext: {
    fontSize: 17,
    fontWeight: 900,
    textTransform: "uppercase",
    color: colors.paragraph,
    marginBottom: 15,
  },
}));
