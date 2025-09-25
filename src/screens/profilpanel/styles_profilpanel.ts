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
  customSection: {
    width: "100%",
    marginTop: 24,
    gap: 12,
  },
  customSectionTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: colors.headline,
  },
  customList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  customEmptyText: {
    color: colors.paragraph,
    fontStyle: "italic",
  },
  customCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.secondBackground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customCardSelected: {
    borderColor: colors.my_green,
    backgroundColor: colors.lightbg,
  },
  customCardContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  customIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.lightbg,
  },
  customCardInfo: {
    marginLeft: 12,
    flex: 1,
  },
  customCardTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: colors.headline,
  },
  customCardMeta: {
    marginTop: 4,
    fontSize: 13,
    color: colors.paragraph,
  },
  customEditButton: {
    padding: 8,
    borderRadius: 20,
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
