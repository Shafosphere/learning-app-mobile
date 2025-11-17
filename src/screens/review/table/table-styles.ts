import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.headline,
  },
  table: {
    flex: 1,
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.secondBackground,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.my_green,
  },
  headerCell: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.secondBackground,
  },
  scrollArea: {
    flex: 1,
  },
  tableBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: "transparent",
  },
  cell: {
    fontSize: 16,
    color: colors.headline,
  },
  termColumn: {
    flex: 1,
  },
  translationColumn: {
    flex: 1.2,
  },
  rowCorrect: {
    borderLeftColor: colors.my_green,
    backgroundColor: colors.my_green + "1a",
  },
  rowIncorrect: {
    borderLeftColor: colors.my_red,
    backgroundColor: colors.my_red + "15",
  },
  cellCorrect: {
    color: colors.my_green,
  },
  cellIncorrect: {
    color: colors.my_red,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    color: colors.paragraph,
    textAlign: "center",
  },
  footer: {
    alignItems: "flex-end",
  },
  loopIcon: {
    color: colors.headline,
  },
}));
