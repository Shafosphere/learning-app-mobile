import { removeCustomReview } from "@/src/db/sqlite/db";
import { removePersistedFlashcardFromBoxes } from "@/src/hooks/useBoxesPersistenceSnapshot";
import {
  returnFlashcardToUnknown,
  subscribeFlashcardReturnedToUnknown,
} from "@/src/services/returnFlashcardToUnknown";

jest.mock("@/src/db/sqlite/db", () => ({
  removeCustomReview: jest.fn(() => Promise.resolve(1)),
}));

jest.mock("@/src/hooks/useBoxesPersistenceSnapshot", () => ({
  makeScopeId: jest.fn(
    (sourceLangId: number, targetLangId: number, level: string) =>
      `${sourceLangId}-${targetLangId}-${level}`,
  ),
  removePersistedFlashcardFromBoxes: jest.fn(() => Promise.resolve()),
}));

jest.mock("@/src/services/debugEvents", () => ({
  appendDebugEvent: jest.fn(),
}));

describe("returnFlashcardToUnknown", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("deletes review state, clears the boxes snapshot and notifies subscribers", async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeFlashcardReturnedToUnknown(listener);

    await returnFlashcardToUnknown({ courseId: 7, flashcardId: 19 });

    expect(removeCustomReview).toHaveBeenCalledWith(19, 7);
    expect(removePersistedFlashcardFromBoxes).toHaveBeenCalledWith(
      "customBoxes:7-7-custom-7",
      19,
      7,
    );
    expect(listener).toHaveBeenCalledWith({ courseId: 7, flashcardId: 19 });

    unsubscribe();
  });
});
