import type { BoxesState, WordWithTranslations } from "@/src/types/boxes";
import type { CorrectionState } from "@/src/hooks/useFlashcardsInteraction";

const PRELOAD_URI_LIMIT = 8;
const BOX_ORDER: (keyof BoxesState)[] = [
  "boxZero",
  "boxOne",
  "boxTwo",
  "boxThree",
  "boxFour",
  "boxFive",
];

type BuildFlashcardImagePreloadPlanParams = {
  selectedItem: WordWithTranslations | null;
  correction: CorrectionState | null;
  activeBox: keyof BoxesState | null;
  getQueueForBox: (box: keyof BoxesState) => WordWithTranslations[];
};

const addUri = (uris: string[], seen: Set<string>, uri?: string | null) => {
  if (!uri || seen.has(uri) || uris.length >= PRELOAD_URI_LIMIT) return;
  seen.add(uri);
  uris.push(uri);
};

const addCardImages = (
  uris: string[],
  seen: Set<string>,
  card?: WordWithTranslations | null
) => {
  if (!card) return;
  addUri(uris, seen, card.imageFront);
  addUri(uris, seen, card.imageBack);
};

export const buildFlashcardImagePreloadPlan = ({
  selectedItem,
  correction,
  activeBox,
  getQueueForBox,
}: BuildFlashcardImagePreloadPlanParams): string[] => {
  const uris: string[] = [];
  const seen = new Set<string>();

  addUri(uris, seen, correction?.promptImageUri);
  addCardImages(uris, seen, correction?.word ?? selectedItem);

  if (activeBox) {
    const activeQueue = getQueueForBox(activeBox);
    addCardImages(uris, seen, activeQueue[0]);
    addCardImages(uris, seen, activeQueue[1]);
  }

  BOX_ORDER.forEach((box) => {
    if (box === activeBox || uris.length >= PRELOAD_URI_LIMIT) return;
    const queue = getQueueForBox(box);
    addCardImages(uris, seen, queue[0]);
  });

  return uris.slice(0, PRELOAD_URI_LIMIT);
};

export const FLASHCARD_IMAGE_PRELOAD_URI_LIMIT = PRELOAD_URI_LIMIT;
