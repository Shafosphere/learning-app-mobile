import { renderHook } from "@testing-library/react-native";

import { preloadFlashcardImageUris } from "@/src/features/flashcards/flashcardImagePreload";
import { useFlashcardImagePreload } from "@/src/features/flashcards/useFlashcardImagePreload";
import type { BoxesState, WordWithTranslations } from "@/src/types/boxes";

jest.mock("@/src/features/flashcards/flashcardImagePreload", () => ({
  preloadFlashcardImageUris: jest.fn(),
}));

const mockedPreload = preloadFlashcardImageUris as jest.Mock;

const makeCard = (id: number, imageFront?: string | null): WordWithTranslations => ({
  id,
  text: `card-${id}`,
  translations: [`answer-${id}`],
  flipped: false,
  imageFront: imageFront ?? null,
  imageBack: null,
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

describe("useFlashcardImagePreload", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("preloads same current and queued images used by both study screens", () => {
    const queues = emptyQueues();
    queues.boxOne = [makeCard(2, "next.svg")];
    const getQueueForBox = (box: keyof BoxesState) => queues[box];

    renderHook(() =>
      useFlashcardImagePreload({
        isFocused: true,
        selectedItem: makeCard(1, "current.svg"),
        correction: null,
        activeBox: "boxOne",
        getQueueForBox,
      })
    );

    expect(mockedPreload).toHaveBeenCalledWith(["current.svg", "next.svg"]);
  });

  it("does not preload while screen is unfocused", () => {
    renderHook(() =>
      useFlashcardImagePreload({
        isFocused: false,
        selectedItem: makeCard(1, "current.svg"),
        correction: null,
        activeBox: null,
        getQueueForBox: () => [],
      })
    );

    expect(mockedPreload).not.toHaveBeenCalled();
  });
});
