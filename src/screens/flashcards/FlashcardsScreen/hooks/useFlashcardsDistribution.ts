import { DEFAULT_FLASHCARDS_BATCH_SIZE } from "@/src/config/appConfig";
import {
    getCustomReviewedFlashcardIds,
    type CustomCourseRecord,
} from "@/src/db/sqlite/db";
import {
    dedupeById,
    pickRandomBatch,
} from "@/src/screens/flashcards/FlashcardsScreen/utils/FlashcardsScreen.utils";
import { appendDebugEvent } from "@/src/services/debugEvents";
import type { BoxesState, WordWithTranslations } from "@/src/types/boxes";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type Dispatch,
    type SetStateAction,
} from "react";

type DownloadSource = "manual" | "autoflow" | "auto-empty";

type UseFlashcardsDistributionParams = {
  activeCustomCourseId: number | null;
  loadedCourseId: number | null;
  customCourse: CustomCourseRecord | null;
  customCards: WordWithTranslations[];
  isFocused: boolean;
  isReady: boolean;
  isLoadingData: boolean;
  boxes: BoxesState;
  setBoxes: Dispatch<SetStateAction<BoxesState>>;
  usedWordIds: number[];
  addUsedWordIds: (ids: number[] | number) => void;
  removeUsedWordIds: (ids: number[] | number) => void;
  relearningWordIds: number[];
  setBatchIndex: Dispatch<SetStateAction<number>>;
  storageKey: string;
  learned: WordWithTranslations[];
  setLearned: Dispatch<SetStateAction<WordWithTranslations[]>>;
  updateSelectedItem: (
    updater: (current: WordWithTranslations) => WordWithTranslations,
  ) => void;
  boxZeroEnabled: boolean;
  flashcardsBatchSize: number | null | undefined;
};

