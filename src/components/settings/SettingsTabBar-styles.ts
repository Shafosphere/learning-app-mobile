import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  bar: {
    width: "100%",
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 14,
    alignItems: "center",
  },
  inner: {
    flexDirection: "row",
    width: "100%",
    backgroundColor: colors.background,
    borderRadius: 16,
    position: "relative",
    overflow: "visible",
  },
  innerTablet: { maxWidth: 500 },
  button: { flex: 1, borderRadius: 16, zIndex: 2, minHeight: 48 },
  buttonInner: {
    flex: 1,
    width: "100%",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    color: colors.paragraph,
    textAlign: "center",
    opacity: 0.85,
    width: 22,
  },
  iconActive: { color: colors.headline, opacity: 1 },
}));
