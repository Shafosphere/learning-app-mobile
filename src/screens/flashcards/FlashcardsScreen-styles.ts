import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  container: {
    flex: 1,
    // justifyContent: "center",
    // alignItems: "center",
    backgroundColor: colors.background,
    // marginTop: 20,
    paddingTop: 15,
    position: "relative",
    display: "flex",
  },
  cardSectionWrapper: {
    marginBottom: 10,
  },
  topButtonsWrapper: {
    marginBottom: 22,
  },
  topActionsWrapper: {
    paddingHorizontal: 16,
    alignItems: "center",
  },
  boxesWrapper: {
    position: "relative",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 2,
  },
  boxesWrapperWithBottomButtons: {
    marginTop: 20,
  },
  bottomButtonsWrapper: {
    marginTop: 8,
    marginBottom: 2,
  },
  addButton: {
    position: "absolute",
    top: -6,
    right: 42,
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.my_yellow,
    justifyContent: "center",
    alignItems: "center",
    shadowRadius: 1.4,
    zIndex: 1000,
  },
  introOverlay: {
    position: "absolute",
    bottom: "30%",
    left: 0,
    right: 0,
    zIndex: 30,
    elevation: 6,
    paddingHorizontal: 4,
    paddingTop: 8,
  },
}));
