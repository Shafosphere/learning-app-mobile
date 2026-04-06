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
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    zIndex: 40,
  },
  loadingOverlayContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
  },
  cardSectionWrapper: {
    marginBottom: 10,
  },
  topButtonsWrapper: {
    marginBottom: 10,
  },
  topActionsWrapper: {
    paddingHorizontal: 16,
    alignItems: "center",
  },
  boxesWrapper: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    position: "relative",
    alignItems: "center",
    paddingHorizontal: 12,
    marginTop: 0,
  },
  boxesWrapperWithBottomButtons: {
    marginTop: 8,
  },
  boxesViewport: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    alignItems: "center",
  },
  boxesViewportScrollContent: {
    width: "100%",
    alignItems: "center",
  },
  boxesScaledContent: {
    width: "100%",
    alignItems: "center",
  },
  bottomButtonsWrapper: {
    marginTop: 4,
    marginBottom: 2,
  },
  bottomButtonsDock: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
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
