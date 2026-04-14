import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  container: {
    position: "relative",
    backgroundColor: colors.secondBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
    paddingLeft: 78,
    overflow: "visible",
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  floating: {
    position: "absolute",
    zIndex: 30,
    elevation: 6,
  },
  logo: {
    position: "absolute",
    left: -12,
    bottom: -10,
    width: 68,
    height: 68,
    resizeMode: "contain",
  },
  textWrapper: {
    flex: 1,
  },
  textContent: {
    paddingBottom: 2,
  },
  navRow: {
    position: "absolute",
    right: 12,
    bottom: -52,
    flexDirection: "row",
    gap: 10,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  navButtonBack: {
    backgroundColor: colors.my_yellow,
  },
  navButtonForward: {
    backgroundColor: colors.my_green,
  },
  navButtonPressed: {
    opacity: 0.82,
  },
  navButtonDisabled: {
    opacity: 0.45,
  },
  navIcon: {
    color: colors.headline,
  },
  navIconDisabled: {
    color: colors.paragraph,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.headline,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.paragraph,
    opacity: 0.85,
  },
}));
