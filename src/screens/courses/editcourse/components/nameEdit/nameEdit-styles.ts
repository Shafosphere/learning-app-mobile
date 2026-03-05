import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  label: {
    fontSize: 16,
    textTransform: "uppercase",
    fontWeight: "900",
    color: colors.headline,
  },
  panelLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    fontWeight: "900",
    color: colors.paragraph,
    letterSpacing: 0.2,
  },
  nameInput: {
    borderColor: colors.my_yellow,
    borderWidth: 3,
    borderRadius: 8,
    marginTop: 8,
    paddingLeft: 8,
    fontSize: 16,
    color: colors.headline,
  },
  panelNameInput: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    marginTop: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: colors.headline,
  },
}));
