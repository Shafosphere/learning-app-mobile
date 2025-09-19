import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  tabBar: {
    flexDirection: "row",
    width: "100%",
    backgroundColor: colors.secondBackground,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  tabButtonActive: {
    backgroundColor: colors.my_green,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    color: colors.paragraph,
  },
  tabLabelActive: {
    color: colors.background,
  },
  content: {
    flex: 1,
    width: "100%",
  },
  scrollContent: {
    paddingBottom: 32,
  },
  sectionCard: {
    backgroundColor: colors.secondBackground,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 18,
    marginBottom: 16,
    shadowColor: "#00000011",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.paragraph,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  rowTextWrapper: {
    flex: 1,
    paddingRight: 12,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.paragraph,
  },
  rowSubtitle: {
    fontSize: 13,
    color: colors.paragraph,
    opacity: 0.75,
    marginTop: 4,
  },
  switch: {
    transform: [{ scaleX: 1.12 }, { scaleY: 1.12 }],
  },
  layoutOptions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  layoutOption: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: colors.background,
    marginHorizontal: 4,
  },
  layoutOptionActive: {
    borderColor: colors.my_green,
  },
  layoutImage: {
    width: "100%",
    aspectRatio: 1,
  },
  layoutLabel: {
    textAlign: "center",
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: "600",
    color: colors.paragraph,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 80,
    textAlign: "center",
    color: colors.paragraph,
  },
  buttonsContainer: {
    marginTop: 16,
    alignItems: "center",
  },
  infoText: {
    marginTop: 10,
    fontSize: 13,
    color: colors.paragraph,
    opacity: 0.75,
    textAlign: "center",
  },
}));
