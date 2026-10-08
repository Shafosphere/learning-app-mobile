import { useEffect, useRef } from "react";
import type { BoxesState } from "@/src/types/boxes";
import type { useFlashcardsStudyLayout } from "@/src/features/flashcards/study/hooks/useFlashcardsStudyLayout";
import { Dimensions } from "react-native";
import { SMALL_PHONE_MAX_SHORT_SIDE, TABLET_LAYOUT_MIN_SHORT_SIDE } from "@/src/hooks/useDeviceLayout";
import type { DeviceLayout } from "@/src/hooks/useDeviceLayout";
import { appendDebugEvent } from "@/src/services/debugEvents";

type Params = {
  isFocused: boolean;
  activeCustomCourseId: number | null;
  selectedItemId: number | null;
  windowWidth: number;
  windowHeight: number;
  windowScale: number;
  fontScale: number;
  shortestSide: number;
  orientation: DeviceLayout["orientation"];
  widthClass: DeviceLayout["widthClass"];
  heightClass: DeviceLayout["heightClass"];
  deviceIsSmallPhoneLayout: boolean;
  isCompactStudyLayout: boolean;
  studyLayout: ReturnType<typeof useFlashcardsStudyLayout>;
  isTabletLayout: boolean;
  activeBox: keyof BoxesState | null;
  shouldHideHintsForActiveBox: boolean;
  shouldReserveHintSpaceWhenHidden: boolean;
  boxesLayout: string;
  actionButtonsPosition: "top" | "bottom";
};

export function useFlashcardsLayoutDiagnostics({
  isFocused,
  activeCustomCourseId,
  selectedItemId,
  windowWidth,
  windowHeight,
  windowScale,
  fontScale,
  shortestSide,
  orientation,
  widthClass,
  heightClass,
  deviceIsSmallPhoneLayout,
  isCompactStudyLayout,
  studyLayout,
  isTabletLayout,
  activeBox,
  shouldHideHintsForActiveBox,
  shouldReserveHintSpaceWhenHidden,
  boxesLayout,
  actionButtonsPosition,
}: Params) {
  const lastLayoutDiagnosticsRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isFocused) {
      lastLayoutDiagnosticsRef.current = null;
      return;
    }

    const screen = Dimensions.get("screen");
    const payload = {
      courseId: activeCustomCourseId,
      cardId: selectedItemId,
      windowDp: { width: windowWidth, height: windowHeight },
      screenDp: { width: screen.width, height: screen.height },
      screenPixels: {
        width: Math.round(screen.width * screen.scale),
        height: Math.round(screen.height * screen.scale),
      },
      pixelRatio: windowScale,
      fontScale,
      shortestSide,
      orientation,
      widthClass,
      heightClass,
      thresholdsDp: {
        smallPhoneMaxShortSide: SMALL_PHONE_MAX_SHORT_SIDE,
        tabletMinShortSide: TABLET_LAYOUT_MIN_SHORT_SIDE,
      },
      selectedLayout: isTabletLayout
        ? "tablet"
        : isCompactStudyLayout
          ? "compact"
          : "normal",
      deviceIsSmallPhoneLayout,
      isCompactStudyLayout,
      studySpace: {
        measured: studyLayout.hasMeasurements,
        availableHeight: studyLayout.availableStudyHeight,
        visibleHeight: studyLayout.visibleStudyHeight,
        minimumFullHeight: studyLayout.minimumFullStudyHeight,
        fullCardHeight: studyLayout.fullCardSectionHeight,
        visibleCardHeight: studyLayout.visibleCardHeight,
        minimumFullBoxesHeight: studyLayout.minimumFullBoxesHeight,
        classicBoxesNaturalHeight: studyLayout.classicBoxesNaturalHeight,
        boxesPresentation: boxesLayout !== "classic"
          ? "carousel"
          : studyLayout.horizontalRowHeight != null ? "single_row" : "grid",
        horizontalRowHeight: studyLayout.horizontalRowHeight ?? null,
        studyScroll: studyLayout.needsStudyScroll,
        minimumGridHeight: studyLayout.minimumGridStudyHeight,
        minimumTightGridHeight: studyLayout.tightGridStudyHeight,
        minimumGridBoxesHeight: studyLayout.minimumGridBoxesHeight,
        keyboardVisible: studyLayout.keyboardVisible,
      },
      isTabletLayout,
      activeBox,
      hideHints: shouldHideHintsForActiveBox,
      hintHiddenReasons: [
        ...(isCompactStudyLayout ? ["insufficient_study_height"] : []),
        ...(activeBox === "boxFour" || activeBox === "boxFive"
          ? ["late_box"]
          : []),
      ],
      reserveHintSpaceWhenHidden: shouldReserveHintSpaceWhenHidden,
      boxesLayout,
      actionButtonsPosition,
    };

    // Layout arrives in several passes (data, images, native measurements).
    // Emit the settled snapshot rather than logging every intermediate state.
    const timer = setTimeout(() => {
      const serialized = JSON.stringify(payload);
      if (lastLayoutDiagnosticsRef.current === serialized) return;
      lastLayoutDiagnosticsRef.current = serialized;
      void appendDebugEvent("flashcards", "screen.layout.diagnostics", payload);
    }, 300);
    return () => clearTimeout(timer);
  }, [
    isFocused,
    activeCustomCourseId,
    selectedItemId,
    windowWidth,
    windowHeight,
    windowScale,
    fontScale,
    shortestSide,
    orientation,
    widthClass,
    heightClass,
    deviceIsSmallPhoneLayout,
    isCompactStudyLayout,
    studyLayout.hasMeasurements,
    studyLayout.availableStudyHeight,
    studyLayout.visibleStudyHeight,
    studyLayout.minimumFullStudyHeight,
    studyLayout.fullCardSectionHeight,
    studyLayout.visibleCardHeight,
    studyLayout.minimumFullBoxesHeight,
    studyLayout.classicBoxesNaturalHeight,
    studyLayout.horizontalRowHeight,
    studyLayout.minimumGridStudyHeight,
    studyLayout.tightGridStudyHeight,
    studyLayout.minimumGridBoxesHeight,
    studyLayout.needsStudyScroll,
    studyLayout.keyboardVisible,
    isTabletLayout,
    activeBox,
    shouldHideHintsForActiveBox,
    shouldReserveHintSpaceWhenHidden,
    boxesLayout,
    actionButtonsPosition,
  ]);
}
