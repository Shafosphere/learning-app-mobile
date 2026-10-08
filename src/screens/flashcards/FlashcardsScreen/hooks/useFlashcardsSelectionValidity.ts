import { useEffect } from "react";
import type { WordWithTranslations } from "@/src/types/boxes";
type Params = {
  selectedItem: WordWithTranslations | null;
  customCards: WordWithTranslations[];
  clearSelection: () => void;
};

export function useFlashcardsSelectionValidity({
  selectedItem,
  customCards,
  clearSelection,
}: Params) {
  useEffect(() => {
    if (
      selectedItem &&
      !customCards.some((card) => card.id === selectedItem.id)
    ) {
      clearSelection();
    }
  }, [clearSelection, customCards, selectedItem]);

}
