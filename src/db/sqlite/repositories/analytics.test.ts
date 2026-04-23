const mockGetDB = jest.fn();

jest.mock("@/src/db/sqlite/core", () => ({
  getDB: () => mockGetDB(),
}));

import {
  clearCustomLearningEventsForCourse,
  getCourseCompletionSummary,
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
});
