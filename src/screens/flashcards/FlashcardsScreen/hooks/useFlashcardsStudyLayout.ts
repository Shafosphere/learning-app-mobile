import { useKeyboardVisibility } from "@/src/hooks/useKeyboardVisibility";
import { logFlashcardsScrollDebug } from "@/src/services/flashcardsScrollDebug";
import { useNavbarLayoutTransition } from "@/src/contexts/NavbarLayoutContext";
import { getBoxCarouselNaturalHeight } from "@/src/components/Box/Carousel/BoxCarousel.metrics";
import {
  getClassicBoxNaturalHeight,
  CLASSIC_BOX_SKIN_HEIGHT,
  CLASSIC_BOX_VERTICAL_EXTRA,
  SINGLE_ROW_BOX_MIN_HEIGHT,
} from "@/src/components/Box/List/BoxList.metrics";
import { CARD_CONTENT_GAP, CARD_HINT_HEIGHT } from "@/src/components/card/cardLayout.constants";
import { useCallback, useEffect, useRef, useState } from "react";
import { type LayoutChangeEvent } from "react-native";
import {
  BOTTOM_BUTTONS_DOCK_BOTTOM_OFFSET,
  BOTTOM_BUTTONS_MIN_HEIGHT,
  BOXES_BOTTOM_ACTIONS_TOP_GAP,
  BOXES_HORIZONTAL_PADDING,
  CARD_SECTION_BOTTOM_GAP,
  CAROUSEL_BOXES_MIN_SCALE,
  CLASSIC_PHONE_BOXES_MIN_SCALE,
  COMPACT_BOTTOM_BUTTONS_DOCK_BOTTOM_OFFSET,
  TOP_BUTTONS_BOTTOM_GAP,
} from "../model/FlashcardsScreen.constants";

const LAYOUT_TOLERANCE = 1;
const NORMAL_LAYOUT_RECOVERY_SPACE = 8;

type Params = {
  isTabletLayout: boolean;
  boxesLayout: string;
  areButtonsOnTop: boolean;
  isFocused?: boolean;
};

function measuredHeight(event: LayoutChangeEvent) {
  return Math.max(0, event.nativeEvent.layout.height);
}

