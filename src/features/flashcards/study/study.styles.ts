import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import {
  BOXES_BOTTOM_ACTIONS_TOP_GAP,
  BOXES_HORIZONTAL_PADDING,
  CARD_SECTION_BOTTOM_GAP,
  TOP_BUTTONS_BOTTOM_GAP,
} from "./study.constants";

import type { ThemeColors } from "@/src/theme/theme";

export const createFlashcardsStudyStyles = (colors: ThemeColors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 15,
    position: "relative",
    display: "flex",
  },
  keyboardBridgeInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0.01,
    top: 0,
    left: 0,
  },
  content: {
    flex: 1,
  },
  studyStack: {
    width: "100%",
  },
  tabletCenteredStudyStack: {
    flexGrow: 1,
    justifyContent: "center",
    width: "100%",
  },
  cardSectionWrapper: {
    marginBottom: CARD_SECTION_BOTTOM_GAP,
  },
  finishedCardSectionWrapper: {
    flex: 1,
    minHeight: 0,
  },
  topButtonsWrapper: {
    marginBottom: TOP_BUTTONS_BOTTOM_GAP,
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
    paddingHorizontal: BOXES_HORIZONTAL_PADDING,
    marginTop: 0,
  },
  boxesWrapperWithBottomButtons: {
    marginTop: BOXES_BOTTOM_ACTIONS_TOP_GAP,
  },
  tabletCompactBoxesWrapper: {
    flex: 0,
  },
  boxesViewport: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    alignItems: "center",
  },
  tabletCompactBoxesViewport: {
    flex: 0,
  },
  boxesScrollViewport: {
    flex: 1,
    minHeight: 0,
    width: "100%",
  },
  tabletCompactBoxesScrollViewport: {
    flex: 0,
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
    width: "100%",
    marginTop: 4,
    marginBottom: 2,
  },
  bottomButtonsDock: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
  },
} as const);

export const useStyles = createThemeStylesHook(createFlashcardsStudyStyles);
