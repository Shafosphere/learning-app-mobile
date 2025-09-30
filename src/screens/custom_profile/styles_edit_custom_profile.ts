import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useEditStyles = createThemeStylesHook((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 18,
    minHeight: "100%",
    paddingTop: 32,
  },
  section: {
    backgroundColor: colors.secondBackground,
    borderRadius: 16,
    padding: 16,
    paddingTop: 32,
  },
  sectionHeader: {
    fontSize: 24,
    textTransform: "uppercase",
    position: "absolute",
    fontWeight: "900",
    right: 24,
    top: 10,
    color: colors.headline,
  },
  miniSectionHeader: {
    fontSize: 16,
    textTransform: "uppercase",
    fontWeight: "900",
    color: colors.headline,
  },
  profileInput: {
    borderColor: colors.my_yellow,
    borderWidth: 3,
    borderRadius: 8,
    marginBottom: 8,
    paddingLeft: 8,
    fontSize: 16,
  },
  card: {
    height: 100,
    flexDirection: "row",
    width: "100%",
    borderBottomWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
  },
  cardFirst: {
    borderTopWidth: 2,
  },
  number: {
    fontSize: 16,
    fontWeight: 900,
    width: "10%",
    textAlign: "center",
    textAlignVertical: "center",
  },
  inputContainer: {
    width: "80%",
  },
  cardinput: {
    height: "50%",
    width: "100%",
    fontSize: 16,
    fontWeight: 800,
  },
  cardDivider: {
    borderStyle: "dashed",
    borderTopWidth: 1,
    borderColor: colors.border,
    alignSelf: "stretch",
  },
  manualAddButton: {
    alignSelf: "flex-end",
    backgroundColor: colors.my_yellow,
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  manualAddIcon: {
    color: colors.headline,
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 30,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
}));
