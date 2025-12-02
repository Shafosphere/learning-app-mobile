import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 24,
    backgroundColor: colors.background,
    display: "flex",
    flexDirection: "column",
    flexWrap: "wrap",
    alignContent: "center",
  },
  button: {
    width: 256,
    height: 256,
    borderWidth: 30,
    borderColor: colors.border,
    alignItems: "center",
    // justifyContent: "top",
  },
  topbutton: {
    borderTopWidth: 0,
    justifyContent: "flex-end"
  },
  botbutton: {
    borderBottomWidth: 0,
    justifyContent: "flex-start"
  },
  header:{
    fontSize: 32,
    fontWeight: 900,
    color: colors.headline,
    marginTop: 16,
    marginBottom: 16,
  }
}));