export function useFlashcardsDistribution({
  activeCustomCourseId,
  loadedCourseId,
  customCourse,
  customCards,
  isFocused,
  isReady,
  isLoadingData,
  boxes,
  setBoxes,
  usedWordIds,
  addUsedWordIds,
  removeUsedWordIds,
  relearningWordIds,
  setBatchIndex,
  storageKey,
  learned,
  setLearned,
  updateSelectedItem,
  boxZeroEnabled,
  flashcardsBatchSize,
}: UseFlashcardsDistributionParams) {
  const [isReviewedIdsSeedLoading, setIsReviewedIdsSeedLoading] =
    useState(false);
  const [reviewedCardIds, setReviewedCardIds] = useState<number[]>([]);
  const [reviewedIdsSeedResolvedCourseId, setReviewedIdsSeedResolvedCourseId] =
    useState<number | null>(null);
  const downloadSourceRef = useRef<DownloadSource | null>(null);
  const totalCards = customCards.length;

  useEffect(() => {
    if (!isFocused) return;
    setReviewedIdsSeedResolvedCourseId(null);
  }, [activeCustomCourseId, isFocused]);

  const trackedIds = useMemo(() => {
    const ids = new Set<number>();
    for (const list of Object.values(boxes)) {
      for (const item of list) ids.add(item.id);
    }
    for (const item of learned) ids.add(item.id);
    for (const id of usedWordIds) ids.add(id);
    return ids;
  }, [boxes, learned, usedWordIds]);

  const currentCourseCardIds = useMemo(
    () => new Set(customCards.map((card) => card.id)),
    [customCards],
  );

  const distributedCurrentCourseCount = useMemo(() => {
    let count = 0;
    for (const id of trackedIds) {
      if (currentCourseCardIds.has(id)) count += 1;
    }
    return count;
  }, [currentCourseCardIds, trackedIds]);

  const remainingNewFlashcardsCount = useMemo(() => {
    return customCards.filter((card) => !trackedIds.has(card.id)).length;
  }, [customCards, trackedIds]);

  const allCardsDistributed =
    totalCards > 0 && distributedCurrentCourseCount >= totalCards;

  const hasCardsReturnedToUnknown = relearningWordIds.some((id) =>
    currentCourseCardIds.has(id),
  );

  const totalCardsInBoxes = useMemo(() => {
    return (
      boxes.boxZero.length +
      boxes.boxOne.length +
      boxes.boxTwo.length +
      boxes.boxThree.length +
      boxes.boxFour.length +
      boxes.boxFive.length
    );
  }, [boxes]);

  useEffect(() => {
    if (!isFocused) return;
    if (activeCustomCourseId == null) {
      setIsReviewedIdsSeedLoading(false);
      setReviewedCardIds([]);
      setReviewedIdsSeedResolvedCourseId(null);
      return;
    }
    if (!isReady || customCards.length === 0 || isLoadingData) {
      return;
    }

    if (!customCourse?.reviewsEnabled) {
      setIsReviewedIdsSeedLoading(false);
      setReviewedCardIds([]);
      setReviewedIdsSeedResolvedCourseId(activeCustomCourseId);
      return;
    }

    let cancelled = false;
    setIsReviewedIdsSeedLoading(true);

    void getCustomReviewedFlashcardIds(activeCustomCourseId)
      .then((reviewedIds) => {
        if (cancelled) {
          return;
        }
        setReviewedCardIds(reviewedIds);
      })
      .catch((error) => {
        console.warn(
          `[Flashcards] Failed to seed reviewed ids for course ${activeCustomCourseId}`,
          error,
        );
      })
      .finally(() => {
        if (!cancelled) {
          setIsReviewedIdsSeedLoading(false);
          setReviewedIdsSeedResolvedCourseId(activeCustomCourseId);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeCustomCourseId,
    customCourse?.reviewsEnabled,
    customCards.length,
    isFocused,
    isLoadingData,
    isReady,
  ]);

  useEffect(() => {
    if (!isFocused) return;
    if (!isReady) return;
    if (isLoadingData) return;
    if (activeCustomCourseId == null) return;
    if (loadedCourseId !== activeCustomCourseId) return;
    if (reviewedIdsSeedResolvedCourseId !== activeCustomCourseId) return;
    if (!customCourse?.reviewsEnabled) return;
    if (!customCards.length) return;

    const retainedIds = new Set<number>(reviewedCardIds);

    for (const list of Object.values(boxes)) {
      for (const item of list) retainedIds.add(item.id);
    }
    for (const item of learned) retainedIds.add(item.id);

    const usedIds = new Set(usedWordIds);
    const reviewedIdsToAdd = reviewedCardIds.filter(
      (id) => currentCourseCardIds.has(id) && !usedIds.has(id),
    );
    if (reviewedIdsToAdd.length > 0) {
      addUsedWordIds(reviewedIdsToAdd);
    }

    const staleUsedIds = usedWordIds.filter(
      (id) => currentCourseCardIds.has(id) && !retainedIds.has(id),
    );
    if (staleUsedIds.length > 0) {
      removeUsedWordIds(staleUsedIds);
    }
  }, [
    activeCustomCourseId,
    addUsedWordIds,
    boxes,
    currentCourseCardIds,
    customCards.length,
    customCourse?.reviewsEnabled,
    isFocused,
    isLoadingData,
    isReady,
    learned,
    loadedCourseId,
    removeUsedWordIds,
    reviewedCardIds,
    reviewedIdsSeedResolvedCourseId,
    usedWordIds,
  ]);

  const downloadData = useCallback(async (): Promise<void> => {
    if (!isFocused) return;
    if (activeCustomCourseId == null) return;
    if (loadedCourseId !== activeCustomCourseId) return;
    if (!customCards.length) return;

    const remaining = customCards.filter((card) => !trackedIds.has(card.id));
    if (remaining.length === 0) return;

    const source = downloadSourceRef.current;
    const batchSize = flashcardsBatchSize ?? DEFAULT_FLASHCARDS_BATCH_SIZE;
    const nextBatch = pickRandomBatch(remaining, batchSize);
    let actuallyAdded: WordWithTranslations[] = [];

    setBoxes((prev) => {
      const targetKey = boxZeroEnabled ? "boxZero" : "boxOne";
      const existingIds = new Set(prev[targetKey].map((card) => card.id));
      actuallyAdded = nextBatch.filter((card) => !existingIds.has(card.id));
      if (actuallyAdded.length === 0) {
        return prev;
      }
      return {
        ...prev,
        [targetKey]: [...prev[targetKey], ...actuallyAdded],
      };
    });
    if (actuallyAdded.length === 0) return;
    void appendDebugEvent("flashcards", "flashcards.batch_add", {
      screen: "flashcards",
      courseId: activeCustomCourseId,
      storageKey,
      source,
      requested: nextBatch.length,
      added: actuallyAdded.length,
      targetBox: boxZeroEnabled ? "boxZero" : "boxOne",
      remainingBefore: remaining.length,
      usedWordIdsCount: usedWordIds.length,
    });
    addUsedWordIds(actuallyAdded.map((card) => card.id));
    setBatchIndex((prev) => prev + 1);
  }, [
    activeCustomCourseId,
    addUsedWordIds,
    boxZeroEnabled,
    customCards,
    flashcardsBatchSize,
    isFocused,
    loadedCourseId,
    setBatchIndex,
    storageKey,
    trackedIds,
    setBoxes,
    usedWordIds.length,
  ]);

  const handleManualAddFlashcards = useCallback(async () => {
    void appendDebugEvent("flashcards", "flashcards.add_click", {
      screen: "flashcards",
      courseId: activeCustomCourseId,
      storageKey,
      usedWordIdsCount: usedWordIds.length,
    });
    downloadSourceRef.current = "manual";
    try {
      await downloadData();
    } finally {
      downloadSourceRef.current = null;
    }
  }, [activeCustomCourseId, downloadData, storageKey, usedWordIds.length]);

  const handleAutoflowDownload = useCallback(async () => {
    void appendDebugEvent("flashcards", "flashcards.autoflow_download", {
      screen: "flashcards",
      courseId: activeCustomCourseId,
      storageKey,
      usedWordIdsCount: usedWordIds.length,
    });
    downloadSourceRef.current = "autoflow";
    try {
      await downloadData();
    } finally {
      downloadSourceRef.current = null;
    }
  }, [activeCustomCourseId, downloadData, storageKey, usedWordIds.length]);

  const handleAutoEmptyDownload = useCallback(async () => {
    downloadSourceRef.current = "auto-empty";
    try {
      await downloadData();
    } finally {
      downloadSourceRef.current = null;
    }
  }, [downloadData]);

  useEffect(() => {
    if (!isFocused) return;
    if (!isReady) return;
    if (activeCustomCourseId == null) return;
    if (loadedCourseId !== activeCustomCourseId) return;
    if (isLoadingData || customCards.length === 0) return;

    const latestById = new Map(
      customCards.map((card) => [card.id, card] as const),
    );
    const allowedIds = new Set(latestById.keys());

    setBoxes((prev) => {
      let mutated = false;
      const sanitize = (list: WordWithTranslations[]) => {
        const filtered = list.filter((item) => allowedIds.has(item.id));
        const remapped = filtered.map(
          (item) => latestById.get(item.id) ?? item,
        );
        const deduped = dedupeById(remapped);
        if (
          deduped.length !== list.length ||
          deduped.some((item, index) => item !== list[index])
        ) {
          mutated = true;
        }
        return deduped;
      };

      const next: BoxesState = {
        boxZero: sanitize(prev.boxZero),
        boxOne: sanitize(prev.boxOne),
        boxTwo: sanitize(prev.boxTwo),
        boxThree: sanitize(prev.boxThree),
        boxFour: sanitize(prev.boxFour),
        boxFive: sanitize(prev.boxFive),
      };
      return mutated ? next : prev;
    });

    setLearned((current) => {
      const filtered = current.filter((card) => allowedIds.has(card.id));
      const remapped = filtered.map((card) => latestById.get(card.id) ?? card);
      const deduped = dedupeById(remapped);
      const changed =
        deduped.length !== current.length ||
        deduped.some((card, index) => card !== current[index]);
      return changed ? deduped : current;
    });

    const refreshSelectedItem = (current: WordWithTranslations | null) => {
      if (current == null) return current;
      return latestById.get(current.id) ?? current;
    };
    updateSelectedItem(
      refreshSelectedItem as (
        current: WordWithTranslations,
      ) => WordWithTranslations,
    );
  }, [
    customCards,
    activeCustomCourseId,
    isFocused,
    isReady,
    isLoadingData,
    loadedCourseId,
    setBoxes,
    setLearned,
    updateSelectedItem,
  ]);

  useEffect(() => {
    if (!isFocused) return;
    if (!isReady) return;
    if (isLoadingData) return;
    if (isReviewedIdsSeedLoading) return;
    if (activeCustomCourseId == null) return;
    if (loadedCourseId !== activeCustomCourseId) return;
    if (reviewedIdsSeedResolvedCourseId !== activeCustomCourseId) return;
    if (totalCardsInBoxes > 0) return;
    if (allCardsDistributed) return;
    if (!customCards.length) return;

    void handleAutoEmptyDownload();
  }, [
    isReady,
    isFocused,
    isLoadingData,
    isReviewedIdsSeedLoading,
    activeCustomCourseId,
    loadedCourseId,
    reviewedIdsSeedResolvedCourseId,
    totalCardsInBoxes,
    allCardsDistributed,
    customCards,
    handleAutoEmptyDownload,
  ]);

  return {
    trackedIds,
    currentCourseCardIds,
    distributedCurrentCourseCount,
    remainingNewFlashcardsCount,
    allCardsDistributed,
    totalCardsInBoxes,
    reviewedCardIds,
    setReviewedCardIds,
    reviewedIdsSeedResolvedCourseId,
    isReviewedIdsSeedLoading,
    hasCardsReturnedToUnknown,
    handleManualAddFlashcards,
    handleAutoflowDownload,
  };
}
