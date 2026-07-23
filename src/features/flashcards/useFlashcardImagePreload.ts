import { useEffect } from "react";

import { preloadFlashcardImageUris } from "@/src/features/flashcards/flashcardImagePreload";
import {
  buildFlashcardImagePreloadPlan,
  type FlashcardImagePreloadCorrection,
} from "@/src/features/flashcards/flashcardImagePreloadPlan";
import type { BoxesState, WordWithTranslations } from "@/src/types/boxes";

type UseFlashcardImagePreloadParams = {
  isFocused: boolean;
  selectedItem: WordWithTranslations | null;
  correction: FlashcardImagePreloadCorrection | null;
  activeBox: keyof BoxesState | null;
  getQueueForBox: (box: keyof BoxesState) => WordWithTranslations[];
};

export const useFlashcardImagePreload = ({
  isFocused,
  selectedItem,
  correction,
  activeBox,
  getQueueForBox,
}: UseFlashcardImagePreloadParams) => {
  useEffect(() => {
    if (!isFocused) return;

    const uris = buildFlashcardImagePreloadPlan({
      selectedItem,
      correction,
      activeBox,
      getQueueForBox,
    });
    preloadFlashcardImageUris(uris);
  }, [activeBox, correction, getQueueForBox, isFocused, selectedItem]);
};
