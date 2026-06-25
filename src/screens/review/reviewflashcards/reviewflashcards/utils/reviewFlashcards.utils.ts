import type { BoxesState, WordWithTranslations } from "@/src/types/boxes";

import { NON_INTRO_BOXES } from "../model/reviewFlashcards.constants";

export const createEmptyBoxes = (): BoxesState => ({
  boxZero: [],
  boxOne: [],
  boxTwo: [],
  boxThree: [],
  boxFour: [],
  boxFive: [],
});

export const stageToBox = (stage?: number): keyof BoxesState => {
  const value = typeof stage === "number" ? stage : 0;
  const clamped = Math.max(0, Math.min(value, 5));
  if (clamped === 0) return "boxZero";
  if (clamped === 1) return "boxOne";
  if (clamped === 2) return "boxTwo";
  if (clamped === 3) return "boxThree";
  if (clamped === 4) return "boxFour";
  return "boxFive";
};

export const distributeByStage = (words: WordWithTranslations[]): BoxesState => {
  const next = createEmptyBoxes();
  for (const word of words) {
    const box = stageToBox(word.stage);
    next[box].push(word);
  }
  return next;
};

export const findFirstActiveBox = (boxes: BoxesState): keyof BoxesState | null => {
  for (const box of NON_INTRO_BOXES) {
    if ((boxes[box] ?? []).length > 0) {
      return box;
    }
  }
  return null;
};
