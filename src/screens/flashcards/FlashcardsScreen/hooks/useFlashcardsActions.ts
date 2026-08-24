import type { TFunction } from "i18next";
import type { MutableRefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CorrectionState } from "@/src/hooks/useFlashcardsInteraction";
import type { WordWithTranslations } from "@/src/types/boxes";
import {
  ENABLE_FLASHCARDS_SCREEN_CONSOLE_LOGS,
  TRUE_FALSE_POST_OK_COOLDOWN_MS,
} from "../model/FlashcardsScreen.constants";

type LastTrueFalseTap = {
  cardId: number | null;
  ts: number;
  answer: boolean | null;
};

type UseFlashcardActionBarStateParams = {
  selectedItem: WordWithTranslations | null;
  selectedItemId: number | null;
  answer?: string;
  displayResult: boolean | null;
  isBetweenCards: boolean;
  correction: CorrectionState | null | unknown;
  courseHasOnlyTrueFalse: boolean;
  courseHasOnlyKnowDontKnow: boolean;
  isKnowDontKnow: boolean;
  downloadDisabled?: boolean;
  externalActionLocked?: boolean;
  shouldShowBoxes: boolean;
  isExplanationVisible: boolean;
  isExplanationPending: boolean;
  setAnswer: (answer: string) => void;
  onConfirm: (
    selectedTranslation?: string,
    answerOverride?: string,
  ) => void;
  canConfirm?: () => boolean;
  onOk: () => void;
  lastTrueFalseTapRef?: MutableRefObject<LastTrueFalseTap | null>;
  lastActionCooldownCardIdRef?: MutableRefObject<number | null>;
  t: TFunction;
};

