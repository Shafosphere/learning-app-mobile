import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  removePersistedFlashcardFromBoxes,
  type SavedBoxesV2,
} from "@/src/hooks/useBoxesPersistenceSnapshot";

jest.mock("@/src/services/debugEvents", () => ({
  appendBoxesDropAlert: jest.fn(),
  appendDebugEvent: jest.fn(),
  summarizeBoxes: jest.fn(() => ({ total: 0 })),
}));

describe("removePersistedFlashcardFromBoxes", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it("removes one card from boxes and used ids while preserving the rest", async () => {
    const key = "customBoxes:7-7-custom-7";
    const payload: SavedBoxesV2 = {
      v: 2,
      updatedAt: 1,
      courseId: "7-7-custom-7",
      sourceLangId: 7,
      targetLangId: 7,
      level: "custom-7",
      batchIndex: 2,
      flashcards: {
        boxZero: [{ id: 1, text: "a", translations: ["b"], flipped: false }],
        boxOne: [{ id: 2, text: "c", translations: ["d"], flipped: false }],
        boxTwo: [],
        boxThree: [],
        boxFour: [],
        boxFive: [],
      },
      usedWordIds: [1, 2, 3],
    };
    await AsyncStorage.setItem(key, JSON.stringify(payload));

    await removePersistedFlashcardFromBoxes(key, 1);

    const saved = JSON.parse((await AsyncStorage.getItem(key)) ?? "{}") as SavedBoxesV2;
    expect(saved.flashcards.boxZero).toEqual([]);
    expect(saved.flashcards.boxOne.map((card) => card.id)).toEqual([2]);
    expect(saved.usedWordIds).toEqual([2, 3]);
    expect(saved.relearningWordIds).toEqual([1]);
    expect(saved.batchIndex).toBe(2);
  });
});