export function useFlashcardsStudyLayout({
  isTabletLayout,
  boxesLayout,
  areButtonsOnTop,
  isFocused = true,
}: Params) {
  const [isCompactStudyLayout, setIsCompactStudyLayout] = useState(false);
  const [availableStudyHeight, setAvailableStudyHeight] = useState(0);
  const [visibleStudyHeight, setVisibleStudyHeight] = useState(0);
  const [availableStudyWidth, setAvailableStudyWidth] = useState(0);
  const [fullCardSectionHeight, setFullCardSectionHeight] = useState(0);
  const [measuredClassicBoxesHeight, setMeasuredClassicBoxesHeight] = useState(0);
  const [cardMeasurement, setCardMeasurement] = useState({ height: 0, hintSpace: 0 });
  const [topButtonsHeight, setTopButtonsHeight] = useState(0);
  const [bottomButtonsHeight, setBottomButtonsHeight] = useState(0);
  const { keyboardVisible, keyboardTopInWindow } = useKeyboardVisibility(isFocused);
  const [actionsHidden, setActionsHidden] = useState(false);
  const [visibleCardHeight, setVisibleCardHeight] = useState(0);
  const layoutTransition = useNavbarLayoutTransition();
  const pendingStudyLayoutRef = useRef<{ height: number; width: number } | null>(null);

  const commitStudyLayout = useCallback(() => {
    const measurement = pendingStudyLayoutRef.current;
    if (!measurement) return;
    const { height, width } = measurement;
    logFlashcardsScrollDebug("study.layout.commit", { height, width, keyboardVisible, availableStudyWidth });
    // Keep stable box geometry, but use the resized viewport for scrolling.
    setVisibleStudyHeight(height);
    setAvailableStudyWidth(width);
    setAvailableStudyHeight((previous) => keyboardVisible && previous > 0 && availableStudyWidth === width
      ? Math.max(previous, height)
      : height);
  }, [keyboardVisible, availableStudyWidth]);

  const onStudyLayout = useCallback((event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    pendingStudyLayoutRef.current = { height: measuredHeight(event), width };
    logFlashcardsScrollDebug("study.layout.native", {
      layout: event.nativeEvent.layout,
      deferred: layoutTransition.isRunning() && width === availableStudyWidth,
      keyboardVisible,
    });
    // Rotation and initial measurement still take effect immediately.
    if (!layoutTransition.isRunning() || width !== availableStudyWidth) commitStudyLayout();
  }, [layoutTransition, availableStudyWidth, commitStudyLayout, keyboardVisible]);

  useEffect(() => layoutTransition.subscribe(commitStudyLayout), [layoutTransition, commitStudyLayout]);

  const onCardSectionLayout = useCallback((event: LayoutChangeEvent) => {
    logFlashcardsScrollDebug("card.section.layout", { layout: event.nativeEvent.layout, actionsHidden, isCompactStudyLayout });
    setVisibleCardHeight(measuredHeight(event));
    if (actionsHidden) return;
    // Reconstruct the full layout even while the hint is absent. Otherwise
    // compact saves space, selects normal, runs out of space, and repeats.
    const hintSpace = isCompactStudyLayout ? CARD_HINT_HEIGHT + CARD_CONTENT_GAP : 0;
    const height = measuredHeight(event);
    if (height > 0) {
      setCardMeasurement((previous) => previous.height === height && previous.hintSpace === hintSpace
        ? previous
        : { height, hintSpace });
    }
  }, [isCompactStudyLayout, actionsHidden]);

  const previousActionsHidden = useRef(false);
  useEffect(() => {
    const restoringActions = previousActionsHidden.current && !actionsHidden;
    previousActionsHidden.current = actionsHidden;
    if (!restoringActions || visibleCardHeight <= 0) return;
    const hintSpace = isCompactStudyLayout ? CARD_HINT_HEIGHT + CARD_CONTENT_GAP : 0;
    setCardMeasurement({ height: visibleCardHeight, hintSpace });
  }, [actionsHidden, visibleCardHeight, isCompactStudyLayout]);

  // Reconstruct the card with its hint; compact mode must not change the
  // requirement used to decide whether that hint can return.
  useEffect(() => {
    if (cardMeasurement.height <= 0) return;
    const timer = setTimeout(() => {
      setFullCardSectionHeight(cardMeasurement.height + cardMeasurement.hintSpace);
    }, 60);
    return () => clearTimeout(timer);
  }, [cardMeasurement]);

  const onTopButtonsLayout = useCallback((event: LayoutChangeEvent) => {
    logFlashcardsScrollDebug("buttons.top.layout", { layout: event.nativeEvent.layout });
    setTopButtonsHeight(measuredHeight(event));
  }, []);

  const onBottomButtonsLayout = useCallback((event: LayoutChangeEvent) => {
    logFlashcardsScrollDebug("buttons.bottom.layout", { layout: event.nativeEvent.layout });
    setBottomButtonsHeight(measuredHeight(event));
  }, []);

  const onBoxesNaturalLayout = useCallback((event: LayoutChangeEvent) => {
    if (boxesLayout === "classic") {
      const height = measuredHeight(event);
      if (height > 0) setMeasuredClassicBoxesHeight(height);
    }
  }, [boxesLayout]);

  const fullBottomReservedSpace = Math.max(bottomButtonsHeight, BOTTOM_BUTTONS_MIN_HEIGHT)
    + BOTTOM_BUTTONS_DOCK_BOTTOM_OFFSET;
  const carouselBottomClearance = areButtonsOnTop
    ? 0
    : Math.max(56, Math.min(96, fullBottomReservedSpace));
  // Both five and six boxes form two rows. Geometry is shared with BoxList,
  // so a collapsed/unmeasured viewport cannot make the required height zero.
  const classicBoxesNaturalHeight = Math.max(measuredClassicBoxesHeight,
    availableStudyWidth > 0
      ? getClassicBoxNaturalHeight(Math.max(0, availableStudyWidth - BOXES_HORIZONTAL_PADDING * 2))
      : 0);
  const minimumGridBoxesHeight = Math.ceil(boxesLayout === "classic"
    ? classicBoxesNaturalHeight * CLASSIC_PHONE_BOXES_MIN_SCALE
    : getBoxCarouselNaturalHeight({
        isSmallPhoneLayout: false,
        bottomClearance: carouselBottomClearance,
      }) * CAROUSEL_BOXES_MIN_SCALE);
  const minimumGridStudyHeight = fullCardSectionHeight
    + CARD_SECTION_BOTTOM_GAP
    + minimumGridBoxesHeight
    + (areButtonsOnTop
      ? topButtonsHeight + TOP_BUTTONS_BOTTOM_GAP
      : fullBottomReservedSpace + BOXES_BOTTOM_ACTIONS_TOP_GAP);
  const normalControlsSpace = areButtonsOnTop
    ? topButtonsHeight + TOP_BUTTONS_BOTTOM_GAP
    : fullBottomReservedSpace + BOXES_BOTTOM_ACTIONS_TOP_GAP;
  const isClassicPhoneLayout = !isTabletLayout && boxesLayout === "classic";
  // Exhaust grid scaling and decorative spacing before changing box rows.
  // Keep a readable image and hint; only hide the hint if even one row needs it.
  const tightControlsSpace = areButtonsOnTop
    ? topButtonsHeight + TOP_BUTTONS_BOTTOM_GAP
    : Math.max(bottomButtonsHeight, BOTTOM_BUTTONS_MIN_HEIGHT) + BOXES_BOTTOM_ACTIONS_TOP_GAP;
  const tightCardBottomGap = 6;
  const minimumFullStudyHeight = isClassicPhoneLayout
    ? fullCardSectionHeight + tightCardBottomGap + SINGLE_ROW_BOX_MIN_HEIGHT + tightControlsSpace
    : minimumGridStudyHeight;
  const hasMeasurements = availableStudyHeight > 0
    && fullCardSectionHeight > 0
    && minimumGridBoxesHeight > 0;

  useEffect(() => {
    if (isTabletLayout) {
      setIsCompactStudyLayout(false);
      return;
    }
    if (!hasMeasurements) return;
    setIsCompactStudyLayout((compact) => compact
      ? keyboardVisible || availableStudyHeight < minimumFullStudyHeight + NORMAL_LAYOUT_RECOVERY_SPACE
      : availableStudyHeight + LAYOUT_TOLERANCE < minimumFullStudyHeight);
  }, [isTabletLayout, hasMeasurements, availableStudyHeight, minimumFullStudyHeight, keyboardVisible]);

  const activeCardHeight = fullCardSectionHeight
    - (isCompactStudyLayout ? CARD_HINT_HEIGHT + CARD_CONTENT_GAP : 0);
  const compactControlsSpace = areButtonsOnTop
    ? topButtonsHeight + TOP_BUTTONS_BOTTOM_GAP
    : Math.max(bottomButtonsHeight, BOTTOM_BUTTONS_MIN_HEIGHT)
      + COMPACT_BOTTOM_BUTTONS_DOCK_BOTTOM_OFFSET + BOXES_BOTTOM_ACTIONS_TOP_GAP;
  const layoutControlsSpace = isCompactStudyLayout ? compactControlsSpace : normalControlsSpace;
  const tightGridStudyHeight = activeCardHeight + tightCardBottomGap
    + minimumGridBoxesHeight + tightControlsSpace;
  const useTightSpacing = isClassicPhoneLayout && hasMeasurements
    && activeCardHeight + CARD_SECTION_BOTTOM_GAP + minimumGridBoxesHeight + layoutControlsSpace
      > availableStudyHeight + LAYOUT_TOLERANCE;
  const useSingleRowBoxes = isClassicPhoneLayout && hasMeasurements
    && (isCompactStudyLayout || tightGridStudyHeight > availableStudyHeight + LAYOUT_TOLERANCE);
  const cardBottomGap = useTightSpacing ? tightCardBottomGap : CARD_SECTION_BOTTOM_GAP;
  const defaultDockOffset = isCompactStudyLayout
    ? COMPACT_BOTTOM_BUTTONS_DOCK_BOTTOM_OFFSET : BOTTOM_BUTTONS_DOCK_BOTTOM_OFFSET;
  const gridDockAllowance = availableStudyHeight - activeCardHeight - cardBottomGap
    - minimumGridBoxesHeight - tightControlsSpace;
  const bottomDockOffset = useTightSpacing && !areButtonsOnTop
    ? Math.max(0, Math.min(defaultDockOffset, Math.floor(gridDockAllowance)))
    : undefined;
  const boxControlsSpace = useTightSpacing
    ? tightControlsSpace + (bottomDockOffset ?? 0) : layoutControlsSpace;
  const chosenControlsSpace = actionsHidden ? 0 : boxControlsSpace;
  // Compact boxes have fixed geometry. Navbar keyboard animations change
  // available space, but must not resize every illustration and counter.
  const horizontalRowHeight = useSingleRowBoxes
    ? isCompactStudyLayout
      ? SINGLE_ROW_BOX_MIN_HEIGHT
      : Math.max(SINGLE_ROW_BOX_MIN_HEIGHT, Math.min(CLASSIC_BOX_SKIN_HEIGHT + CLASSIC_BOX_VERTICAL_EXTRA,
          Math.floor(availableStudyHeight - activeCardHeight - cardBottomGap - boxControlsSpace)))
    : undefined;
  const needsStudyScroll = (useSingleRowBoxes || keyboardVisible)
    && activeCardHeight + cardBottomGap
      + (useSingleRowBoxes ? SINGLE_ROW_BOX_MIN_HEIGHT : minimumGridBoxesHeight) + chosenControlsSpace
      > visibleStudyHeight + LAYOUT_TOLERANCE;

  return {
    isCompactStudyLayout: !isTabletLayout && isCompactStudyLayout,
    availableStudyHeight,
    visibleStudyHeight,
    minimumFullStudyHeight,
    minimumFullBoxesHeight: boxesLayout === "classic" ? SINGLE_ROW_BOX_MIN_HEIGHT : minimumGridBoxesHeight,
    fullCardSectionHeight,
    classicBoxesNaturalHeight,
    minimumGridStudyHeight,
    tightGridStudyHeight,
    minimumGridBoxesHeight,
    horizontalRowHeight,
    bottomDockOffset,
    cardBottomGap,
    needsStudyScroll,
    hasMeasurements,
    keyboardVisible,
    keyboardTopInWindow,
    visibleCardHeight,
    setActionsHidden,
    onStudyLayout,
    onCardSectionLayout,
    onTopButtonsLayout,
    onBottomButtonsLayout,
    onBoxesNaturalLayout,
  };
}
