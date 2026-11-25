import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook(colors => ({
  directory: { gap: 12 },
  title: { fontSize: 22, fontWeight: "800", color: colors.headline },
  description: { fontSize: 14, lineHeight: 21, color: colors.paragraph },
  search: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.secondBackground },
  searchInput: { flex: 1, minWidth: 0, minHeight: 48, paddingVertical: 12, fontSize: 16, color: colors.headline },
  list: { borderWidth: 1, borderColor: colors.border, borderRadius: 16, overflow: "hidden", backgroundColor: colors.secondBackground },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 14, minHeight: 72 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  rowPressed: { backgroundColor: colors.background },
  rowText: { flex: 1, minWidth: 0, gap: 4 },
  rowTitle: { fontSize: 17, fontWeight: "700", color: colors.headline },
  rowMeta: { fontSize: 13, color: colors.paragraph },
  empty: { padding: 20, fontSize: 15, color: colors.paragraph },
}));
