import {
  buildFlashcardImagePreloadPlan,
  FLASHCARD_IMAGE_PRELOAD_URI_LIMIT,
} from "@/src/features/flashcards/flashcardImagePreloadPlan";
import type { BoxesState, WordWithTranslations } from "@/src/types/boxes";

const makeCard = (
  id: number,
  imageFront?: string | null,
  imageBack?: string | null
): WordWithTranslations => ({
  id,
  text: `card-${id}`,
  translations: [`answer-${id}`],
  flipped: false,
  imageFront: imageFront ?? null,
  imageBack: imageBack ?? null,
  type: "text",
});

const emptyQueues = (): Record<keyof BoxesState, WordWithTranslations[]> => ({
  boxZero: [],
  boxOne: [],
  boxTwo: [],
  boxThree: [],
  boxFour: [],
  boxFive: [],
});

describe("buildFlashcardImagePreloadPlan", () => {
  it("prioritizes current card, active box next two, then other boxes", () => {
    const queues = emptyQueues();
    queues.boxTwo = [makeCard(2, "boxTwo-first.svg"), makeCard(3, "boxTwo-second.svg")];
    queues.boxZero = [makeCard(4, "boxZero-first.svg")];
    queues.boxOne = [makeCard(5, "boxOne-first.svg")];
    queues.boxThree = [makeCard(6, "boxThree-first.svg")];

    const plan = buildFlashcardImagePreloadPlan({
      selectedItem: makeCard(1, "current.svg"),
      correction: null,
      activeBox: "boxTwo",
      getQueueForBox: (box) => queues[box],
    });

    expect(plan).toEqual([
      "current.svg",
      "boxTwo-first.svg",
      "boxTwo-second.svg",
      "boxZero-first.svg",
      "boxOne-first.svg",
      "boxThree-first.svg",
    ]);
  });

  it("uses correction prompt before the selected item", () => {
    const plan = buildFlashcardImagePreloadPlan({
      selectedItem: makeCard(1, "selected.svg"),
      correction: {
        cardId: 1,
        awers: "front",
        rewers: "back",
        input1: "",
        input2: "",
        mode: "demote",
        promptText: "front",
        promptImageUri: "correction-prompt.svg",
        reversed: false,
        word: makeCard(1, "selected.svg"),
      },
      activeBox: null,
      getQueueForBox: () => [],
    });

    expect(plan).toEqual(["correction-prompt.svg", "selected.svg"]);
  });

  it("dedupes URIs and respects the global limit", () => {
    const queues = emptyQueues();
    queues.boxOne = [
      makeCard(2, "shared.svg"),
      makeCard(3, "active-second.svg"),
    ];
    queues.boxZero = [makeCard(4, "boxZero.svg")];
    queues.boxTwo = [makeCard(5, "boxTwo.svg")];
    queues.boxThree = [makeCard(6, "boxThree.svg")];
    queues.boxFour = [makeCard(7, "boxFour.svg")];
    queues.boxFive = [makeCard(8, "boxFive.svg")];

    const plan = buildFlashcardImagePreloadPlan({
      selectedItem: makeCard(1, "shared.svg", "current-back.svg"),
      correction: null,
      activeBox: "boxOne",
      getQueueForBox: (box) => queues[box],
    });

    expect(plan).toEqual([
      "shared.svg",
      "current-back.svg",
      "active-second.svg",
      "boxZero.svg",
      "boxTwo.svg",
      "boxThree.svg",
      "boxFour.svg",
      "boxFive.svg",
    ]);
    expect(plan).toHaveLength(FLASHCARD_IMAGE_PRELOAD_URI_LIMIT);
  });
});
