import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollArea: {
    flex: 1,
    alignSelf: "stretch",
  },
  scrollContent: {
    paddingBottom: 120,
    alignItems: "center",
  },
  minicontainer: {
    width: "75%",
  },
  title: {
    fontSize: 25,
    fontWeight: 900,
    color: colors.headline,
    marginTop: 20,
    marginBottom: 20,
  },
  profileCard: {
    width: "100%",
    minHeight: 92,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.secondBackground,
    borderRadius: 15,
    paddingLeft: "10%",
    paddingRight: "6%",
    position: "relative",
  },
  profileCardText: {
    flex: 1,
    fontSize: 22,
    fontWeight: 800,
    textAlign: "center",
    color: colors.headline,
  },
  profileCardBadge: {
    position: "absolute",
    top: -21,
    right: "-2%",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  profileCardBadgeFlag: {
    width: 99 / 2.5,
    height: 66 / 2.5,
    borderRadius: 5,
  },
  profileCardBadgeText: {
    marginLeft: 6,
    fontSize: 20,
    fontWeight: 800,
    color: colors.headline,
  },
  flag: {
    width: 99 / 1.1,
    height: 66 / 1.1,
  },
  pinButton: {
    marginLeft: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  pinCheckbox: {
    width: 36,
    height: 36,
    borderWidth: 2,
    borderRadius: 8,
    borderColor: colors.border,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  pinCheckboxActive: {
    borderColor: colors.my_green,
    backgroundColor: colors.my_green,
  },
  clicked: {
    backgroundColor: colors.my_green,
  },
  buttonscontainer: {
    width: "100%",
    paddingBottom: 24,
    backgroundColor: colors.background,
    alignItems: "center",
  },
  buttonsRow: {
    borderColor: colors.border,
    borderTopWidth: 3,
    paddingTop: 15,
    width: "75%",
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  footerNote: {
    marginTop: 16,
    fontSize: 12,
    color: colors.paragraph,
    fontStyle: "italic",
  },
}));
