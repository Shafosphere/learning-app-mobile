import type {
    CourseCompletionSummary,
    CustomCourseMasteryProgress,
    CustomCourseRecord,
} from "@/src/db/sqlite/db";
import {
    getCourseCompletionSummary,
    getCustomCourseById,
    getCustomCourseMasteryProgress,
    getCustomFlashcards,
    updateCustomFlashcardHints,
} from "@/src/db/sqlite/db";
import { getCourseCompletionRunStartedAt } from "@/src/features/flashcards/courseCompletionRun";
import {
    EMPTY_COURSE_COMPLETION_SUMMARY,
    EMPTY_COURSE_MASTERY_PROGRESS,
} from "@/src/screens/flashcards/FlashcardsScreen/model/FlashcardsScreen.constants";
import { appendDebugEvent } from "@/src/services/debugEvents";
import type { WordWithTranslations } from "@/src/types/boxes";
import { mapCustomCardToWord } from "@/src/utils/flashcardsMapper";
import { useCallback, useEffect, useRef, useState } from "react";

type UseFlashcardsCourseDataParams = {
  activeCustomCourseId: number | null;
  isFocused: boolean;
  storageKey: string;
  setActiveCustomCourseId: (courseId: number | null) => void | Promise<void>;
};

export function useFlashcardsCourseData({
  activeCustomCourseId,
  isFocused,
  storageKey,
  setActiveCustomCourseId,
}: UseFlashcardsCourseDataParams) {
  const [customCourse, setCustomCourse] = useState<CustomCourseRecord | null>(
    null,
  );
  const [customCards, setCustomCards] = useState<WordWithTranslations[]>([]);
  const [courseCompletionSummary, setCourseCompletionSummary] =
    useState<CourseCompletionSummary>(EMPTY_COURSE_COMPLETION_SUMMARY);
  const [courseMasteryProgress, setCourseMasteryProgress] =
    useState<CustomCourseMasteryProgress>(EMPTY_COURSE_MASTERY_PROGRESS);
  const [courseCompletionRunStartedAt, setCourseCompletionRunStartedAt] =
    useState<number | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [loadedCourseId, setLoadedCourseId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadedCourseIdRef = useRef<number | null>(null);
  const customCardsLengthRef = useRef(0);

  useEffect(() => {
    loadedCourseIdRef.current = loadedCourseId;
  }, [loadedCourseId]);

  useEffect(() => {
    customCardsLengthRef.current = customCards.length;
  }, [customCards.length]);

  useEffect(() => {
    if (!isFocused) return;

    let isMounted = true;

    if (activeCustomCourseId == null) {
      setCustomCourse(null);
      setCustomCards([]);
      setCourseCompletionSummary(EMPTY_COURSE_COMPLETION_SUMMARY);
      setCourseMasteryProgress(EMPTY_COURSE_MASTERY_PROGRESS);
      setCourseCompletionRunStartedAt(null);
      setLoadError(null);
      setLoadedCourseId(null);
      setIsLoadingData(false);
      return () => {
        isMounted = false;
      };
    }

    const shouldShowLoader =
      loadedCourseIdRef.current !== activeCustomCourseId ||
      customCardsLengthRef.current === 0;
    setIsLoadingData(shouldShowLoader);
    setLoadError(null);
    void appendDebugEvent("flashcards", "flashcards.data_load.start", {
      screen: "flashcards",
      courseId: activeCustomCourseId,
      storageKey,
    });

    void (async () => {
      const runStartedAt =
        await getCourseCompletionRunStartedAt(activeCustomCourseId);
      const [
        courseRow,
        flashcardRows,
        lifetimeCompletionSummary,
        masteryProgress,
      ] = await Promise.all([
        getCustomCourseById(activeCustomCourseId),
        getCustomFlashcards(activeCustomCourseId),
        getCourseCompletionSummary(activeCustomCourseId),
        getCustomCourseMasteryProgress(activeCustomCourseId),
      ]);

      if (!isMounted) return;
      if (!courseRow) {
        setCustomCourse(null);
        setCustomCards([]);
        setCourseCompletionSummary(EMPTY_COURSE_COMPLETION_SUMMARY);
        setCourseMasteryProgress(EMPTY_COURSE_MASTERY_PROGRESS);
        setCourseCompletionRunStartedAt(null);
        setLoadedCourseId(null);
        setLoadError("Wybrany kurs nie istnieje.");
        void setActiveCustomCourseId(null);
        return;
      }

      setCustomCourse(courseRow);
      const mapped = flashcardRows.map(mapCustomCardToWord);
      void appendDebugEvent("flashcards", "flashcards.data_load.success", {
        screen: "flashcards",
        courseId: activeCustomCourseId,
        storageKey,
        flashcardsCount: mapped.length,
        reviewsEnabled: courseRow.reviewsEnabled,
      });
      setCustomCards(mapped);
      setCourseCompletionRunStartedAt(runStartedAt);
      setCourseCompletionSummary(
        lifetimeCompletionSummary ?? EMPTY_COURSE_COMPLETION_SUMMARY,
      );
      setCourseMasteryProgress(
        masteryProgress ?? EMPTY_COURSE_MASTERY_PROGRESS,
      );
      setLoadedCourseId(activeCustomCourseId);
    })()
      .catch((error) => {
        console.error("Failed to load custom flashcards", error);
        void appendDebugEvent("flashcards", "flashcards.data_load.error", {
          screen: "flashcards",
          courseId: activeCustomCourseId,
          storageKey,
          message: error instanceof Error ? error.message : String(error),
        });
        if (!isMounted) return;
        setCustomCourse(null);
        setCustomCards([]);
        setCourseCompletionSummary(EMPTY_COURSE_COMPLETION_SUMMARY);
        setCourseMasteryProgress(EMPTY_COURSE_MASTERY_PROGRESS);
        setCourseCompletionRunStartedAt(null);
        setLoadError("Nie udało się wczytać fiszek.");
      })
      .finally(() => {
        if (isMounted) setIsLoadingData(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeCustomCourseId, isFocused, setActiveCustomCourseId, storageKey]);

  const patchCustomCardHints = useCallback(
    (cardId: number, hintFront: string | null, hintBack: string | null) => {
      setCustomCards((prev) =>
        prev.map((item) =>
          item.id === cardId ? { ...item, hintFront, hintBack } : item,
        ),
      );
    },
    [],
  );

  const handlePersistHintUpdate = useCallback(
    async (
      cardId: number,
      hintFront: string | null,
      hintBack: string | null,
    ) => {
      patchCustomCardHints(cardId, hintFront, hintBack);
      await updateCustomFlashcardHints(cardId, { hintFront, hintBack });
    },
    [patchCustomCardHints],
  );

  return {
    customCourse,
    customCards,
    setCustomCards,
    courseCompletionSummary,
    courseMasteryProgress,
    courseCompletionRunStartedAt,
    isLoadingData,
    loadedCourseId,
    loadError,
    setCourseCompletionSummary,
    setCourseCompletionRunStartedAt,
    patchCustomCardHints,
    handlePersistHintUpdate,
  };
}
