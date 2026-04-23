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

import { saveCustomCourseEdits } from "@/src/db/sqlite/repositories/courses";
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
});
