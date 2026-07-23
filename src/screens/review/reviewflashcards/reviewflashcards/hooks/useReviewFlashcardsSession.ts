import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import {
  getDueCustomReviewFlashcards,
  getUpcomingCustomReviewFlashcards,
} from "@/src/db/sqlite/db";
import {
  appendDebugEvent,
  summarizeBoxes,
} from "@/src/services/debugEvents";
import type { BoxesState, WordWithTranslations } from "@/src/types/boxes";
import { mapReviewCardToWord } from "@/src/utils/flashcardsMapper";

import {
  BOX_SPAM_THRESHOLD,
  BOX_SPAM_WINDOW_MS,
} from "../model/reviewFlashcards.constants";
import {
  createEmptyBoxes,
  distributeByStage,
  findFirstActiveBox,
} from "../utils/reviewFlashcards.utils";

export type UseReviewFlashcardsSessionParams = {
  courseId: number | null;
  isLoading: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  correctionActive: boolean | (() => boolean);
  mistakeNudgeActive: boolean;
  isBetweenCards: boolean | (() => boolean);
  handleBlockedBoxInteraction: (box: keyof BoxesState) => void;
  handleBoxFaceSelection: (box: keyof BoxesState) => void;
  clearTransitionTimer: () => void;
  onSessionReset: () => void;
};

const createQueues = (
  boxes: BoxesState
): Record<keyof BoxesState, WordWithTranslations[]> => ({
  boxZero: boxes.boxZero.length > 0 ? [...boxes.boxZero] : [],
  boxOne: boxes.boxOne.length > 0 ? [...boxes.boxOne] : [],
  boxTwo: boxes.boxTwo.length > 0 ? [...boxes.boxTwo] : [],
  boxThree: boxes.boxThree.length > 0 ? [...boxes.boxThree] : [],
  boxFour: boxes.boxFour.length > 0 ? [...boxes.boxFour] : [],
  boxFive: boxes.boxFive.length > 0 ? [...boxes.boxFive] : [],
});

