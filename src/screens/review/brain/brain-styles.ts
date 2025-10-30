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
    flexDirection: "row",
    flexWrap: "wrap",
  },
  logo: {
    width: 200,
    height: 200,
    resizeMode: "contain",
  },
  counter: {
    color: colors.headline,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  memorySection: {
    width: "100%",
    alignItems: "center",
    gap: 12,
  },
  memoryTitle: {
    color: colors.headline,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center" as const,
  },
  memorySubtitle: {
    color: colors.paragraph,
    fontSize: 14,
    textAlign: "center" as const,
  },
  memoryOptions: {
    flexDirection: "row" as const,
    justifyContent: "center" as const,
    gap: 12,
  },
  memoryOption: {
    minWidth: 110,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.secondBackground,
    alignItems: "center" as const,
    gap: 4,
  },
  memoryOptionActive: {
    borderColor: colors.my_green,
    backgroundColor: colors.my_green,
  },
  memoryOptionLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.headline,
  },
  memoryOptionLabelActive: {
    color: colors.secondBackground,
  },
  memoryOptionMeta: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.paragraph,
  },
  memoryOptionMetaActive: {
    color: colors.secondBackground,
  },
}));
