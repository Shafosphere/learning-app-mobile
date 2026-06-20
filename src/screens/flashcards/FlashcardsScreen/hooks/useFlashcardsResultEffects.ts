import type { QuoteTriggerRequest } from "@/src/contexts/QuoteContext";
import type { HintTutorialTriggerSource } from "@/src/screens/flashcards/FlashcardsScreen/model/FlashcardsScreen.types";
import {
    COMEBACK_COOLDOWN_MS,
    ENABLE_FLASHCARDS_SCREEN_CONSOLE_LOGS,
    HINT_COOLDOWN_MS,
    HINT_FAIL_THRESHOLD,
    HINT_TUTORIAL_FAIL_THRESHOLD,
    LONG_THINK_COOLDOWN_MS,
    LONG_THINK_MS,
    LOSS_QUOTE_COOLDOWN_MS,
    STREAK_COOLDOWN_MS,
    STREAK_TARGET,
} from "@/src/screens/flashcards/FlashcardsScreen/model/FlashcardsScreen.constants";
import { playFeedbackSound } from "@/src/utils/soundPlayer";
import type { MutableRefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

type LastTrueFalseTap = {
  cardId: number | null;
  ts: number;
  answer: boolean | null;
};

type UseFlashcardsResultEffectsParams = {
  result: boolean | null;
  selectedItemId: number | null;
  shouldHideHintsForActiveBox: boolean;
  onAnsweredForActionsPositionNudge?: () => void;
  triggerQuote: (request: QuoteTriggerRequest) => void;
  isCoachmarkActiveRef: MutableRefObject<boolean>;
  hintTutorialSeenRef: MutableRefObject<boolean>;
  requestHintTutorialRef: MutableRefObject<
    ((cardId: number, source: HintTutorialTriggerSource) => void) | null
  >;
  lastTrueFalseTapRef: MutableRefObject<LastTrueFalseTap | null>;
};

export function useFlashcardsResultEffects({
  result,
  selectedItemId,
  shouldHideHintsForActiveBox,
  onAnsweredForActionsPositionNudge,
  triggerQuote,
  isCoachmarkActiveRef,
  hintTutorialSeenRef,
  requestHintTutorialRef,
  lastTrueFalseTapRef,
}: UseFlashcardsResultEffectsParams) {
  const correctStreakRef = useRef(0);
  const wrongStreakRef = useRef(0);
  const questionStartRef = useRef<number | null>(null);
  const perCardFailRef = useRef<Record<number, number>>({});
  const hintTutorialWrongStreakRef = useRef<Record<number, number>>({});
  const handledDisplayResultEventRef = useRef<string | null>(null);
  const lastObservedResultRef = useRef<boolean | null>(null);
  const [displayResultState, setDisplayResultState] = useState<{
    cardId: number | null;
    result: boolean | null;
  }>({
    cardId: null,
    result: null,
  });

  useEffect(() => {
    const didResultChange = lastObservedResultRef.current !== result;
    lastObservedResultRef.current = result;

    if (!didResultChange && result !== null) {
      return;
    }
    if (result === null) {
      setDisplayResultState((current) =>
        current.cardId === null && current.result === null
          ? current
          : { cardId: null, result: null },
      );
      return;
    }
    if (selectedItemId != null) {
      setDisplayResultState({
        cardId: selectedItemId,
        result,
      });
    }
    onAnsweredForActionsPositionNudge?.();
  }, [onAnsweredForActionsPositionNudge, result, selectedItemId]);

  const displayResult =
    displayResultState.cardId != null &&
    displayResultState.cardId === selectedItemId
      ? displayResultState.result
      : null;

  const resultPending = result !== null;

  useEffect(() => {
    if (displayResult === null) {
      handledDisplayResultEventRef.current = null;
      return;
    }
    const resultEventKey = `${selectedItemId ?? "none"}:${displayResult}`;
    if (handledDisplayResultEventRef.current === resultEventKey) {
      return;
    }
    handledDisplayResultEventRef.current = resultEventKey;

    if (__DEV__ && ENABLE_FLASHCARDS_SCREEN_CONSOLE_LOGS) {
      const tap = lastTrueFalseTapRef.current;
      const isCurrentTap = tap?.cardId != null && tap.cardId === selectedItemId;
      console.log("[Flashcards][TF] displayResult", {
        cardId: selectedItemId,
        result: displayResult,
        elapsedFromTapMs: isCurrentTap && tap ? Date.now() - tap.ts : null,
        tappedAnswer:
          isCurrentTap && tap
            ? tap.answer === null
              ? null
              : tap.answer
                ? "true"
                : "false"
            : null,
      });
    }
    playFeedbackSound(displayResult);
    const now = Date.now();
    const elapsed = questionStartRef.current
      ? now - questionStartRef.current
      : null;

    if (displayResult === true) {
      const hadComeback = wrongStreakRef.current >= 3;
      wrongStreakRef.current = 0;
      correctStreakRef.current += 1;

      if (selectedItemId != null) {
        perCardFailRef.current[selectedItemId] = 0;
        hintTutorialWrongStreakRef.current[selectedItemId] = 0;
      }

      if (
        !isCoachmarkActiveRef.current &&
        correctStreakRef.current >= STREAK_TARGET
      ) {
        triggerQuote({
          trigger: "quote_streak",
          category: "streak",
          cooldownMs: STREAK_COOLDOWN_MS,
        });
      }

      if (!isCoachmarkActiveRef.current && hadComeback) {
        triggerQuote({
          trigger: "quote_comeback",
          category: "comeback",
          cooldownMs: COMEBACK_COOLDOWN_MS,
          probability: 0.5,
        });
      }

      const isFast = elapsed !== null && elapsed < 3000;

      if (!isCoachmarkActiveRef.current && isFast) {
        triggerQuote({
          trigger: "quote_win_fast",
          category: "win_fast",
          cooldownMs: 2 * 60 * 1000,
          probability: 0.6,
        });
      } else if (!isCoachmarkActiveRef.current) {
        triggerQuote({
          trigger: "quote_win_standard",
          category: "win_standard",
          cooldownMs: 3 * 60 * 1000,
          probability: 0.15,
        });
      }

      if (
        !isCoachmarkActiveRef.current &&
        elapsed !== null &&
        elapsed > LONG_THINK_MS
      ) {
        triggerQuote({
          trigger: "quote_long_think",
          category: "long_think",
          cooldownMs: LONG_THINK_COOLDOWN_MS,
          probability: 0.5,
        });
      }
    } else {
      correctStreakRef.current = 0;
      wrongStreakRef.current += 1;

      const cardId = selectedItemId;
      if (cardId != null) {
        const nextFailCount = (perCardFailRef.current[cardId] ?? 0) + 1;
        perCardFailRef.current[cardId] = nextFailCount;
        if (
          !isCoachmarkActiveRef.current &&
          nextFailCount >= HINT_FAIL_THRESHOLD
        ) {
          triggerQuote({
            trigger: `quote_hint_${cardId}`,
            category: "hint",
            cooldownMs: HINT_COOLDOWN_MS,
          });
          perCardFailRef.current[cardId] = 0;
        }

        const nextHintTutorialWrongStreak =
          (hintTutorialWrongStreakRef.current[cardId] ?? 0) + 1;
        hintTutorialWrongStreakRef.current[cardId] =
          nextHintTutorialWrongStreak;
        if (
          !hintTutorialSeenRef.current &&
          !shouldHideHintsForActiveBox &&
          nextHintTutorialWrongStreak >= HINT_TUTORIAL_FAIL_THRESHOLD
        ) {
          requestHintTutorialRef.current?.(cardId, "auto");
        }
      }

      if (!isCoachmarkActiveRef.current) {
        triggerQuote({
          trigger: "quote_loss_random",
          category: "loss",
          probability: 0.1,
          cooldownMs: LOSS_QUOTE_COOLDOWN_MS,
        });
      }
    }
  }, [
    displayResult,
    hintTutorialSeenRef,
    isCoachmarkActiveRef,
    lastTrueFalseTapRef,
    requestHintTutorialRef,
    selectedItemId,
    shouldHideHintsForActiveBox,
    triggerQuote,
  ]);

  const notifyQuestionStarted = useCallback(() => {
    questionStartRef.current = Date.now();
  }, []);

  return {
    displayResult,
    resultPending,
    notifyQuestionStarted,
  };
}
