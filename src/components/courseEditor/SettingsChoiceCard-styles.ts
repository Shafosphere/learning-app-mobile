import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors, accessibility) => {
  const highContrast = accessibility.highContrastEnabled;
  const blue = highContrast ? "#0062b8" : "#2186ff";
  const teal = highContrast || accessibility.colorBlindMode !== "none"
    ? colors.my_green
    : "#009b83";

  return {
    section: { marginBottom: 20, gap: 14 },
    separatedSection: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 22,
      marginTop: 2,
    },
    header: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    headerIcon: {
      width: 36,
      height: 36,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    headerText: { flex: 1, minWidth: 0, gap: 5 },
    heading: {
      fontSize: 16,
      lineHeight: 22,
      fontWeight: "800",
      textTransform: "uppercase",
      color: colors.headline,
    },
    description: { fontSize: 14, lineHeight: 20, color: colors.paragraph },
    hint: { fontSize: 13, lineHeight: 19, color: colors.paragraph },
    grid: { gap: 12 },
    row: { flexDirection: "row", alignItems: "stretch", gap: 12 },
    card: {
      flex: 1,
      minWidth: 0,
      minHeight: 48,
      padding: 12,
      borderRadius: 18,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.secondBackground,
      shadowColor: colors.darkbg,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: highContrast ? 0 : 0.04,
      shadowRadius: 8,
      elevation: highContrast ? 0 : 1,
    },
    thinCardBorder: { borderWidth: 1 },
    selectedCardBorder: { borderWidth: 2 },
    pressed: { opacity: 0.85 },
    disabled: { opacity: highContrast ? 1 : 0.6 },
    cardBody: { gap: 10 },
    wideBody: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", paddingRight: 30 },
    visuals: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 6 },
    optionIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    optionText: { minWidth: 0, gap: 5 },
    wideText: { flexGrow: 1, flexShrink: 1, flexBasis: 120 },
    optionTitle: { fontSize: 16, lineHeight: 22, fontWeight: "800", color: colors.headline },
    optionDescription: { fontSize: 13, lineHeight: 19, color: colors.paragraph },
    selectionCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: highContrast ? colors.paragraph : "#8793a6",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    wideCircle: { position: "absolute", top: 12, right: 12 },
    neutralIcon: { color: colors.paragraph },
    blueIcon: { color: blue },
    tealIcon: { color: teal },
    blueTint: { backgroundColor: "rgba(33, 134, 255, 0.10)" },
    tealTint: {
      backgroundColor: highContrast || accessibility.colorBlindMode !== "none"
        ? colors.background
        : "rgba(0, 155, 131, 0.10)",
    },
    blueSelected: { borderColor: blue },
    tealSelected: { borderColor: teal },
    selectedTint: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, borderRadius: 16 },
    blueSelectedTint: { backgroundColor: "rgba(33, 134, 255, 0.04)" },
    tealSelectedTint: {
      backgroundColor: highContrast || accessibility.colorBlindMode !== "none"
        ? colors.background
        : "rgba(0, 155, 131, 0.04)",
    },
    blueCircle: { borderColor: blue, backgroundColor: blue },
    tealCircle: { borderColor: teal, backgroundColor: teal },
    blueCheck: { color: "#ffffff" },
    tealCheck: { color: highContrast || accessibility.colorBlindMode !== "none" ? colors.background : "#ffffff" },
  };
});
