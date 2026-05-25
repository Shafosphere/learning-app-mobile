/* eslint-disable import/first */

const mockGetDB = jest.fn();

jest.mock("@/src/db/sqlite/core", () => ({
  getDB: () => mockGetDB(),
}));

import {
  addRandomCustomReviews,
  advanceCustomReview,
  getDueCustomReviewFlashcards,
  removeCustomReview,
  scheduleCustomReview,
} from "@/src/db/sqlite/repositories/reviews";

describe("custom review repository", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it("starts new cards at stage zero", async () => {
    const runAsync = jest.fn().mockResolvedValue(undefined);
    mockGetDB.mockResolvedValue({
      runAsync,
    });
    jest.spyOn(Math, "random").mockReturnValue(0);

    const result = await scheduleCustomReview(15, 77, 0);

    expect(result.stage).toBe(0);
    expect(runAsync).toHaveBeenCalled();
  });

  it("removes only the selected card review entry", async () => {
    const runAsync = jest.fn().mockResolvedValue({ changes: 1 });
    mockGetDB.mockResolvedValue({ runAsync });

    const result = await removeCustomReview(15, 77);

    expect(result).toBe(1);
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM custom_reviews WHERE flashcard_id = ? AND course_id = ?"),
      15,
      77
    );
  });

  it("clamps promotions at stage five", async () => {
    const getFirstAsync = jest.fn().mockResolvedValue({ stage: 5 });
    const runAsync = jest.fn().mockResolvedValue(undefined);
    mockGetDB.mockResolvedValue({
      getFirstAsync,
      runAsync,
    });
    jest.spyOn(Math, "random").mockReturnValue(1);

    const result = await advanceCustomReview(15, 77);

    expect(result.stage).toBe(5);
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE custom_reviews SET stage = ?, next_review = ?"),
      5,
      expect.any(Number),
      15,
      77
    );
  });

  it("loads all due review cards when no limit is provided", async () => {
    const getAllAsync = jest
      .fn()
      .mockResolvedValueOnce([
        { id: 1, stage: 0, nextReview: 100 },
        { id: 2, stage: 5, nextReview: 200 },
      ])
      .mockResolvedValueOnce([
        {
          id: 1,
          courseId: 77,
          frontText: "cat",
          backText: "kot",
          hintFront: null,
          hintBack: null,
          imageFront: null,
          imageBack: null,
          explanation: null,
          position: 0,
          flipped: 0,
          answerOnly: 0,
          externalId: null,
          isOfficial: 0,
          resetProgressOnUpdate: 0,
          createdAt: 1,
          updatedAt: 1,
          answerText: "kot",
          type: "text",
        },
        {
          id: 2,
          courseId: 77,
          frontText: "dog",
          backText: "pies",
          hintFront: null,
          hintBack: null,
          imageFront: null,
          imageBack: null,
          explanation: null,
          position: 1,
          flipped: 0,
          answerOnly: 0,
          externalId: null,
          isOfficial: 0,
          resetProgressOnUpdate: 0,
          createdAt: 2,
          updatedAt: 2,
          answerText: "pies",
          type: "text",
        },
      ]);
    mockGetDB.mockResolvedValue({
      getAllAsync,
    });

    const result = await getDueCustomReviewFlashcards(77);

    expect(getAllAsync.mock.calls[0][0]).not.toContain("LIMIT ?");
    expect(result).toHaveLength(2);
    expect(result.map((card) => card.stage)).toEqual([0, 5]);
  });

  it("seeds random custom reviews as due now and preserves existing stages", async () => {
    const getAllAsync = jest.fn().mockResolvedValue([
      { id: 11, stage: 0 },
      { id: 12, stage: 3 },
    ]);
    const runAsync = jest.fn().mockResolvedValue(undefined);
    mockGetDB.mockResolvedValue({
      getAllAsync,
      runAsync,
    });
    jest.spyOn(Date, "now").mockReturnValue(10_000);

    const result = await addRandomCustomReviews(77, 10);

    expect(result).toBe(2);
    expect(getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining("cr.id IS NULL OR cr.next_review > ?"),
      77,
      10_000,
      10
    );
    expect(runAsync).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("INSERT INTO custom_reviews"),
      11,
      77,
      10_000,
      9_999,
      0
    );
    expect(runAsync).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("INSERT INTO custom_reviews"),
      12,
      77,
      10_000,
      9_999,
      3
    );
  });
});
