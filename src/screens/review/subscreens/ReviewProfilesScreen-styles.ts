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
    paddingBottom: 32,
    alignItems: "center",
  },
  minicontainer: {
    width: "75%",
    gap: 16,
    paddingTop: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: colors.headline,
    textAlign: "right",
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 25,
    fontWeight: 900,
    color: colors.headline,
  },
  profileCard: {
    width: "100%",
    height: 92,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.secondBackground,
    borderRadius: 15,
    paddingLeft: "10%",
    paddingRight: "6%",
    position: "relative",
  },
  profileCardContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  profileCardText: {
    fontSize: 24,
    fontWeight: "900",
    color: colors.headline,
  },
  profileCardBadge: {
    position: "absolute",
    top: -21,
    right: 0,
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
    fontSize: 22,
    fontWeight: "800",
    color: colors.headline,
  },
  countBadge: {
    minWidth: 72,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  countNumber: {
    fontSize: 22,
    fontWeight: "900",
    height: 25,
    width: 25,
    display: "flex",
    justifyContent: "center",
    textAlign: "center",
    textAlignVertical: "center",
    // backgroundColor: colors.border,
  },
  countLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.paragraph,
  },
  flag: {
    width: 99 / 1.1,
    height: 66 / 1.1,
  },
  customList: {
    flexDirection: "column",
    gap: 12,
  },
  customCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 15,
    paddingLeft: "10%",
    paddingRight: "10%",
    backgroundColor: colors.secondBackground,
    height: 92,
  },
  customCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flex: 1,
  },
  customCardInfo: {
    gap: 4,
  },
  customCardTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: colors.headline,
  },
  customCardMeta: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.paragraph,
  },
  emptyText: {
    color: colors.paragraph,
    fontStyle: "italic",
  },
}));
