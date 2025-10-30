import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  root: {
    flex: 1,
    width: "100%",
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    width: "100%",
  },
  footerContainer: {
    width: "100%",
    paddingTop: 12,
    gap: 12,
    alignItems: "center",
    backgroundColor: colors.background,
  },
  footerRow: {
    borderColor: colors.border,
    borderTopWidth: 3,
    paddingTop: 15,
    width: "90%",
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
}));

export const FOOTER_BASE_PADDING = 24;
