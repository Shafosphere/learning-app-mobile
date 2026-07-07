import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import type { TextInput } from "react-native";

import type { CardCorrectionType } from "@/src/components/card/card-types";
import {
  advanceCustomReview,
  logCustomLearningEvent,
} from "@/src/db/sqlite/db";
import { splitFrontTextIntoAnswers } from "@/src/db/sqlite/utils";
import { appendDebugEvent } from "@/src/services/debugEvents";
import type { BoxesState, WordWithTranslations } from "@/src/types/boxes";
import { normalizeAnswerText } from "@/src/utils/answerNormalization";
import { getCorrectionFieldRequirements } from "@/src/utils/correctionFields";
import { stripDiacritics } from "@/src/utils/diacritics";
import { getExplanationState } from "@/src/utils/explanationState";
import { playFeedbackSound } from "@/src/utils/soundPlayer";

import { LONG_THINK_MS } from "../model/reviewFlashcards.constants";
import type { ReviewPendingExplanationMove } from "../model/reviewFlashcards.types";
import { stageToBox } from "../utils/reviewFlashcards.utils";

type EnqueueReviewMutation = <T>(
  cardId: number,
  operation: () => Promise<T>
) => Promise<T>;

type UseReviewFlashcardsAnswerFlowParams = {
  courseId: number | null;
  selectedItem: WordWithTranslations | null;
  activeBox: keyof BoxesState | null;
  boxes: BoxesState;
  setBoxes: Dispatch<SetStateAction<BoxesState>>;
  setActiveBox: Dispatch<SetStateAction<keyof BoxesState | null>>;
  setQueueNext: (value: boolean) => void;
  removeCardFromSession: (cardId: number, box: keyof BoxesState) => void;
  enqueueReviewMutation: EnqueueReviewMutation;
  checkSpelling: (input: string, expected: string) => boolean;
  ignoreDiacriticsInSpellcheck: boolean;
  showExplanationEnabled: boolean;
  explanationOnlyOnWrong: boolean;
  learningRemindersEnabled: boolean;
  cancelTodayLearningReminderSchedule: (reason: "review_completed") => void;
  queueMistakeNudgeCheck: (
    card: WordWithTranslations,
    box: keyof BoxesState,
    logCompleted: Promise<boolean>
  ) => void;
  finalizeWrongReviewCard: (
    card: WordWithTranslations,
    box: keyof BoxesState
  ) => Promise<void>;
  mistakeNudgeActive: boolean;
  handleBoxFaceCorrectAnswer: (
    box: keyof BoxesState,
    options?: { preferLove?: boolean }
  ) => void;
  handleBoxFaceWrongAnswer: (box: keyof BoxesState) => void;
  handleStatsBurst: (
    boxKey: keyof BoxesState,
    logLearningEventPromise: Promise<void>
  ) => void;
  setShouldCelebrate: Dispatch<SetStateAction<boolean>>;
  keyboardBridgeInputRef?: RefObject<TextInput | null>;
};