export const useReviewFlashcardsSession = ({
  courseId,
  isLoading,
  setIsLoading,
  correctionActive,
  mistakeNudgeActive,
  isBetweenCards,
  handleBlockedBoxInteraction,
  handleBoxFaceSelection,
  clearTransitionTimer,
  onSessionReset,
}: UseReviewFlashcardsSessionParams) => {
  const [boxes, setBoxes] = useState<BoxesState>(() => createEmptyBoxes());
  const [activeBox, setActiveBox] = useState<keyof BoxesState | null>(null);
  const [selectedItem, setSelectedItem] =
    useState<WordWithTranslations | null>(null);
  const [queueNext, setQueueNext] = useState(false);
  const [peekBox, setPeekBox] = useState<keyof BoxesState | null>(null);
  const [peekCards, setPeekCards] = useState<WordWithTranslations[]>([]);
  const [upcomingPeekCards, setUpcomingPeekCards] = useState<
    WordWithTranslations[]
  >([]);
  const [isUpcomingPeekLoading, setIsUpcomingPeekLoading] = useState(false);
  const [upcomingPeekError, setUpcomingPeekError] = useState(false);
  const peekRequestRef = useRef(0);
  const closeAfterUpcomingLoadRef = useRef(false);
  const previousFaceActiveBoxRef = useRef<keyof BoxesState | null>(null);
  const boxSpamRef = useRef<{
    box: keyof BoxesState | null;
    ts: number;
    count: number;
  }>({
    box: null,
    ts: 0,
    count: 0,
  });
  const queuesRef = useRef<Record<keyof BoxesState, WordWithTranslations[]>>(
    createQueues(createEmptyBoxes())
  );

  const resetSessionState = useCallback((nextBoxes: BoxesState) => {
    setBoxes(nextBoxes);
    setActiveBox(null);
    queuesRef.current = createQueues(nextBoxes);
    setSelectedItem(null);
    setQueueNext(false);
    setPeekBox(null);
    setPeekCards([]);
    setUpcomingPeekCards([]);
    setIsUpcomingPeekLoading(false);
    setUpcomingPeekError(false);
    peekRequestRef.current += 1;
    closeAfterUpcomingLoadRef.current = false;
    onSessionReset();
  }, [onSessionReset]);

  const removeCardFromSession = useCallback(
    (cardId: number, box: keyof BoxesState) => {
      setBoxes((prev) => {
        const nextState = (Object.keys(prev) as (keyof BoxesState)[]).reduce(
          (acc, boxKey) => {
            acc[boxKey] = (prev[boxKey] ?? []).filter(
              (item) => item.id !== cardId
            );
            return acc;
          },
          {} as BoxesState
        );
        const nextActive = findFirstActiveBox(nextState);
        if ((nextState[box] ?? []).length === 0 && nextActive !== box) {
          setActiveBox(nextActive);
        }
        if (nextActive == null) {
          setSelectedItem(null);
        }
        void appendDebugEvent("review", "review.card.remove", {
          screen: "review",
          courseId,
          cardId,
          fromBox: box,
        });
        void appendDebugEvent("review", "review.session_counts", {
          screen: "review",
          courseId,
          counts: summarizeBoxes(nextState),
        });
        return nextState;
      });
    },
    [courseId]
  );

  const reloadSession = useCallback(async () => {
    clearTransitionTimer();
    if (!courseId) {
      resetSessionState(createEmptyBoxes());
      return;
    }
    setIsLoading(true);
    void appendDebugEvent("review", "review.load.start", {
      screen: "review",
      courseId,
    });
    try {
      const cards = await getDueCustomReviewFlashcards(courseId);
      const mapped = cards.map(mapReviewCardToWord);
      const nextBoxes = distributeByStage(mapped);
      resetSessionState(nextBoxes);
      void appendDebugEvent("review", "review.load.success", {
        screen: "review",
        courseId,
        reviewIdsCount: mapped.length,
        counts: summarizeBoxes(nextBoxes),
      });
    } catch (err) {
      console.error("Failed to load review flashcards", err);
      resetSessionState(createEmptyBoxes());
      void appendDebugEvent("review", "review.load.error", {
        screen: "review",
        courseId,
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsLoading(false);
    }
  }, [clearTransitionTimer, courseId, resetSessionState, setIsLoading]);

  const syncQueueWithBox = useCallback(
    (box: keyof BoxesState) => {
      const boxItems = boxes[box] ?? [];
      if (boxItems.length === 0) {
        queuesRef.current[box] = [];
        return;
      }
      const allowedIds = new Set(boxItems.map((item) => item.id));
      const existing = queuesRef.current[box] ?? [];
      const trimmed = existing.filter((item) => allowedIds.has(item.id));
      const queuedIds = new Set(trimmed.map((item) => item.id));
      const newItems = boxItems.filter((item) => !queuedIds.has(item.id));
      queuesRef.current[box] = [...trimmed, ...newItems];
    },
    [boxes]
  );

  const ensureQueueHasItems = useCallback(
    (box: keyof BoxesState) => {
      const list = boxes[box];
      const queue = queuesRef.current[box] ?? [];
      if (!list || list.length === 0) {
        queuesRef.current[box] = [];
        return;
      }
      if (queue.length === 0) {
        const shuffled = [...list];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        queuesRef.current[box] = shuffled;
      }
    },
    [boxes]
  );

  const selectNextWord = useCallback(
    (box: keyof BoxesState) => {
      const list = boxes[box];
      if (!list || list.length === 0) {
        setSelectedItem(null);
        return;
      }
      syncQueueWithBox(box);
      ensureQueueHasItems(box);
      const queue = queuesRef.current[box] ?? [];
      const [next, ...rest] = queue;
      queuesRef.current[box] = rest;
      setSelectedItem(next ?? null);
    },
    [boxes, ensureQueueHasItems, syncQueueWithBox]
  );

  const handleSelectBox = useCallback(
    (box: keyof BoxesState) => {
      const currentCorrectionActive =
        typeof correctionActive === "function"
          ? correctionActive()
          : correctionActive;
      const currentIsBetweenCards =
        typeof isBetweenCards === "function"
          ? isBetweenCards()
          : isBetweenCards;
      if (isLoading || currentCorrectionActive || mistakeNudgeActive) {
        handleBlockedBoxInteraction(box);
        return;
      }
      const now = Date.now();
      const spam = boxSpamRef.current;
      const isSameBox = spam.box === box && now - spam.ts <= BOX_SPAM_WINDOW_MS;
      if (isSameBox) {
        spam.count += 1;
      } else {
        spam.box = box;
        spam.count = 1;
      }
      spam.ts = now;
      if (spam.count > BOX_SPAM_THRESHOLD) {
        handleBlockedBoxInteraction(box);
        return;
      }
      if (currentIsBetweenCards) {
        handleBlockedBoxInteraction(box);
        return;
      }
      void appendDebugEvent("review", "review.box_select", {
        screen: "review",
        courseId,
        box,
        counts: summarizeBoxes(boxes),
      });
      handleBoxFaceSelection(box);
      previousFaceActiveBoxRef.current = box;
      setActiveBox(box);
      selectNextWord(box);
    },
    [
      boxes,
      correctionActive,
      courseId,
      handleBlockedBoxInteraction,
      handleBoxFaceSelection,
      isBetweenCards,
      isLoading,
      mistakeNudgeActive,
      selectNextWord,
    ]
  );

  useEffect(() => {
    if (activeBox && previousFaceActiveBoxRef.current !== activeBox) {
      handleBoxFaceSelection(activeBox);
    }
    previousFaceActiveBoxRef.current = activeBox;
  }, [activeBox, handleBoxFaceSelection]);

  useEffect(() => {
    if (!activeBox) return;
    const currentCorrectionActive =
      typeof correctionActive === "function"
        ? correctionActive()
        : correctionActive;
    if (currentCorrectionActive) return;
    if (queueNext) {
      selectNextWord(activeBox);
      setQueueNext(false);
      return;
    }
    const list = boxes[activeBox] ?? [];
    if (!list.length) {
      setSelectedItem(null);
      return;
    }
    if (selectedItem && list.some((item) => item.id === selectedItem.id)) {
      return;
    }
    selectNextWord(activeBox);
  }, [
    activeBox,
    boxes,
    correctionActive,
    queueNext,
    selectNextWord,
    selectedItem,
  ]);

  const handleBoxLongPress = useCallback(
    (box: keyof BoxesState) => {
      const cards = boxes[box] ?? [];
      setPeekBox(box);
      setPeekCards(cards);
      setUpcomingPeekCards([]);
      setUpcomingPeekError(false);
      closeAfterUpcomingLoadRef.current = false;

      if (!courseId) {
        setIsUpcomingPeekLoading(false);
        return;
      }

      const requestId = ++peekRequestRef.current;
      setIsUpcomingPeekLoading(true);
      void getUpcomingCustomReviewFlashcards(courseId)
        .then((upcoming) => {
          if (peekRequestRef.current !== requestId) return;
          const upcomingBoxes = distributeByStage(
            upcoming.map(mapReviewCardToWord)
          );
          setUpcomingPeekCards(upcomingBoxes[box] ?? []);
        })
        .catch((error) => {
          if (peekRequestRef.current !== requestId) return;
          console.warn("Failed to load upcoming review flashcards", error);
          setUpcomingPeekError(true);
        })
        .finally(() => {
          if (peekRequestRef.current === requestId) {
            setIsUpcomingPeekLoading(false);
          }
        });
    },
    [boxes, courseId]
  );

  const closePeek = useCallback(() => {
    peekRequestRef.current += 1;
    setPeekBox(null);
    setPeekCards([]);
    setUpcomingPeekCards([]);
    setIsUpcomingPeekLoading(false);
    setUpcomingPeekError(false);
    closeAfterUpcomingLoadRef.current = false;
  }, []);

  const removePeekCard = useCallback(
    (cardId: number) => {
      const nextCards = peekCards.filter((card) => card.id !== cardId);
      const nextUpcomingCards = upcomingPeekCards.filter(
        (card) => card.id !== cardId
      );

      setPeekCards(nextCards);
      setUpcomingPeekCards(nextUpcomingCards);

      if (nextCards.length === 0 && nextUpcomingCards.length === 0) {
        if (isUpcomingPeekLoading) {
          closeAfterUpcomingLoadRef.current = true;
        } else {
          setPeekBox(null);
        }
      }
    },
    [isUpcomingPeekLoading, peekCards, upcomingPeekCards]
  );

  useEffect(() => {
    if (isUpcomingPeekLoading || !closeAfterUpcomingLoadRef.current) return;

    closeAfterUpcomingLoadRef.current = false;
    if (
      !upcomingPeekError &&
      peekCards.length === 0 &&
      upcomingPeekCards.length === 0
    ) {
      setPeekBox(null);
    }
  }, [
    isUpcomingPeekLoading,
    peekCards.length,
    upcomingPeekCards.length,
    upcomingPeekError,
  ]);

  const hasCardsInSession = Object.values(boxes).some((box) => box.length > 0);

  const getQueueForBox = useCallback(
    (box: keyof BoxesState) => queuesRef.current[box] ?? [],
    []
  );

  return {
    boxes,
    setBoxes,
    activeBox,
    setActiveBox,
    selectedItem,
    setSelectedItem,
    selectedItemId: selectedItem?.id ?? null,
    queueNext,
    setQueueNext,
    peekBox,
    peekCards,
    upcomingPeekCards,
    isUpcomingPeekLoading,
    upcomingPeekError,
    hasCardsInSession,
    reloadSession,
    resetSessionState,
    removeCardFromSession,
    syncQueueWithBox,
    ensureQueueHasItems,
    getQueueForBox,
    handleSelectBox,
    handleBoxLongPress,
    closePeek,
    removePeekCard,
    selectNextWord,
  };
};
