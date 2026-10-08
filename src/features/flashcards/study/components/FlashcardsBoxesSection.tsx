import BoxesCarousel from "@/src/components/Box/Carousel/BoxCarousel";
import Boxes from "@/src/components/Box/List/BoxList";
import type { BoxFacesByBox } from "@/src/components/Box/Skin/boxFaces";
import type { BoxesState } from "@/src/types/boxes";
import { CoachmarkAnchor } from "@edwardloopez/react-native-coachmark";
import type { TFunction } from "i18next";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { StudyViewportContext } from "@/src/components/flashcards/StudyViewportContext";
import { SINGLE_ROW_BOX_MIN_HEIGHT } from "@/src/components/Box/List/BoxList.metrics";
import { useNavbarLayoutTransition } from "@/src/contexts/NavbarLayoutContext";
import type { ComponentProps } from "react";
import {
  ScrollView,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Reanimated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
export type FlashcardsBoxesSectionStyles = {
  boxesScaledContent: StyleProp<ViewStyle>;
  boxesScrollViewport: StyleProp<ViewStyle>;
  boxesViewport: StyleProp<ViewStyle>;
  boxesViewportScrollContent: StyleProp<ViewStyle>;
  boxesWrapper: StyleProp<ViewStyle>;
  boxesWrapperWithBottomButtons: StyleProp<ViewStyle>;
  tabletCompactBoxesScrollViewport: StyleProp<ViewStyle>;
  tabletCompactBoxesViewport: StyleProp<ViewStyle>;
  tabletCompactBoxesWrapper: StyleProp<ViewStyle>;
};

const BOXES_FADE_OUT_DURATION_MS = 140;
const BOXES_FADE_OUT = FadeOut.duration(BOXES_FADE_OUT_DURATION_MS);
const BOXES_FADE_IN = FadeIn.delay(BOXES_FADE_OUT_DURATION_MS).duration(180);

type FlashcardsBoxesSectionProps = {
  debugSizes?: boolean;
  debugCourseId?: number | null;
  coachmarkId?: string;
  countsCoachmarkId?: string;
  testID?: string;
  styles: FlashcardsBoxesSectionStyles;
  screenSectionLayout: ComponentProps<typeof Reanimated.View>["layout"];
  boxes: BoxesState;
  activeBox: keyof BoxesState | null;
  boxZeroEnabled: boolean;
  tutorialBoxCountOverrides?: Partial<Record<keyof BoxesState, number>> | null;
  boxFaces: BoxFacesByBox;
  handleSelectBox: (boxName: keyof BoxesState) => void;
  handleBoxLongPress: (boxName: keyof BoxesState) => void;
  effectiveBoxesLayout: string;
  boxSelectionLocked: boolean;
  isTabletLayout: boolean;
  isCompactStudyLayout?: boolean;
  isTabletCompactBoxesLayout: boolean;
  maxColumns?: number;
  hideActions?: boolean;
  areButtonsOnTop: boolean;
  flashcardsContentWidth: number | undefined;
  boxesScale: number;
  boxesScaledHeight: number | undefined;
  classicBoxesNaturalHeight?: number;
  horizontalRowHeight?: number;
  boxesScaleOffsetY: number;
  boxesNeedScrollFallback: boolean;
  carouselBottomClearance?: number;
  onBoxesViewportLayout: (event: LayoutChangeEvent) => void;
  onBoxesContentLayout: (event: LayoutChangeEvent) => void;
  t: TFunction;
};

export function FlashcardsBoxesSection({
  debugSizes = false,
  debugCourseId,
  coachmarkId,
  countsCoachmarkId,
  testID,
  styles,
  screenSectionLayout,
  boxes,
  activeBox,
  boxZeroEnabled,
  tutorialBoxCountOverrides,
  boxFaces,
  handleSelectBox,
  handleBoxLongPress,
  effectiveBoxesLayout,
  boxSelectionLocked,
  isTabletLayout,
  isCompactStudyLayout,
  isTabletCompactBoxesLayout,
  maxColumns,
  hideActions = false,
  areButtonsOnTop,
  flashcardsContentWidth,
  boxesScale,
  boxesScaledHeight,
  classicBoxesNaturalHeight,
  horizontalRowHeight,
  boxesScaleOffsetY,
  boxesNeedScrollFallback,
  carouselBottomClearance = 0,
  onBoxesViewportLayout,
  onBoxesContentLayout,
  t,
}: FlashcardsBoxesSectionProps) {
  const hasMountedRef = useRef(false);
  const boxesPresentation = effectiveBoxesLayout === "classic"
    ? horizontalRowHeight != null ? "classic-row" : "classic-grid"
    : effectiveBoxesLayout;

  useEffect(() => {
    hasMountedRef.current = true;
  }, []);

  const animatedBoxesScale = useSharedValue(boxesScale);
  const animatedBoxesScaleOffsetY = useSharedValue(boxesScaleOffsetY);
  const [measuredViewportWidth, setMeasuredViewportWidth] = useState<number | null>(null);
  const studyViewportHeight = useContext(StudyViewportContext);
  const [boxesTop, setBoxesTop] = useState<number | null>(null);
  const layoutTransition = useNavbarLayoutTransition();
  const boundedBoxesHeight = !isTabletCompactBoxesLayout && horizontalRowHeight == null
    && studyViewportHeight != null && boxesTop != null
    // A tall card must leave a usable inner scroll viewport. The outer study
    // scroll handles the resulting overflow instead of collapsing the boxes.
    ? Math.max(Math.min(SINGLE_ROW_BOX_MIN_HEIGHT, studyViewportHeight), studyViewportHeight - boxesTop)
    : undefined;
  // Constrain the measured inner viewport as well as its wrapper. In scroll
  // content, flex alone can leave the child at its natural height, so scaling
  // keeps using that larger height even after the wrapper has shrunk.
  const boxesViewportHeight = horizontalRowHeight ?? boundedBoxesHeight;
  const boundedViewportStyle = boxesViewportHeight != null
    ? { flex: 0, height: boxesViewportHeight }
    : null;
  const previousSizes = useRef<Record<string, Record<string, unknown>>>({});
  const sizesLogTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSizesLogRef = useRef<string | null>(null);
  const logSizeChange = useCallback((source: string, next: Record<string, unknown>) => {
    if (!debugSizes) return;
    const previous = previousSizes.current[source] ?? null;
    if (JSON.stringify(previous) === JSON.stringify(next)) return;
    previousSizes.current[source] = next;
    if (process.env.NODE_ENV !== "test") {
      if (sizesLogTimerRef.current != null) clearTimeout(sizesLogTimerRef.current);
      sizesLogTimerRef.current = setTimeout(() => {
        const snapshot = JSON.stringify({
          courseId: debugCourseId ?? null,
          transitionRunning: layoutTransition.isRunning(),
          ...previousSizes.current,
        });
        if (snapshot === lastSizesLogRef.current) return;
        lastSizesLogRef.current = snapshot;
      }, 300);
    }
  }, [debugSizes, debugCourseId, layoutTransition]);

  useEffect(() => () => {
    if (sizesLogTimerRef.current != null) clearTimeout(sizesLogTimerRef.current);
  }, [debugSizes, debugCourseId]);

  useEffect(() => {
    logSizeChange("budget", {
      studyViewportHeight,
      boxesTop,
      boundedBoxesHeight: boundedBoxesHeight ?? null,
      rowHeight: horizontalRowHeight ?? null,
      isTabletCompactBoxesLayout,
      hideActions,
      areButtonsOnTop,
    });
  }, [logSizeChange, studyViewportHeight, boxesTop, boundedBoxesHeight,
    horizontalRowHeight, isTabletCompactBoxesLayout, hideActions, areButtonsOnTop]);

  useEffect(() => {
    logSizeChange("sizing", {
      layout: effectiveBoxesLayout,
      compact: isCompactStudyLayout,
      scale: boxesScale,
      height: boxesScaledHeight ?? null,
      naturalHeight: classicBoxesNaturalHeight ?? null,
      rowHeight: horizontalRowHeight ?? null,
      offsetY: boxesScaleOffsetY,
      scrollFallback: boxesNeedScrollFallback,
    });
  }, [logSizeChange, effectiveBoxesLayout, isCompactStudyLayout, boxesScale,
    boxesScaledHeight, classicBoxesNaturalHeight, horizontalRowHeight,
    boxesScaleOffsetY, boxesNeedScrollFallback]);

  useEffect(() => {
    animatedBoxesScale.value = withTiming(boxesScale, { duration: 420 });
    animatedBoxesScaleOffsetY.value = withTiming(boxesScaleOffsetY, {
      duration: 420,
    });
  }, [
    animatedBoxesScale,
    animatedBoxesScaleOffsetY,
    boxesScale,
    boxesScaleOffsetY,
  ]);

  const animatedScaleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -animatedBoxesScaleOffsetY.value },
      { scale: animatedBoxesScale.value },
    ],
  }));

  const handleViewportLayout = (event: LayoutChangeEvent) => {
    const { width: viewportWidth, height } = event.nativeEvent.layout;
    logSizeChange("viewport", { width: viewportWidth, height });
    const { width } = event.nativeEvent.layout;
    if (width > 0) {
      setMeasuredViewportWidth((previous) => previous === width ? previous : width);
    }
    onBoxesViewportLayout(event);
  };

  const handleContentLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    logSizeChange("content", { width, height });
    onBoxesContentLayout(event);
  };

  const boxesContent =
    effectiveBoxesLayout === "classic" ? (
      <Boxes
        horizontalScroll={horizontalRowHeight != null}
        horizontalRowHeight={horizontalRowHeight}
        boxes={boxes}
        activeBox={activeBox}
        handleSelectBox={handleSelectBox}
        hideBoxZero={!boxZeroEnabled}
        onBoxLongPress={handleBoxLongPress}
        disabled={boxSelectionLocked}
        countOverrides={tutorialBoxCountOverrides ?? undefined}
        faces={boxFaces}
        countsCoachmarkId={countsCoachmarkId}
        maxColumns={maxColumns ?? (isTabletLayout ? 3 : undefined)}
        layoutWidth={flashcardsContentWidth ?? measuredViewportWidth ?? undefined}
      />
    ) : (
      <BoxesCarousel
        compactLayout={isCompactStudyLayout}
        boxes={boxes}
        activeBox={activeBox}
        handleSelectBox={handleSelectBox}
        hideBoxZero={!boxZeroEnabled}
        onBoxLongPress={handleBoxLongPress}
        disabled={boxSelectionLocked}
        countOverrides={tutorialBoxCountOverrides ?? undefined}
        faces={boxFaces}
        layoutWidth={flashcardsContentWidth}
        bottomClearance={carouselBottomClearance}
      />
    );

  const scaledContent = (
    <View
      style={[
        styles.boxesScaledContent,
        boxesScaledHeight ? { height: boxesScaledHeight } : null,
      ]}
    >
      <CoachmarkAnchor
        id={coachmarkId ?? "flashcards-boxes-section"}
        style={{ width: "100%" }}
        shape="rect"
        radius={28}
      >
        <Reanimated.View
          testID="flashcards-boxes-content"
          collapsable={false}
          style={[
            animatedScaleStyle,
            classicBoxesNaturalHeight != null
              ? { minHeight: classicBoxesNaturalHeight, flexShrink: 0 }
              : null,
          ]}
          onLayout={handleContentLayout}
        >
          {boxesContent}
        </Reanimated.View>
      </CoachmarkAnchor>
    </View>
  );

  return (
    <Reanimated.View
      // Keep the old arrangement visible during fade-out; the new one enters
      // after it disappears. Size/count changes within one layout stay smooth.
      key={boxesPresentation}
      testID={testID ?? "flashcards-boxes-wrapper"}
      entering={hasMountedRef.current ? BOXES_FADE_IN : undefined}
      exiting={BOXES_FADE_OUT}
      onLayout={(event) => {
        const { x, y, width, height } = event.nativeEvent.layout;
        logSizeChange("wrapper", { x, y, width, height });
        setBoxesTop((previous) => previous === y ? previous : y);
      }}
      layout={screenSectionLayout}
      style={[
        styles.boxesWrapper,
        boundedBoxesHeight != null ? { flex: 0, height: boundedBoxesHeight } : null,
        horizontalRowHeight != null ? { flex: 0, height: horizontalRowHeight } : null,
        !areButtonsOnTop && !hideActions && styles.boxesWrapperWithBottomButtons,
        isTabletCompactBoxesLayout && styles.tabletCompactBoxesWrapper,
        flashcardsContentWidth != null
          ? { width: flashcardsContentWidth, alignSelf: "center" }
          : null,
      ]}
    >
      {boxesNeedScrollFallback ? (
        <ScrollView
          testID="flashcards-boxes-viewport"
          nestedScrollEnabled
          style={[
            styles.boxesScrollViewport,
            isTabletCompactBoxesLayout &&
              styles.tabletCompactBoxesScrollViewport,
            boundedViewportStyle,
          ]}
          contentContainerStyle={styles.boxesViewportScrollContent}
          onLayout={handleViewportLayout}
          showsVerticalScrollIndicator={false}
        >
          {scaledContent}
        </ScrollView>
      ) : (
        <View
          testID="flashcards-boxes-viewport"
          style={[
            styles.boxesViewport,
            isTabletCompactBoxesLayout && styles.tabletCompactBoxesViewport,
            boundedViewportStyle,
          ]}
          onLayout={handleViewportLayout}
        >
          {scaledContent}
        </View>
      )}
    </Reanimated.View>
  );
}