export const useReviewFlashcardsAnswerFlow = ({
  courseId,
  selectedItem,
  activeBox,
  boxes,
  setBoxes,
  setActiveBox,
  setQueueNext,
  removeCardFromSession,
  enqueueReviewMutation,
  checkSpelling,
  ignoreDiacriticsInSpellcheck,
  showExplanationEnabled,
  explanationOnlyOnWrong,
  learningRemindersEnabled,
  cancelTodayLearningReminderSchedule,
  queueMistakeNudgeCheck,
  finalizeWrongReviewCard,
  mistakeNudgeActive,
  handleBoxFaceCorrectAnswer,
  handleBoxFaceWrongAnswer,
  handleStatsBurst,
  setShouldCelebrate,
  keyboardBridgeInputRef,
}: UseReviewFlashcardsAnswerFlowParams) => {
  const [questionShownAt, setQuestionShownAt] = useState<number | null>(null);
  const [longThink, setLongThink] = useState(false);
  const [isBetweenCards, setIsBetweenCards] = useState(false);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<boolean | null>(null);
  const [correction, setCorrection] = useState<CardCorrectionType | null>(null);
  const [pendingExplanationMove, setPendingExplanationMove] =
    useState<ReviewPendingExplanationMove>(null);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTransitionTimer = useCallback(() => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
  }, []);

  const resetAnswerFlow = useCallback(() => {
    setQuestionShownAt(null);
    setLongThink(false);
    setIsBetweenCards(false);
    setAnswer("");
    setResult(null);
    setCorrection(null);
    setPendingExplanationMove(null);
    clearTransitionTimer();
  }, [clearTransitionTimer]);

  const reversed = selectedItem?.flipped ?? false;
  const answerOnly =
    (selectedItem?.answerOnly ?? false) ||
    (!selectedItem?.text?.trim() &&
      Boolean(selectedItem?.imageFront || selectedItem?.imageBack)) ||
    selectedItem?.type === "true_false" ||
    selectedItem?.type === "know_dont_know";
  const effectiveReversed = answerOnly ? false : reversed;
  const displayResult = result;

  const matchesCorrectionField = useCallback(
    (input: string, expected: string) =>
      normalizeAnswerText(input, ignoreDiacriticsInSpellcheck) ===
      normalizeAnswerText(expected, ignoreDiacriticsInSpellcheck),
    [ignoreDiacriticsInSpellcheck],
  );

  const matchesAnyCorrectionField = useCallback(
    (input: string, expectedValues: readonly string[]) =>
      expectedValues.some((expected) => matchesCorrectionField(input, expected)),
    [matchesCorrectionField],
  );

  const completeSuccessfulReview = useCallback(
    (card: WordWithTranslations, box: keyof BoxesState) => {
      if (!courseId) return;
      void (async () => {
        try {
          void appendDebugEvent("review", "review.advance", {
            screen: "review",
            courseId,
            cardId: card.id,
            fromBox: box,
          });
          await enqueueReviewMutation(card.id, () =>
            advanceCustomReview(card.id, courseId)
          );
        } catch (error) {
          console.error("Failed to advance custom review", error);
          setBoxes((prev) => {
            const current = prev[box] ?? [];
            if (current.some((item) => item.id === card.id)) {
              return prev;
            }
            return {
              ...prev,
              [box]: [card, ...current],
            };
          });
          setActiveBox((current) => current ?? box);
        }
      })();
    },
    [courseId, enqueueReviewMutation, setActiveBox, setBoxes],
  );

  const finishCardTransition = useCallback(
    (durationMs: number, finish: () => void) => {
      transitionTimerRef.current = setTimeout(() => {
        finish();
        setAnswer("");
        setResult(null);
        transitionTimerRef.current = null;
        setQueueNext(true);
        setIsBetweenCards(true);
        setTimeout(() => setIsBetweenCards(false), 300);
      }, durationMs);
    },
    [setQueueNext],
  );

  const acknowledgeExplanation = useCallback(() => {
    if (!selectedItem || !activeBox) return;
    if (
      pendingExplanationMove &&
      pendingExplanationMove.cardId === selectedItem.id &&
      result !== null
    ) {
      if (pendingExplanationMove.promote) {
        completeSuccessfulReview(selectedItem, activeBox);
        removeCardFromSession(selectedItem.id, activeBox);
        setPendingExplanationMove(null);
        setAnswer("");
        setResult(null);
        setQueueNext(true);
        setIsBetweenCards(true);
        setTimeout(() => setIsBetweenCards(false), 300);
        return;
      }
      void finalizeWrongReviewCard(selectedItem, activeBox);
    }
  }, [
    activeBox,
    completeSuccessfulReview,
    finalizeWrongReviewCard,
    pendingExplanationMove,
    removeCardFromSession,
    result,
    selectedItem,
    setQueueNext,
  ]);

  useEffect(() => {
    return () => {
      clearTransitionTimer();
    };
  }, [clearTransitionTimer]);

  useEffect(() => {
    if (!correction || !activeBox || !courseId) return;
    if (transitionTimerRef.current) return;

    const correctionFieldRequirements =
      getCorrectionFieldRequirements(correction);
    const expectsAwersInput = correctionFieldRequirements.awers;
    const expectsRewersInput = correctionFieldRequirements.rewers;
    const awersOk =
      !expectsAwersInput ||
      matchesAnyCorrectionField(
        correction.input1,
        correction.awersAlternatives?.length
          ? correction.awersAlternatives
          : [correction.awers],
      );
    const rewersOk =
      !expectsRewersInput ||
      matchesCorrectionField(correction.input2 ?? "", correction.rewers);

    if (!(awersOk && rewersOk)) return;
    if (!correction.cardId) return;

    keyboardBridgeInputRef?.current?.focus();
    const card =
      correction.word ??
      Object.values(boxes)
        .flat()
        .find((item) => item.id === correction.cardId) ??
      null;
    const explanationState = getExplanationState({
      selectedItem: selectedItem ?? card ?? null,
      result: false,
      showExplanationEnabled,
      explanationOnlyOnWrong,
    });
    if (explanationState.isExplanationPending) {
      setPendingExplanationMove({
        cardId: correction.cardId,
        promote: false,
      });
      setCorrection(null);
      setResult(false);
      setAnswer("");
      return;
    }
    setCorrection(null);
    setResult(null);
    setAnswer("");
    setPendingExplanationMove(null);
    const resolvedCard = card ?? correction.word ?? selectedItem;
    if (!resolvedCard) return;
    void finalizeWrongReviewCard(resolvedCard, activeBox);
  }, [
    activeBox,
    boxes,
    correction,
    courseId,
    explanationOnlyOnWrong,
    finalizeWrongReviewCard,
    keyboardBridgeInputRef,
    matchesAnyCorrectionField,
    matchesCorrectionField,
    selectedItem,
    showExplanationEnabled,
  ]);

  useEffect(() => {
    if (correction) {
      setQuestionShownAt(selectedItem ? Date.now() : null);
      setLongThink(false);
      return;
    }
    setResult(null);
    setAnswer("");
    setCorrection(null);
    setPendingExplanationMove(null);
    setQuestionShownAt(selectedItem ? Date.now() : null);
    setLongThink(false);
  }, [correction, selectedItem]);

  useEffect(() => {
    if (!selectedItem) return;
    if (result !== null) return;
    if (!questionShownAt) return;
    const elapsed = Date.now() - questionShownAt;
    if (elapsed < LONG_THINK_MS) return;
    if (longThink) return;
    setLongThink(true);
    setIsBetweenCards(true);
    setTimeout(() => setIsBetweenCards(false), 400);
  }, [longThink, questionShownAt, result, selectedItem]);

  const wrongInputChange = useCallback((which: 1 | 2, value: string) => {
    setCorrection((current) =>
      current
        ? {
            ...current,
            [which === 1 ? "input1" : "input2"]: value,
          }
        : current,
    );
  }, []);

  const setCorrectionReversed = useCallback((value: string) => {
    setCorrection((current) =>
      current ? { ...current, rewers: value } : current,
    );
  }, []);

  const handleConfirm = useCallback((
    _selectedTranslation?: string,
    answerOverride?: string,
  ) => {
    if (!selectedItem || !activeBox || !courseId || mistakeNudgeActive) return;
    clearTransitionTimer();
    if (
      pendingExplanationMove &&
      pendingExplanationMove.cardId === selectedItem.id &&
      result !== null
    ) {
      acknowledgeExplanation();
      return;
    }
    const userAnswer = (answerOverride ?? answer).trim();
    const isKnowDontKnow = selectedItem.type === "know_dont_know";
    const ok = isKnowDontKnow
      ? userAnswer.toLowerCase() === "true"
      : userAnswer.length > 0 &&
        (effectiveReversed
          ? splitFrontTextIntoAnswers(selectedItem.text).some((frontAnswer) =>
              checkSpelling(userAnswer, frontAnswer),
            )
          : (selectedItem.translations ?? []).some((translation) =>
              checkSpelling(userAnswer, translation),
            ));

    setResult(ok);
    playFeedbackSound(ok);

    const currentBox =
      selectedItem.stage != null ? stageToBox(selectedItem.stage) : activeBox;
    const durationMs =
      questionShownAt != null
        ? Math.max(0, Date.now() - questionShownAt)
        : undefined;
    const logAttemptEvent = (resultValue: "ok" | "wrong") =>
      logCustomLearningEvent({
        flashcardId: selectedItem.id,
        courseId,
        box: currentBox,
        result: resultValue,
        durationMs,
      });

    if (!ok) {
      const wrongLogPromise = logAttemptEvent("wrong")
        .then(() => true)
        .catch((error) => {
          console.warn("[Review] Failed to log learning event", error);
          return false;
        });
      queueMistakeNudgeCheck(selectedItem, currentBox, wrongLogPromise);
      void appendDebugEvent("review", "review.answer.wrong", {
        screen: "review",
        courseId,
        cardId: selectedItem.id,
        fromBox: currentBox,
        durationMs: durationMs ?? 0,
      });
      handleBoxFaceWrongAnswer(activeBox);
      void wrongLogPromise;
      const wrongExplanationState = getExplanationState({
        selectedItem,
        result: false,
        showExplanationEnabled,
        explanationOnlyOnWrong,
      });
      if (isKnowDontKnow || selectedItem.type === "true_false") {
        if (wrongExplanationState.isExplanationPending) {
          setPendingExplanationMove({
            cardId: selectedItem.id,
            promote: false,
          });
          return;
        }
        const delayMs = wrongExplanationState.hasExplanation ? 3500 : 1500;
        transitionTimerRef.current = setTimeout(() => {
          void finalizeWrongReviewCard(selectedItem, activeBox);
          setAnswer("");
          setResult(null);
          transitionTimerRef.current = null;
          setIsBetweenCards(true);
          setTimeout(() => setIsBetweenCards(false), 300);
        }, delayMs);
        return;
      }
      const frontAnswers = splitFrontTextIntoAnswers(selectedItem.text);
      const primaryFrontAnswer = frontAnswers[0] ?? selectedItem.text;

      setCorrection({
        cardId: selectedItem.id,
        awers: primaryFrontAnswer,
        awersAlternatives: frontAnswers,
        rewers: selectedItem.translations[0] ?? "",
        input1: "",
        input2: "",
        answerOnly,
        mode: "demote",
        promptText: effectiveReversed
          ? selectedItem.translations[0] ?? ""
          : primaryFrontAnswer,
        promptImageUri: effectiveReversed
          ? selectedItem.imageBack ?? null
          : selectedItem.imageFront ?? null,
        reversed: effectiveReversed,
        word: selectedItem,
      });
      return;
    }

    const logLearningEventPromise = logAttemptEvent("ok").catch((error) => {
      console.warn("[Review] Failed to log learning event", error);
    });
    if (learningRemindersEnabled) {
      void logLearningEventPromise.then(() =>
        cancelTodayLearningReminderSchedule("review_completed")
      );
    }
    void appendDebugEvent("review", "review.answer.correct", {
      screen: "review",
      courseId,
      cardId: selectedItem.id,
      fromBox: currentBox,
      durationMs: durationMs ?? 0,
      isTerminalSuccess: activeBox === "boxFive",
    });
    handleStatsBurst(currentBox, logLearningEventPromise);
    handleBoxFaceCorrectAnswer(activeBox, {
      preferLove: activeBox === "boxFour" || activeBox === "boxFive",
    });
    const isPerfect = (() => {
      const normalizeStrict = (value: string) =>
        stripDiacritics(value.trim().toLowerCase());
      const normalizedUser = normalizeStrict(answer);
      if (effectiveReversed) {
        return splitFrontTextIntoAnswers(selectedItem.text).some(
          (frontAnswer) => normalizedUser === normalizeStrict(frontAnswer),
        );
      }
      return (selectedItem.translations ?? []).some(
        (translation) => normalizedUser === normalizeStrict(translation),
      );
    })();
    const correctExplanationState = getExplanationState({
      selectedItem,
      result: true,
      showExplanationEnabled,
      explanationOnlyOnWrong,
    });
    const hasExplanation = correctExplanationState.hasExplanation;
    if (correctExplanationState.isExplanationPending) {
      setPendingExplanationMove({
        cardId: selectedItem.id,
        promote: true,
      });
      setResult(true);
      return;
    }
    const delayMs = isKnowDontKnow
      ? hasExplanation ? 3500 : 1500
      : isPerfect ? 1500 : 3000;
    if (activeBox === "boxFive") {
      setShouldCelebrate(false);
      requestAnimationFrame(() => setShouldCelebrate(true));
    }

    completeSuccessfulReview(selectedItem, activeBox);
    finishCardTransition(delayMs, () => {
      removeCardFromSession(selectedItem.id, activeBox);
    });
  }, [
    acknowledgeExplanation,
    activeBox,
    answer,
    answerOnly,
    cancelTodayLearningReminderSchedule,
    checkSpelling,
    clearTransitionTimer,
    completeSuccessfulReview,
    courseId,
    effectiveReversed,
    explanationOnlyOnWrong,
    finalizeWrongReviewCard,
    finishCardTransition,
    handleBoxFaceCorrectAnswer,
    handleBoxFaceWrongAnswer,
    handleStatsBurst,
    learningRemindersEnabled,
    mistakeNudgeActive,
    pendingExplanationMove,
    questionShownAt,
    queueMistakeNudgeCheck,
    removeCardFromSession,
    result,
    selectedItem,
    setShouldCelebrate,
    showExplanationEnabled,
  ]);

  const showCorrectionInputs = Boolean(correction && result === false);
  const { isExplanationVisible, isExplanationPending } = getExplanationState({
    selectedItem,
    result,
    showCorrectionInputs,
    showExplanationEnabled,
    explanationOnlyOnWrong,
  });
  return {
    answer,
    setAnswer,
    result,
    setResult,
    displayResult,
    correction,
    wrongInputChange,
    setCorrectionReversed,
    questionShownAt,
    longThink,
    isBetweenCards,
    setIsBetweenCards,
    reversed,
    effectiveReversed,
    showExplanationEnabled,
    explanationOnlyOnWrong,
    isExplanationVisible,
    isExplanationPending,
    pendingExplanationMove,
    setPendingExplanationMove,
    handleConfirm,
    acknowledgeExplanation,
    resetAnswerFlow,
    clearTransitionTimer,
  };
};
