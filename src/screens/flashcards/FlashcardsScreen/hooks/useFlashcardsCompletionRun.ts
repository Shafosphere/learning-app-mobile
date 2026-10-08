import { useCallback, useEffect, useRef } from "react";
import { ensureCourseCompletionRunStarted } from "@/src/features/flashcards/courseCompletionRun";
import type { CourseCompletionSummary } from "@/src/db/sqlite/db";
import type { Dispatch, SetStateAction } from "react";
type Params = {
  activeCustomCourseId: number | null;
  courseCompletionRunStartedAt: number | null;
  setCourseCompletionRunStartedAt: Dispatch<SetStateAction<number | null>>;
  setCourseCompletionSummary: Dispatch<SetStateAction<CourseCompletionSummary>>;
};

export function useFlashcardsCompletionRun({
  activeCustomCourseId,
  courseCompletionRunStartedAt,
  setCourseCompletionRunStartedAt,
  setCourseCompletionSummary,
}: Params) {
  const courseCompletionRunStartedAtRef = useRef<number | null>(null);
  const applyCompletionSummaryAnswer = useCallback(
    (answerResult: "ok" | "wrong", durationMs: number) => {
      setCourseCompletionSummary((prev) => ({
        totalAnswers: prev.totalAnswers + 1,
        correctCount: prev.correctCount + (answerResult === "ok" ? 1 : 0),
        wrongCount: prev.wrongCount + (answerResult === "wrong" ? 1 : 0),
        timeMs: prev.timeMs + Math.max(0, durationMs),
      }));
    },
    [setCourseCompletionSummary],
  );
  useEffect(() => {
    courseCompletionRunStartedAtRef.current = courseCompletionRunStartedAt;
  }, [courseCompletionRunStartedAt]);

  const ensureCompletionRunStarted = useCallback(
    (fallbackNowMs?: number) => {
      if (activeCustomCourseId == null) {
        return;
      }
      if (courseCompletionRunStartedAtRef.current != null) {
        return;
      }

      const startedAt = Math.max(0, fallbackNowMs ?? Date.now());
      courseCompletionRunStartedAtRef.current = startedAt;
      setCourseCompletionRunStartedAt(startedAt);
      void ensureCourseCompletionRunStarted(
        activeCustomCourseId,
        startedAt,
      ).catch((error) => {
        console.warn(
          "[Flashcards] Failed to persist completion run start",
          error,
        );
      });
    },
    [activeCustomCourseId, setCourseCompletionRunStartedAt],
  );

  return { applyCompletionSummaryAnswer, ensureCompletionRunStarted };
}
