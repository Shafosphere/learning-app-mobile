/* eslint-disable import/first */
const mockGetDB = jest.fn();

jest.mock("@/src/db/sqlite/core", () => ({
  getDB: () => mockGetDB(),
}));

import {
  clearCustomLearningEventsForCourse,
  getCourseCompletionSummary,
  getCustomFlashcardConsecutiveWrongCount,
  getGlobalDailyStreakDays,
  getHardFlashcards,
} from "@/src/db/sqlite/repositories/analytics";

describe("analytics repository", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it("returns aggregated completion stats for a course", async () => {
    const getFirstAsync = jest.fn().mockResolvedValue({
      totalAnswers: 18,
      correctCount: 14,
      wrongCount: 4,
      timeMs: 125000,
    });

    mockGetDB.mockResolvedValue({
      getFirstAsync,
    });

    const result = await getCourseCompletionSummary(77);

    expect(getFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining("FROM custom_learning_events"),
      77
    );
    expect(result).toEqual({
      totalAnswers: 18,
      correctCount: 14,
      wrongCount: 4,
      timeMs: 125000,
    });
  });

  it("returns zeroes when a course has no learning events", async () => {
    const getFirstAsync = jest.fn().mockResolvedValue(null);

    mockGetDB.mockResolvedValue({
      getFirstAsync,
    });

    const result = await getCourseCompletionSummary(88);

    expect(result).toEqual({
      totalAnswers: 0,
      correctCount: 0,
      wrongCount: 0,
      timeMs: 0,
    });
  });

  it("filters completion stats from run start when requested", async () => {
    const getFirstAsync = jest.fn().mockResolvedValue({
      totalAnswers: 4,
      correctCount: 3,
      wrongCount: 1,
      timeMs: 42000,
    });

    mockGetDB.mockResolvedValue({
      getFirstAsync,
    });

    const result = await getCourseCompletionSummary(55, {
      fromCreatedAtMs: 123456,
    });

    expect(getFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining("AND created_at >= ?"),
      55,
      123456
    );
    expect(result).toEqual({
      totalAnswers: 4,
      correctCount: 3,
      wrongCount: 1,
      timeMs: 42000,
    });
  });

  it("clears learning events for a course", async () => {
    const runAsync = jest.fn().mockResolvedValue({ changes: 6 });

    mockGetDB.mockResolvedValue({
      runAsync,
    });

    const result = await clearCustomLearningEventsForCourse(41);

    expect(runAsync).toHaveBeenCalledWith(
      "DELETE FROM custom_learning_events WHERE course_id = ?;",
      41
    );
    expect(result).toBe(6);
  });

  it("returns zero consecutive wrong answers when a flashcard has no events", async () => {
    const getFirstAsync = jest.fn().mockResolvedValue(null);

    mockGetDB.mockResolvedValue({
      getFirstAsync,
    });

    const result = await getCustomFlashcardConsecutiveWrongCount(12, 77);

    expect(getFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining("COUNT(*) AS wrongCount"),
      12,
      77,
      77,
      12,
      77,
      77
    );
    expect(result).toBe(0);
  });

  it("counts wrong answers after the latest ok answer", async () => {
    const getFirstAsync = jest.fn().mockResolvedValue({ wrongCount: 3 });

    mockGetDB.mockResolvedValue({
      getFirstAsync,
    });

    const result = await getCustomFlashcardConsecutiveWrongCount(33, 44);
    const [sql] = getFirstAsync.mock.calls[0];

    expect(sql).toContain("SELECT MAX(created_at)");
    expect(sql).toContain("result = 'ok'");
    expect(sql).toContain("result = 'wrong'");
    expect(result).toBe(3);
  });

  it("scopes consecutive wrong answers by course id", async () => {
    const getFirstAsync = jest.fn().mockResolvedValue({ wrongCount: 6 });

    mockGetDB.mockResolvedValue({
      getFirstAsync,
    });

    const result = await getCustomFlashcardConsecutiveWrongCount(19, 81);
    const args = getFirstAsync.mock.calls[0].slice(1);

    expect(args).toEqual([19, 81, 81, 19, 81, 81]);
    expect(result).toBe(6);
  });

  it("counts one correct boxZero event as today's daily streak", async () => {
    const getAllAsync = jest.fn().mockResolvedValue([{ d: "2026-05-02" }]);

    mockGetDB.mockResolvedValue({
      getAllAsync,
    });

    const result = await getGlobalDailyStreakDays(
      new Date(2026, 4, 2, 12).getTime()
    );
    const [sql] = getAllAsync.mock.calls[0];

    expect(sql).toContain("'boxZero'");
    expect(sql).toContain("'boxFive'");
    expect(sql).not.toContain("HAVING COUNT(*) >= 10");
    expect(result).toBe(1);
  });

  it("counts one correct boxFive event as today's daily streak", async () => {
    const getAllAsync = jest.fn().mockResolvedValue([{ d: "2026-05-02" }]);

    mockGetDB.mockResolvedValue({
      getAllAsync,
    });

    const result = await getGlobalDailyStreakDays(
      new Date(2026, 4, 2, 12).getTime()
    );
    const [sql] = getAllAsync.mock.calls[0];

    expect(sql).toContain("result = 'ok'");
    expect(result).toBe(1);
  });

  it("counts consecutive active days with one event per day", async () => {
    const getAllAsync = jest.fn().mockResolvedValue([
      { d: "2026-05-02" },
      { d: "2026-05-01" },
      { d: "2026-04-30" },
    ]);

    mockGetDB.mockResolvedValue({
      getAllAsync,
    });

    const result = await getGlobalDailyStreakDays(
      new Date(2026, 4, 2, 12).getTime()
    );

    expect(result).toBe(3);
  });

  it("keeps yesterday's streak visible before today's learning", async () => {
    const getAllAsync = jest.fn().mockResolvedValue([
      { d: "2026-05-01" },
      { d: "2026-04-30" },
    ]);

    mockGetDB.mockResolvedValue({
      getAllAsync,
    });

    const result = await getGlobalDailyStreakDays(
      new Date(2026, 4, 2, 12).getTime()
    );

    expect(result).toBe(2);
  });

  it("resets the streak when the latest active day is older than yesterday", async () => {
    const getAllAsync = jest.fn().mockResolvedValue([{ d: "2026-04-30" }]);

    mockGetDB.mockResolvedValue({
      getAllAsync,
    });

    const result = await getGlobalDailyStreakDays(
      new Date(2026, 4, 2, 12).getTime()
    );

    expect(result).toBe(0);
  });

  it("stops counting at the first missing day", async () => {
    const getAllAsync = jest.fn().mockResolvedValue([
      { d: "2026-05-02" },
      { d: "2026-04-30" },
    ]);

    mockGetDB.mockResolvedValue({
      getAllAsync,
    });

    const result = await getGlobalDailyStreakDays(
      new Date(2026, 4, 2, 12).getTime()
    );

    expect(result).toBe(1);
  });

  it("returns global hard flashcards without filtering by course", async () => {
    const getAllAsync = jest.fn().mockResolvedValue([
      {
        id: 3,
        frontText: "Sierra Leone",
        backText: "Freetown",
        imageFront: "front://flag",
        imageBack: null,
        type: "text",
        wrongCount: 2,
      },
    ]);

    mockGetDB.mockResolvedValue({
      getAllAsync,
    });

    const result = await getHardFlashcards(undefined, 5);
    const [sql, limit] = getAllAsync.mock.calls[0];

    expect(sql).not.toContain("WHERE cf.course_id = ?");
    expect(limit).toBe(5);
    expect(result).toEqual([
      {
        id: 3,
        frontText: "Sierra Leone",
        backText: "Freetown",
        imageFront: "front://flag",
        imageBack: null,
        type: "text",
        wrongCount: 2,
      },
    ]);
  });

  it("returns course-scoped hard flashcards when a course id is provided", async () => {
    const getAllAsync = jest.fn().mockResolvedValue([
      {
        id: 8,
        frontText: "",
        backText: "Tonga",
        imageFront: null,
        imageBack: "back://flag",
        type: "text",
        wrongCount: 1,
      },
    ]);

    mockGetDB.mockResolvedValue({
      getAllAsync,
    });

    const result = await getHardFlashcards(12, 5);
    const [sql, courseId, limit] = getAllAsync.mock.calls[0];

    expect(sql).toContain("WHERE cf.course_id = ?");
    expect(courseId).toBe(12);
    expect(limit).toBe(5);
    expect(result).toEqual([
      {
        id: 8,
        frontText: "",
        backText: "Tonga",
        imageFront: null,
        imageBack: "back://flag",
        type: "text",
        wrongCount: 1,
      },
    ]);
  });
});
