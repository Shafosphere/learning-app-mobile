import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import {
  getCustomFlashcardConsecutiveWrongCount,
  scheduleCustomReview,
} from "@/src/db/sqlite/db";
import { appendDebugEvent } from "@/src/services/debugEvents";
import { returnFlashcardToUnknown } from "@/src/services/returnFlashcardToUnknown";
import type { BoxesState, WordWithTranslations } from "@/src/types/boxes";

import type {
  ReviewMistakeNudgeCandidate,
  ReviewMistakeNudgeState,
  ReviewPendingExplanationMove,
} from "../model/reviewFlashcards.types";

type UseReviewMistakeNudgeParams = {
  courseId: number | null;
  enqueueReviewMutation: <T>(
    cardId: number,
    operation: () => Promise<T>
  ) => Promise<T>;
  removeCardFromSession: (cardId: number, box: keyof BoxesState) => void;
  setAnswer: (value: string) => void;
  setResult: (value: boolean | null) => void;
  setQueueNext: (value: boolean) => void;
  setIsBetweenCards: (value: boolean) => void;
  setPendingExplanationMove: Dispatch<
    SetStateAction<ReviewPendingExplanationMove>
  >;
};

export const useReviewMistakeNudge = ({
  courseId,
  enqueueReviewMutation,
  removeCardFromSession,
  setAnswer,
  setResult,
  setQueueNext,
  setIsBetweenCards,
  setPendingExplanationMove,
}: UseReviewMistakeNudgeParams) => {
  const [mistakeNudge, setMistakeNudge] =
    useState<ReviewMistakeNudgeState | null>(null);
  const pendingMistakeNudgeRef = useRef(
    new Map<number, Promise<ReviewMistakeNudgeCandidate | null>>()
  );

  useEffect(() => {
    const pendingMistakeNudges = pendingMistakeNudgeRef.current;
    pendingMistakeNudges.clear();
    return () => {
      pendingMistakeNudges.clear();
    };
  }, [courseId]);

  const queueMistakeNudgeCheck = useCallback(
    (
      card: WordWithTranslations,
      box: keyof BoxesState,
      logCompleted: Promise<boolean>
    ) => {
      if (!courseId) return;
      const candidatePromise = logCompleted
        .then(async (logged) => {
          if (!logged) return null;
          const wrongStreak = await getCustomFlashcardConsecutiveWrongCount(
            card.id,
            courseId
          );
          if (wrongStreak > 0 && wrongStreak % 3 === 0) {
            return { card, box, wrongStreak };
          }
          return null;
        })
        .catch((error) => {
          console.warn("[Review] Failed to check wrong answer streak", error);
          return null;
        });
      pendingMistakeNudgeRef.current.set(card.id, candidatePromise);
    },
    [courseId]
  );

  const consumeMistakeNudgeCandidate = useCallback(async (cardId: number) => {
    const candidatePromise = pendingMistakeNudgeRef.current.get(cardId);
    if (!candidatePromise) return null;
    try {
      return await candidatePromise;
    } finally {
      if (pendingMistakeNudgeRef.current.get(cardId) === candidatePromise) {
        pendingMistakeNudgeRef.current.delete(cardId);
      }
    }
  }, []);

  const demoteAndRemoveReviewCard = useCallback(
    (card: WordWithTranslations, box: keyof BoxesState) => {
      if (!courseId) return;
      void (async () => {
        try {
          void appendDebugEvent("review", "review.demote", {
            screen: "review",
            courseId,
            cardId: card.id,
            fromBox: box,
          });
          await enqueueReviewMutation(card.id, () =>
            scheduleCustomReview(card.id, courseId, 0)
          );
        } catch (error) {
          console.error("Failed to demote review card", error);
        }
      })();

      removeCardFromSession(card.id, box);
      setPendingExplanationMove(null);
      setAnswer("");
      setResult(null);
      setQueueNext(true);
      setIsBetweenCards(true);
      setTimeout(() => setIsBetweenCards(false), 300);
    },
    [
      courseId,
      enqueueReviewMutation,
      removeCardFromSession,
      setAnswer,
      setIsBetweenCards,
      setPendingExplanationMove,
      setQueueNext,
      setResult,
    ]
  );

  const finalizeWrongReviewCard = useCallback(
    async (card: WordWithTranslations, box: keyof BoxesState) => {
      const candidate = await consumeMistakeNudgeCandidate(card.id);
      if (candidate) {
        setMistakeNudge({ ...candidate, confirming: false, error: false });
        setPendingExplanationMove(null);
        setAnswer("");
        setResult(false);
        setIsBetweenCards(false);
        return;
      }
      demoteAndRemoveReviewCard(card, box);
    },
    [
      consumeMistakeNudgeCandidate,
      demoteAndRemoveReviewCard,
      setAnswer,
      setIsBetweenCards,
      setPendingExplanationMove,
      setResult,
    ]
  );

  const handleKeepReviewingAfterMistakeNudge = useCallback(() => {
    if (!mistakeNudge || mistakeNudge.confirming) return;
    const { card, box } = mistakeNudge;
    setMistakeNudge(null);
    demoteAndRemoveReviewCard(card, box);
  }, [demoteAndRemoveReviewCard, mistakeNudge]);

  const handleReturnMistakeNudgeToUnknown = useCallback(async () => {
    if (!mistakeNudge) return;
    if (mistakeNudge.preview || !courseId) {
      setMistakeNudge(null);
      return;
    }
    const { card, box } = mistakeNudge;
    setMistakeNudge((current) =>
      current ? { ...current, confirming: true, error: false } : current
    );
    try {
      await enqueueReviewMutation(card.id, () =>
        returnFlashcardToUnknown({ courseId, flashcardId: card.id })
      );
      removeCardFromSession(card.id, box);
      setMistakeNudge(null);
      setPendingExplanationMove(null);
      setAnswer("");
      setResult(null);
      setQueueNext(true);
      setIsBetweenCards(true);
      setTimeout(() => setIsBetweenCards(false), 300);
    } catch (error) {
      console.warn("[Review] Failed to return mistake nudge card to unknown", error);
      setMistakeNudge((current) =>
        current ? { ...current, confirming: false, error: true } : current
      );
    }
  }, [
    courseId,
    enqueueReviewMutation,
    mistakeNudge,
    removeCardFromSession,
    setAnswer,
    setIsBetweenCards,
    setPendingExplanationMove,
    setQueueNext,
    setResult,
  ]);

  return {
    mistakeNudge,
    setMistakeNudge,
    queueMistakeNudgeCheck,
    finalizeWrongReviewCard,
    handleKeepReviewingAfterMistakeNudge,
    handleReturnMistakeNudgeToUnknown,
  };
};
