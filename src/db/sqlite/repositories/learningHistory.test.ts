/* eslint-disable import/first */
const mockGetDB = jest.fn();

jest.mock("@/src/db/sqlite/core", () => ({
  getDB: () => mockGetDB(),
}));

import {
  getRecentLearningHistory,
  logLearningHistoryEvent,
} from "@/src/db/sqlite/repositories/learningHistory";

const input = {
  sourceType: "custom" as const,
  mode: "review" as const,
  cardId: 12,
  courseId: 77,
  courseName: "Hiszpański",
  promptText: "perro",
  expectedAnswerText: "pies",
  promptImageUri: null,
  expectedAnswerImageUri: null,
  cardType: "text" as const,
  userAnswer: "pies",
  reversed: false,
  result: "wrong" as const,
  fromBox: "boxTwo",
  toBox: "boxZero",
  durationMs: 8400,
};

describe("learning history repository", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("inserts event and trims history to newest 100 rows", async () => {
    const runAsync = jest.fn().mockResolvedValue({ changes: 1 });
    mockGetDB.mockResolvedValue({ runAsync });

    await logLearningHistoryEvent({ ...input, createdAt: 123 });

    expect(runAsync).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("INSERT INTO learning_history_events"),
      "custom",
      "review",
      12,
      77,
      "Hiszpański",
      "perro",
      "pies",
      0,
      "wrong",
      "boxTwo",
      "boxZero",
      8400,
      123,
      null,
      null,
      "text",
      "pies",
    );
    expect(runAsync).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("LIMIT 100"),
    );
  });

  it("resolves missing custom course name from database", async () => {
    const getFirstAsync = jest.fn().mockResolvedValue({ name: "Kurs DB" });
    const runAsync = jest.fn().mockResolvedValue({ changes: 1 });
    mockGetDB.mockResolvedValue({ getFirstAsync, runAsync });

    await logLearningHistoryEvent({ ...input, courseName: null });

    expect(getFirstAsync).toHaveBeenCalledWith(
      "SELECT name FROM custom_courses WHERE id = ? LIMIT 1;",
      77,
    );
    expect(runAsync).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      "custom",
      "review",
      12,
      77,
      "Kurs DB",
      "perro",
      "pies",
      0,
      "wrong",
      "boxTwo",
      "boxZero",
      8400,
      expect.any(Number),
      null,
      null,
      "text",
      "pies",
    );
  });

  it("clamps read limit and maps database row", async () => {
    const getAllAsync = jest.fn().mockResolvedValue([
      {
        id: 1,
        sourceType: "builtin",
        mode: "flashcards",
        cardId: 4,
        courseId: null,
        courseName: "English",
        promptText: "pies",
        expectedAnswerText: "dog",
        reversed: 1,
        result: "ok",
        fromBox: "boxOne",
        toBox: "boxTwo",
        promptImageUri: null,
        expectedAnswerImageUri: null,
        cardType: "true_false",
        userAnswer: "true",
        durationMs: null,
        createdAt: 456,
      },
    ]);
    mockGetDB.mockResolvedValue({ getAllAsync });

    const result = await getRecentLearningHistory(1000);

    expect(getAllAsync).toHaveBeenCalledWith(expect.stringContaining("LIMIT ?;"), 100);
    expect(result[0]).toMatchObject({
      sourceType: "builtin",
      reversed: true,
      result: "ok",
    });
  });
});
