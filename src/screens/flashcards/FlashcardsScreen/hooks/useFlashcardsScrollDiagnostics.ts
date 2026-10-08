import { useEffect } from "react";
import type { useFlashcardsStudyLayout } from "@/src/features/flashcards/study/hooks/useFlashcardsStudyLayout";
import { logFlashcardsScrollDebug } from "@/src/services/flashcardsScrollDebug";

type Params = {
  isFocused: boolean;
  selectedItemId: number | null;
  answerLength: number;
  displayResult: boolean | null;
  resultPending: boolean;
  correctionMode: string | null;
  isBetweenCards: boolean;
  isCompactStudyLayout: boolean;
  useInlineCardAction: boolean;
  studyLayout: ReturnType<typeof useFlashcardsStudyLayout>;
  bottomButtonsReservedSpace: number;
  bottomButtonsDockBottomOffset: number;
  shouldReserveBottomButtonsSpace: boolean;
  areButtonsOnTop: boolean;
  shouldAnimateScreenLayout: boolean;
  windowWidth: number;
  windowHeight: number;
};

export function useFlashcardsScrollDiagnostics({
  isFocused,
  selectedItemId,
  answerLength,
  displayResult,
  resultPending,
  correctionMode,
  isBetweenCards,
  isCompactStudyLayout,
  useInlineCardAction,
  studyLayout,
  bottomButtonsReservedSpace,
  bottomButtonsDockBottomOffset,
  shouldReserveBottomButtonsSpace,
  areButtonsOnTop,
  shouldAnimateScreenLayout,
  windowWidth,
  windowHeight,
}: Params) {
  useEffect(() => {
    if (!isFocused) return;
    // Capture every state change immediately; the settled diagnostics omit
    // intermediate frames that matter when investigating a jumping viewport.
    logFlashcardsScrollDebug("screen.state", {
      cardId: selectedItemId,
      answerLength,
      result: displayResult,
      resultPending,
      correctionMode,
      isBetweenCards,
      isCompactStudyLayout,
      useInlineCardAction,
      keyboardVisible: studyLayout.keyboardVisible,
      keyboardTopInWindow: studyLayout.keyboardTopInWindow,
      availableStudyHeight: studyLayout.availableStudyHeight,
      visibleStudyHeight: studyLayout.visibleStudyHeight,
      fullCardHeight: studyLayout.fullCardSectionHeight,
      visibleCardHeight: studyLayout.visibleCardHeight,
      minimumFullStudyHeight: studyLayout.minimumFullStudyHeight,
      horizontalRowHeight: studyLayout.horizontalRowHeight ?? null,
      needsStudyScroll: studyLayout.needsStudyScroll,
      bottomButtonsReservedSpace,
      bottomButtonsDockBottomOffset,
      shouldReserveBottomButtonsSpace,
      areButtonsOnTop,
      shouldAnimateScreenLayout,
      windowWidth,
      windowHeight,
    });
  }, [
    isFocused, selectedItemId, answerLength, displayResult, resultPending,
    correctionMode, isBetweenCards, isCompactStudyLayout, useInlineCardAction,
    studyLayout.keyboardVisible, studyLayout.keyboardTopInWindow,
    studyLayout.availableStudyHeight, studyLayout.visibleStudyHeight,
    studyLayout.fullCardSectionHeight, studyLayout.visibleCardHeight,
    studyLayout.minimumFullStudyHeight, studyLayout.horizontalRowHeight,
    studyLayout.needsStudyScroll, bottomButtonsReservedSpace,
    bottomButtonsDockBottomOffset, shouldReserveBottomButtonsSpace,
    areButtonsOnTop, shouldAnimateScreenLayout, windowWidth, windowHeight,
  ]);
}
