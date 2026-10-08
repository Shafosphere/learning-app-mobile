import { act, renderHook } from "@testing-library/react-native";
import { useState } from "react";
import { ensureCourseCompletionRunStarted } from "@/src/features/flashcards/courseCompletionRun";
import { useFlashcardsCompletionRun } from "../useFlashcardsCompletionRun";

jest.mock("@/src/features/flashcards/courseCompletionRun", () => ({
  ensureCourseCompletionRunStarted: jest.fn(() => Promise.resolve(0)),
}));

const persistStart = jest.mocked(ensureCourseCompletionRunStarted);
const initialSummary = { totalAnswers: 5, correctCount: 4, wrongCount: 1, timeMs: 60000 };

function setup(courseId: number | null = 7, startedAt: number | null = null) {
  const setStartedAt = jest.fn();
  return {
    setStartedAt,
    ...renderHook((props: { courseId: number | null; startedAt: number | null }) => {
      const [summary, setSummary] = useState(initialSummary);
      const completion = useFlashcardsCompletionRun({
        activeCustomCourseId: props.courseId,
        courseCompletionRunStartedAt: props.startedAt,
        setCourseCompletionRunStartedAt: setStartedAt,
        setCourseCompletionSummary: setSummary,
      });
      return { ...completion, summary };
    }, { initialProps: { courseId, startedAt } }),
  };
}

describe("useFlashcardsCompletionRun", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    persistStart.mockResolvedValue(0);
  });
  afterEach(() => jest.restoreAllMocks());

  it("starts lazily and guards consecutive answers before state commits", () => {
    const { result, setStartedAt } = setup();
    expect(persistStart).not.toHaveBeenCalled();
    act(() => {
      result.current.ensureCompletionRunStarted(123);
      result.current.ensureCompletionRunStarted(456);
    });
    expect(setStartedAt).toHaveBeenCalledTimes(1);
    expect(setStartedAt).toHaveBeenCalledWith(123);
    expect(persistStart).toHaveBeenCalledTimes(1);
    expect(persistStart).toHaveBeenCalledWith(7, 123);
  });

  it("uses a loaded start and permits a new run after changing course data", () => {
    const { result, rerender, setStartedAt } = setup(7, 100);
    act(() => result.current.ensureCompletionRunStarted(200));
    expect(persistStart).not.toHaveBeenCalled();
    rerender({ courseId: 8, startedAt: null });
    act(() => result.current.ensureCompletionRunStarted(300));
    expect(setStartedAt).toHaveBeenCalledWith(300);
    expect(persistStart).toHaveBeenCalledWith(8, 300);
  });

  it("ignores missing courses and clamps a negative start", () => {
    const { result, rerender } = setup(null);
    act(() => result.current.ensureCompletionRunStarted(100));
    expect(persistStart).not.toHaveBeenCalled();
    rerender({ courseId: 8, startedAt: null });
    act(() => result.current.ensureCompletionRunStarted(-100));
    expect(persistStart).toHaveBeenCalledWith(8, 0);
  });

  it("adds both answer outcomes to lifetime totals and clamps negative duration", () => {
    const { result } = setup();
    act(() => {
      result.current.applyCompletionSummaryAnswer("ok", 1500);
      result.current.applyCompletionSummaryAnswer("wrong", -100);
      result.current.applyCompletionSummaryAnswer("wrong", 500);
    });
    expect(result.current.summary).toEqual({
      totalAnswers: 8, correctCount: 5, wrongCount: 3, timeMs: 62000,
    });
  });

  it("reports persistence failure without restarting or losing local totals", async () => {
    const error = new Error("storage unavailable");
    persistStart.mockRejectedValue(error);
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const { result } = setup();
    await act(async () => {
      result.current.ensureCompletionRunStarted(100);
      result.current.applyCompletionSummaryAnswer("ok", 1000);
    });
    expect(warn).toHaveBeenCalledWith("[Flashcards] Failed to persist completion run start", error);
    act(() => result.current.ensureCompletionRunStarted(200));
    expect(persistStart).toHaveBeenCalledTimes(1);
    expect(result.current.summary.totalAnswers).toBe(6);
  });
});
