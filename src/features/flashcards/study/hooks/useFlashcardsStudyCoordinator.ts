import { SINGLE_ROW_BOX_MIN_HEIGHT } from "@/src/components/Box/List/BoxList.metrics";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useDeviceLayout } from "@/src/hooks/useDeviceLayout";
import { getBoxCarouselNaturalHeight } from "@/src/components/Box/Carousel/BoxCarousel.metrics";
import { useNavbarCompactLayoutSetter, useNavbarLayoutTransition } from "@/src/contexts/NavbarLayoutContext";
import { useQuoteSuppression } from "@/src/contexts/QuoteSuppressionContext";
import { useAutoScaleToFit } from "@/src/hooks/useAutoScaleToFit";
import { useCallback, useEffect } from "react";
import type { LayoutChangeEvent } from "react-native";
import {
  CAROUSEL_BOXES_MIN_SCALE,
  CLASSIC_PHONE_BOXES_MIN_SCALE,
  SCREEN_LAYOUT_TRANSITION,
} from "../study.constants";
import { useFlashcardsBottomDockLayout } from "./useFlashcardsBottomDockLayout";
import type { useFlashcardsStudyLayout } from "./useFlashcardsStudyLayout";

type DockParams = Parameters<typeof useFlashcardsBottomDockLayout>[0];
type Params = Omit<DockParams, "hideActions" | "keepActionsAtBottom" | "isSmallPhoneLayout" | "bottomDockOffsetOverride"> & {
  // Geometry is measured before tutorial/action state is resolved. Reuse that
  // single instance so hint policy and presentation see the same measurements.
  studyLayout: ReturnType<typeof useFlashcardsStudyLayout>;
  isTabletLayout: boolean;
  boxesLayout: string;
  inlineCardActionEligible: boolean;
  shouldAnimateScreenLayout: boolean;
};

export function useFlashcardsStudyCoordinator({
  studyLayout, isTabletLayout, boxesLayout, inlineCardActionEligible,
  shouldAnimateScreenLayout, ...dockParams
}: Params) {
  const { orientation } = useDeviceLayout();
  const { flashcardsLandscapeEnabled } = useSettings();
  const isLandscapeStudy = flashcardsLandscapeEnabled === true
    && isTabletLayout && orientation === "landscape";
  const { isCompactStudyLayout, setActionsHidden } = studyLayout;
  const isCompactBoxesLayout = isCompactStudyLayout || isLandscapeStudy;
  // The 80dp phone fallback makes the boxes disproportionately small on a
  // wide tablet. Grow the illustrations while retaining a single compact row.
  const landscapeBoxRowHeight = Math.max(SINGLE_ROW_BOX_MIN_HEIGHT, Math.min(124,
    studyLayout.availableStudyHeight - studyLayout.visibleCardHeight - 120));
  const horizontalRowHeight = isLandscapeStudy
    ? landscapeBoxRowHeight : studyLayout.horizontalRowHeight;
  const { areButtonsOnTop, shouldShowBoxes, isFocused } = dockParams;
  useQuoteSuppression(isFocused && (isCompactStudyLayout || isLandscapeStudy));
  const layoutTransition = useNavbarLayoutTransition();
  const setNavbarCompactLayout = useNavbarCompactLayoutSetter();
  useEffect(() => {
    setNavbarCompactLayout(isFocused && (isCompactStudyLayout || isLandscapeStudy));
    return () => setNavbarCompactLayout(false);
  }, [isFocused, isCompactStudyLayout, isLandscapeStudy, setNavbarCompactLayout]);

  const canUseInlineCardAction = (isLandscapeStudy || isCompactStudyLayout || horizontalRowHeight != null)
    && inlineCardActionEligible;
  const useInlineCardAction = canUseInlineCardAction && studyLayout.keyboardVisible;
  useEffect(() => setActionsHidden(useInlineCardAction), [useInlineCardAction, setActionsHidden]);

  const dock = useFlashcardsBottomDockLayout({
    ...dockParams,
    hideActions: useInlineCardAction,
    keepActionsAtBottom: canUseInlineCardAction,
    isSmallPhoneLayout: isCompactStudyLayout,
    bottomDockOffsetOverride: isLandscapeStudy ? 24 : studyLayout.bottomDockOffset,
  });
  const isCarouselLayout = boxesLayout !== "classic";
  const carouselBottomClearance = isCarouselLayout && !isLandscapeStudy && !areButtonsOnTop && !useInlineCardAction
    ? Math.max(56, Math.min(96, dock.bottomButtonsReservedSpace)) : 0;
  const classicBoxesMinScale = isTabletLayout
    ? areButtonsOnTop ? 0.72 : 0.54
    : CLASSIC_PHONE_BOXES_MIN_SCALE;
  const scale = useAutoScaleToFit({
    layoutTransition,
    minScale: horizontalRowHeight != null ? 1
      : isCarouselLayout ? CAROUSEL_BOXES_MIN_SCALE : classicBoxesMinScale,
    ...(!isTabletLayout && !isCarouselLayout && studyLayout.classicBoxesNaturalHeight > 0
      ? { stableContentHeight: horizontalRowHeight ?? studyLayout.classicBoxesNaturalHeight }
      : isCarouselLayout
        ? { stableContentHeight: getBoxCarouselNaturalHeight({
            isSmallPhoneLayout: isCompactBoxesLayout,
            bottomClearance: carouselBottomClearance,
          }) }
        : {}),
  });
  const { onContentLayout } = scale;
  const { onBoxesNaturalLayout } = studyLayout;
  const onBoxesContentLayout = useCallback((event: LayoutChangeEvent) => {
    onContentLayout(event);
    onBoxesNaturalLayout(event);
  }, [onContentLayout, onBoxesNaturalLayout]);
  const isTabletCenteredStudyLayout = isTabletLayout && shouldShowBoxes;

  return {
    studyLayout,
    dock,
    useInlineCardAction,
    areButtonsOnTop,
    isTabletCenteredStudyLayout,
    isLandscapeStudy,
    // Tablet rotation changes both the centered stack and box presentation.
    // Keep section positions native in both orientations so an interrupted
    // portrait transition cannot leave a stale offset on the landscape card.
    screenSectionLayout: shouldAnimateScreenLayout && !isTabletLayout ? SCREEN_LAYOUT_TRANSITION : undefined,
    studyScrollEnabled: isCompactStudyLayout || studyLayout.needsStudyScroll || studyLayout.keyboardVisible,
    showTopButtons: areButtonsOnTop && shouldShowBoxes && !useInlineCardAction,
    boxesLayoutProps: {
      effectiveBoxesLayout: boxesLayout,
      isTabletLayout,
      isCompactStudyLayout: isCompactBoxesLayout,
      isTabletCompactBoxesLayout: isTabletCenteredStudyLayout && areButtonsOnTop,
      areButtonsOnTop,
      hideActions: useInlineCardAction,
      horizontalRowHeight,
      boxesScale: horizontalRowHeight != null ? 1 : scale.scale,
      boxesScaledHeight: horizontalRowHeight ?? scale.scaledHeight,
      classicBoxesNaturalHeight: !isTabletLayout && !isCarouselLayout
        ? horizontalRowHeight ?? studyLayout.classicBoxesNaturalHeight : undefined,
      boxesScaleOffsetY: horizontalRowHeight != null ? 0 : scale.scaleOffsetY,
      boxesNeedScrollFallback: horizontalRowHeight == null && scale.needsScrollFallback,
      carouselBottomClearance,
      onBoxesViewportLayout: scale.onViewportLayout,
      onBoxesContentLayout,
    },
  };
}
