/* eslint-disable import/first */
const mockGetDB = jest.fn();

jest.mock("@/src/db/sqlite/core", () => ({
  getDB: () => mockGetDB(),
}));

jest.mock("@/src/db/sqlite/repositories/flashcards", () => ({
  replaceCustomFlashcardsWithoutTransactionWithDb: jest.fn(() =>
    Promise.resolve([])
  ),
}));

jest.mock("@/src/db/sqlite/repositories/reviews", () => ({
  clearCustomReviewsForCourseWithDb: jest.fn(() => Promise.resolve()),
}));

jest.mock("@/src/db/sqlite/repositories/analytics", () => ({
  clearCustomLearningEventsForCourseWithDb: jest.fn(() => Promise.resolve(0)),
}));

jest.mock("@/src/services/imageService", () => ({
  deleteImage: jest.fn(() => Promise.resolve()),
}));

import {
  getCustomCourseMasteryProgress,
  getCompletedCustomCoursesWithCardCounts,
  saveCustomCourseEdits,
} from "@/src/db/sqlite/repositories/courses";
import { clearCustomLearningEventsForCourseWithDb } from "@/src/db/sqlite/repositories/analytics";
import { replaceCustomFlashcardsWithoutTransactionWithDb } from "@/src/db/sqlite/repositories/flashcards";
import { clearCustomReviewsForCourseWithDb } from "@/src/db/sqlite/repositories/reviews";

describe("courses repository", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it("commits course save before clearing progress outside transaction", async () => {
    const execAsync = jest.fn().mockResolvedValue(undefined);
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const db = {
      execAsync,
      runAsync,
    };

    mockGetDB.mockResolvedValue(db);

    await saveCustomCourseEdits(
      77,
      {
        name: "Course",
        iconId: "heart",
        iconColor: "#fff",
        reviewsEnabled: true,
      },
      [
        {
          frontText: "cat",
          backText: "kot",
          answers: ["kot"],
          position: 0,
          flipped: false,
          answerOnly: false,
          type: "text",
        },
      ]
    );

    expect(execAsync).toHaveBeenNthCalledWith(1, "BEGIN TRANSACTION;");
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE custom_courses"),
      "Course",
      "heart",
      "#fff",
      null,
      1,
      expect.any(Number),
      77
    );
    expect(replaceCustomFlashcardsWithoutTransactionWithDb).toHaveBeenCalledWith(
      db,
      77,
      expect.any(Array)
    );
    expect(clearCustomReviewsForCourseWithDb).toHaveBeenCalledWith(db, 77);
    expect(clearCustomLearningEventsForCourseWithDb).toHaveBeenCalledWith(db, 77);
    expect(execAsync).toHaveBeenNthCalledWith(2, "COMMIT;");
  });

  it("rolls back when card replacement fails", async () => {
    const execAsync = jest.fn().mockResolvedValue(undefined);
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const db = {
      execAsync,
      runAsync,
    };

    mockGetDB.mockResolvedValue(db);
    (replaceCustomFlashcardsWithoutTransactionWithDb as jest.Mock).mockRejectedValueOnce(
      new Error("boom")
    );

    await expect(
      saveCustomCourseEdits(77, {
        name: "Course",
        iconId: "heart",
        iconColor: "#fff",
        reviewsEnabled: true,
      }, [])
    ).rejects.toThrow("boom");

    expect(execAsync).toHaveBeenNthCalledWith(1, "BEGIN TRANSACTION;");
    expect(execAsync).toHaveBeenNthCalledWith(2, "ROLLBACK;");
    expect(clearCustomReviewsForCourseWithDb).not.toHaveBeenCalled();
    expect(clearCustomLearningEventsForCourseWithDb).not.toHaveBeenCalled();
  });

  it("returns courses where every card has terminal success", async () => {
    const getAllAsync = jest.fn().mockResolvedValue([
      {
        id: 12,
        name: "Done course",
        iconId: "book",
        iconColor: "#123",
        colorId: null,
        reviewsEnabled: 0,
        createdAt: 1,
        updatedAt: 2,
        isOfficial: 0,
        slug: null,
        packVersion: 1,
        cardsCount: 3,
        completedCardsCount: 3,
      },
    ]);

    mockGetDB.mockResolvedValue({ getAllAsync });

    const result = await getCompletedCustomCoursesWithCardCounts();

    const [sql] = getAllAsync.mock.calls[0];
    expect(sql).toContain("cle.result = 'ok'");
    expect(sql).toContain("cle.box = 'boxFive'");
    expect(sql).toContain("completedCardsCount = cardsCount");
    expect(result).toEqual([
      expect.objectContaining({
        id: 12,
        name: "Done course",
        cardsCount: 3,
        completedCardsCount: 3,
        reviewsEnabled: false,
        isOfficial: false,
      }),
    ]);
  });

  it("returns no completed courses when any card lacks terminal success", async () => {
    const getAllAsync = jest.fn().mockResolvedValue([]);

    mockGetDB.mockResolvedValue({ getAllAsync });

    const result = await getCompletedCustomCoursesWithCardCounts();

    expect(result).toEqual([]);
    expect(getAllAsync.mock.calls[0][0]).toContain(
      "completedCardsCount = cardsCount"
    );
  });

  it("does not exclude courses because earlier wrong answers exist", async () => {
    const getAllAsync = jest.fn().mockResolvedValue([
      {
        id: 13,
        name: "Recovered course",
        iconId: "star",
        iconColor: "#456",
        colorId: null,
        reviewsEnabled: 1,
        createdAt: 1,
        updatedAt: 2,
        isOfficial: 1,
        slug: "eng_to_pl_a2",
        packVersion: 1,
        cardsCount: 2,
        completedCardsCount: 2,
      },
    ]);

    mockGetDB.mockResolvedValue({ getAllAsync });

    const result = await getCompletedCustomCoursesWithCardCounts();
    const [sql] = getAllAsync.mock.calls[0];

    expect(sql).not.toContain("cle.result != 'wrong'");
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 13,
        completedCardsCount: 2,
        isOfficial: true,
      })
    );
  });

  it("returns mastery progress from terminal success events", async () => {
    const getFirstAsync = jest.fn().mockResolvedValue({
      cardsCount: 5,
      completedCardsCount: 4,
    });

    mockGetDB.mockResolvedValue({ getFirstAsync });

    const result = await getCustomCourseMasteryProgress(99);

    expect(getFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining("cle.box = 'boxFive'"),
      99,
      99
    );
    expect(result).toEqual({
      cardsCount: 5,
      completedCardsCount: 4,
    });
  });
});
