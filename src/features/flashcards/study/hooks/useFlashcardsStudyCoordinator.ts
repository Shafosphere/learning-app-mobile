import { getBoxCarouselNaturalHeight } from "@/src/components/Box/Carousel/BoxCarousel.metrics";
import { useNavbarCompactLayoutSetter, useNavbarLayoutTransition } from "@/src/contexts/NavbarLayoutContext";
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
  const { isCompactStudyLayout, horizontalRowHeight, setActionsHidden } = studyLayout;
  const { areButtonsOnTop, shouldShowBoxes, isFocused } = dockParams;
  const layoutTransition = useNavbarLayoutTransition();
  const setNavbarCompactLayout = useNavbarCompactLayoutSetter();
  useEffect(() => {
    setNavbarCompactLayout(isFocused && isCompactStudyLayout);
    return () => setNavbarCompactLayout(false);
  }, [isFocused, isCompactStudyLayout, setNavbarCompactLayout]);

  const canUseInlineCardAction = (isCompactStudyLayout || horizontalRowHeight != null)
    && inlineCardActionEligible;
  const useInlineCardAction = canUseInlineCardAction && studyLayout.keyboardVisible;
  useEffect(() => setActionsHidden(useInlineCardAction), [useInlineCardAction, setActionsHidden]);

  const dock = useFlashcardsBottomDockLayout({
    ...dockParams,
    hideActions: useInlineCardAction,
    keepActionsAtBottom: canUseInlineCardAction,
    isSmallPhoneLayout: isCompactStudyLayout,
    bottomDockOffsetOverride: studyLayout.bottomDockOffset,
  });
  const isCarouselLayout = boxesLayout !== "classic";
  const carouselBottomClearance = isCarouselLayout && !areButtonsOnTop && !useInlineCardAction
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
            isSmallPhoneLayout: isCompactStudyLayout,
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
    screenSectionLayout: shouldAnimateScreenLayout ? SCREEN_LAYOUT_TRANSITION : undefined,
    studyScrollEnabled: isCompactStudyLayout || studyLayout.needsStudyScroll || studyLayout.keyboardVisible,
    showTopButtons: areButtonsOnTop && shouldShowBoxes && !useInlineCardAction,
    boxesLayoutProps: {
      effectiveBoxesLayout: boxesLayout,
      isTabletLayout,
      isCompactStudyLayout,
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
