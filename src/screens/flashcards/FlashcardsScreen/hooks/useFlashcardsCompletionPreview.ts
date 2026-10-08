import { useCallback, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { BoxesState, WordWithTranslations } from "@/src/types/boxes";
import {
  consumeCourseFinishedPreview,
  subscribeCourseFinishedPreview,
} from "@/src/services/courseFinishedPreview";
import { EMPTY_BOXES_STATE } from "../model/FlashcardsScreen.constants";

type Params = {
  isFocused: boolean;
  isCourseFinishedPreviewEligible: boolean;
  resetInteractionState: () => void;
  clearSelection: () => void;
  setBoxes: Dispatch<SetStateAction<BoxesState>>;
  addUsedWordIds: (ids: number | number[]) => void;
  customCards: WordWithTranslations[];
};

export function useFlashcardsCompletionPreview({
  isFocused,
  isCourseFinishedPreviewEligible,
  resetInteractionState,
  clearSelection,
  setBoxes,
  addUsedWordIds,
  customCards,
}: Params) {
  const [isCourseFinishedPreviewVisible, setIsCourseFinishedPreviewVisible] =
    useState(false);
  const tryOpenCourseFinishedPreview = useCallback(() => {
    if (!isFocused) return;
    if (!isCourseFinishedPreviewEligible) return;
    if (!consumeCourseFinishedPreview()) return;

    resetInteractionState();
    clearSelection();
    setBoxes(EMPTY_BOXES_STATE);
    addUsedWordIds(customCards.map((card) => card.id));
    setIsCourseFinishedPreviewVisible(true);
  }, [
    addUsedWordIds,
    clearSelection,
    customCards,
    isCourseFinishedPreviewEligible,
    isFocused,
    resetInteractionState,
    setBoxes,
  ]);

  useEffect(() => {
    const unsubscribe = subscribeCourseFinishedPreview(() => {
      tryOpenCourseFinishedPreview();
    });

    return unsubscribe;
  }, [tryOpenCourseFinishedPreview]);

  useEffect(() => {
    tryOpenCourseFinishedPreview();
  }, [tryOpenCourseFinishedPreview]);

  useEffect(() => {
    if (!isCourseFinishedPreviewVisible) {
      return;
    }
    if (!isFocused || !isCourseFinishedPreviewEligible) {
      setIsCourseFinishedPreviewVisible(false);
    }
  }, [
    isCourseFinishedPreviewEligible,
    isCourseFinishedPreviewVisible,
    isFocused,
  ]);

  return isCourseFinishedPreviewVisible;
}
