import { useEffect } from "react";
import type { WordWithTranslations } from "@/src/types/boxes";
type Params = {
  relearningWordIds: number[];
  learned: WordWithTranslations[];
  clearWordForRelearning: (id: number) => void;
};

export function useFlashcardsRelearningCleanup({
  relearningWordIds,
  learned,
  clearWordForRelearning,
}: Params) {
  useEffect(() => {
    if (relearningWordIds.length === 0 || learned.length === 0) return;
    const learnedIds = new Set(learned.map((word) => word.id));
    relearningWordIds
      .filter((id) => learnedIds.has(id))
      .forEach((id) => clearWordForRelearning(id));
  }, [clearWordForRelearning, learned, relearningWordIds]);

}