export function useFlashcardActionBarState({
  selectedItem,
  selectedItemId,
  answer = "",
  displayResult,
  isBetweenCards,
  correction,
  courseHasOnlyTrueFalse,
  courseHasOnlyKnowDontKnow,
  isKnowDontKnow,
  downloadDisabled = false,
  externalActionLocked = false,
  shouldShowBoxes,
  isExplanationVisible,
  isExplanationPending,
  setAnswer,
  onConfirm,
  canConfirm = () => true,
  onOk,
  lastTrueFalseTapRef: providedLastTrueFalseTapRef,
  lastActionCooldownCardIdRef: providedLastActionCooldownCardIdRef,
  t,
}: UseFlashcardActionBarStateParams) {
  const [isActionCooldownActive, setIsActionCooldownActive] = useState(false);
  const [emptyAnswerSubmitWarning, setEmptyAnswerSubmitWarning] = useState(false);
  const [selectedTrueFalseUiState, setSelectedTrueFalseUiState] = useState<{
    cardId: number | null;
    answer: boolean | null;
  }>({
    cardId: null,
    answer: null,
  });
  const actionCooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const internalLastTrueFalseTapRef = useRef<LastTrueFalseTap | null>(null);
  const internalLastActionCooldownCardIdRef = useRef<number | null>(null);
  const lastTrueFalseTapRef =
    providedLastTrueFalseTapRef ?? internalLastTrueFalseTapRef;
  const lastActionCooldownCardIdRef =
    providedLastActionCooldownCardIdRef ?? internalLastActionCooldownCardIdRef;

  const selectedTrueFalseAnswer =
    selectedTrueFalseUiState.cardId === selectedItemId
      ? selectedTrueFalseUiState.answer
      : null;

  useEffect(() => {
    if (answer.trim().length > 0 && emptyAnswerSubmitWarning) {
      if (__DEV__ && ENABLE_FLASHCARDS_SCREEN_CONSOLE_LOGS) {
        console.log("[Flashcards][Confirm] warning cleared by typing", {
          cardId: selectedItemId,
        });
      }
      setEmptyAnswerSubmitWarning(false);
    }
  }, [answer, emptyAnswerSubmitWarning, selectedItemId]);

  useEffect(() => {
    setEmptyAnswerSubmitWarning(false);
    if (__DEV__ && ENABLE_FLASHCARDS_SCREEN_CONSOLE_LOGS) {
      console.log("[Flashcards][Confirm] warning reset", {
        cardId: selectedItemId,
        correctionActive: Boolean(correction),
      });
    }
  }, [correction, selectedItemId]);

  const canSubmitAnswer = useCallback(
    (answerOverride?: string) => {
      const effectiveAnswer = answerOverride ?? answer;
      const hasAnswer = effectiveAnswer.trim().length > 0;

      if (__DEV__ && ENABLE_FLASHCARDS_SCREEN_CONSOLE_LOGS) {
        console.log("[Flashcards][Confirm] empty-answer check", {
          cardId: selectedItemId,
          answerLength: effectiveAnswer.length,
          hasAnswer,
          warningShown: emptyAnswerSubmitWarning,
          answerOverridden: answerOverride != null,
        });
      }

      if (hasAnswer) {
        return true;
      }
      if (!emptyAnswerSubmitWarning) {
        if (__DEV__ && ENABLE_FLASHCARDS_SCREEN_CONSOLE_LOGS) {
          console.log("[Flashcards][Confirm] blocked: first empty submit", {
            cardId: selectedItemId,
          });
        }
        setEmptyAnswerSubmitWarning(true);
        return false;
      }
      if (__DEV__ && ENABLE_FLASHCARDS_SCREEN_CONSOLE_LOGS) {
        console.log("[Flashcards][Confirm] allowed: second empty submit", {
          cardId: selectedItemId,
        });
      }
      return true;
    },
    [answer, emptyAnswerSubmitWarning, selectedItemId],
  );

  useEffect(() => {
    if (selectedItemId == null) {
      lastActionCooldownCardIdRef.current = null;
      setIsActionCooldownActive((prev) => (prev ? false : prev));
      if (actionCooldownTimerRef.current) {
        clearTimeout(actionCooldownTimerRef.current);
        actionCooldownTimerRef.current = null;
      }
      return;
    }
    if (lastActionCooldownCardIdRef.current === selectedItemId) return;
    lastActionCooldownCardIdRef.current = selectedItemId;
    setIsActionCooldownActive((prev) => (prev ? prev : true));
    if (actionCooldownTimerRef.current) {
      clearTimeout(actionCooldownTimerRef.current);
    }
    actionCooldownTimerRef.current = setTimeout(() => {
      setIsActionCooldownActive(false);
      actionCooldownTimerRef.current = null;
    }, TRUE_FALSE_POST_OK_COOLDOWN_MS);
  }, [lastActionCooldownCardIdRef, selectedItemId]);

  useEffect(() => {
    setSelectedTrueFalseUiState((current) => {
      if (current.cardId === selectedItemId && current.answer === null) {
        return current;
      }
      return {
        cardId: selectedItemId,
        answer: null,
      };
    });
  }, [selectedItemId]);

  useEffect(() => {
    return () => {
      if (actionCooldownTimerRef.current) {
        clearTimeout(actionCooldownTimerRef.current);
      }
    };
  }, []);

  const isImmediateActionLockActive =
    selectedItemId != null &&
    lastActionCooldownCardIdRef.current !== selectedItemId;

  const handleTrueFalseAnswer = useCallback(
    (value: boolean) => {
      const locked =
        isExplanationPending ||
        displayResult !== null ||
        isBetweenCards ||
        isActionCooldownActive ||
        isImmediateActionLockActive ||
        externalActionLocked;
      if (locked) return;
      const tapTs = Date.now();
      lastTrueFalseTapRef.current = {
        cardId: selectedItemId,
        ts: tapTs,
        answer: value,
      };
      if (__DEV__ && ENABLE_FLASHCARDS_SCREEN_CONSOLE_LOGS) {
        console.log("[Flashcards][TF] tap", {
          cardId: selectedItemId,
          answer: value ? "true" : "false",
          isActionCooldownActive,
          isBetweenCards,
          displayResult,
          tapTs,
        });
      }
      const choice = value ? "true" : "false";
      setSelectedTrueFalseUiState({
        cardId: selectedItemId,
        answer: value,
      });
      setAnswer(choice);
      onConfirm(choice, choice);
    },
    [
      displayResult,
      externalActionLocked,
      isActionCooldownActive,
      isBetweenCards,
      isExplanationPending,
      isImmediateActionLockActive,
      lastTrueFalseTapRef,
      onConfirm,
      selectedItemId,
      setAnswer,
    ],
  );

  const handleTrueFalseOk = useCallback(() => {
    if (
      isBetweenCards ||
      isActionCooldownActive ||
      isImmediateActionLockActive ||
      externalActionLocked
    ) {
      return;
    }
    onOk();
  }, [
    externalActionLocked,
    isActionCooldownActive,
    isBetweenCards,
    isImmediateActionLockActive,
    onOk,
  ]);

  const shouldUseTrueFalseActionBar =
    courseHasOnlyTrueFalse ||
    selectedItem?.type === "true_false" ||
    isKnowDontKnow;
  const shouldShowTrueFalseActions =
    shouldUseTrueFalseActionBar && shouldShowBoxes && !correction;
  const trueFalseActionsMode: "answer" | "ok" =
    isExplanationPending && shouldUseTrueFalseActionBar ? "ok" : "answer";
  const trueFalseActionsDisabled = isExplanationPending
    ? isBetweenCards ||
      isActionCooldownActive ||
      isImmediateActionLockActive ||
      externalActionLocked
    : displayResult !== null ||
      isBetweenCards ||
      isActionCooldownActive ||
      isImmediateActionLockActive ||
      externalActionLocked;
  const showCardActions = !(
    courseHasOnlyTrueFalse ||
    shouldShowTrueFalseActions ||
    selectedItem?.type === "true_false" ||
    isKnowDontKnow
  );

  const handleCardActionsConfirm = useCallback(() => {
    if (__DEV__ && ENABLE_FLASHCARDS_SCREEN_CONSOLE_LOGS) {
      console.log("[Flashcards][Confirm] card actions pressed", {
        cardId: selectedItemId,
        isExplanationVisible,
        isActionCooldownActive,
        isImmediateActionLockActive,
        externalActionLocked,
      });
    }
    if (
      isActionCooldownActive ||
      isImmediateActionLockActive ||
      externalActionLocked
    ) {
      return;
    }
    if (isExplanationVisible) {
      handleTrueFalseOk();
      return;
    }
    // Keep the bottom action button aligned with the card-input submit path:
    // a transition-guarded tap must not consume the first empty submit.
    if (!canConfirm()) return;
    if (!canSubmitAnswer()) return;
    if (__DEV__ && ENABLE_FLASHCARDS_SCREEN_CONSOLE_LOGS) {
      console.log("[Flashcards][Confirm] calling onConfirm from card actions", {
        cardId: selectedItemId,
      });
    }
    onConfirm();
  }, [
    externalActionLocked,
    handleTrueFalseOk,
    isActionCooldownActive,
    canSubmitAnswer,
    canConfirm,
    isExplanationVisible,
    isImmediateActionLockActive,
    onConfirm,
    selectedItemId,
  ]);

  const handleCardConfirm = useCallback(
    (selectedTranslation?: string, answerOverride?: string) => {
      if (__DEV__ && ENABLE_FLASHCARDS_SCREEN_CONSOLE_LOGS) {
        console.log("[Flashcards][Confirm] confirm pressed", {
          cardId: selectedItemId,
          isActionCooldownActive,
          isImmediateActionLockActive,
          externalActionLocked,
          answerOverridden: answerOverride != null,
        });
      }
      if (
        isActionCooldownActive ||
        isImmediateActionLockActive ||
        externalActionLocked
      ) {
        return false;
      }
      // Do not consume the first empty submit while the interaction guard is
      // still blocking confirmations after a card transition. Otherwise the
      // next tap can be rejected by onConfirm and a third tap is required.
      if (!canConfirm()) return false;
      if (!canSubmitAnswer(answerOverride)) return false;
      if (__DEV__ && ENABLE_FLASHCARDS_SCREEN_CONSOLE_LOGS) {
        console.log("[Flashcards][Confirm] calling onConfirm", {
          cardId: selectedItemId,
          answerOverridden: answerOverride != null,
        });
      }
      onConfirm(selectedTranslation, answerOverride);
      return true;
    },
    [
      externalActionLocked,
      canSubmitAnswer,
      canConfirm,
      isActionCooldownActive,
      isImmediateActionLockActive,
      onConfirm,
      selectedItemId,
    ],
  );

  const cardActionsDownloadDisabled =
    downloadDisabled ||
    isExplanationVisible ||
    isActionCooldownActive ||
    isImmediateActionLockActive ||
    externalActionLocked;
  const cardActionsConfirmDisabled =
    isActionCooldownActive || isImmediateActionLockActive || externalActionLocked;
  const cardActionsConfirmLabel = isExplanationVisible
    ? t("flashcards.card.actions.ok")
    : t("flashcards.card.actions.confirm");
  const effectiveTrueFalseButtonsVariant: "true_false" | "know_dont_know" =
    isKnowDontKnow || selectedItem?.answerOnly || courseHasOnlyKnowDontKnow
      ? "know_dont_know"
      : "true_false";

  return {
    selectedTrueFalseAnswer,
    isActionCooldownActive,
    isImmediateActionLockActive,
    handleTrueFalseAnswer,
    handleTrueFalseOk,
    trueFalseActionsMode,
    trueFalseActionsDisabled,
    shouldShowTrueFalseActions,
    showCardActions,
    handleCardActionsConfirm,
    handleCardConfirm,
    cardActionsDownloadDisabled,
    cardActionsConfirmDisabled,
    cardActionsConfirmLabel,
    effectiveTrueFalseButtonsVariant,
    emptyAnswerSubmitWarning,
  };
}

export const useFlashcardsActions = useFlashcardActionBarState;
