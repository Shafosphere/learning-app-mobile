import type { TFunction } from "i18next";
import type { MutableRefObject } from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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

type UseFlashcardsActionsParams = {
  selectedItem: WordWithTranslations | null;
  selectedItemId: number | null;
  displayResult: boolean | null;
  isBetweenCards: boolean;
  correction: CorrectionState | null;
  courseHasOnlyTrueFalse: boolean;
  courseHasOnlyKnowDontKnow: boolean;
  isKnowDontKnow: boolean;
  downloadDisabled: boolean;
  shouldShowBoxes: boolean;
  isExplanationVisible: boolean;
  isExplanationPending: boolean;
  setAnswer: (answer: string) => void;
  confirmWithTutorial: (
    selectedTranslation?: string,
    answerOverride?: string,
  ) => void;
  acknowledgeExplanation: () => void;
  lastTrueFalseTapRef: MutableRefObject<LastTrueFalseTap | null>;
  lastActionCooldownCardIdRef: MutableRefObject<number | null>;
  t: TFunction;
};

export function useFlashcardsActions({
  selectedItem,
  selectedItemId,
  displayResult,
  isBetweenCards,
  correction,
  courseHasOnlyTrueFalse,
  courseHasOnlyKnowDontKnow,
  isKnowDontKnow,
  downloadDisabled,
  shouldShowBoxes,
  isExplanationVisible,
  isExplanationPending,
  setAnswer,
  confirmWithTutorial,
  acknowledgeExplanation,
  lastTrueFalseTapRef,
  lastActionCooldownCardIdRef,
  t,
}: UseFlashcardsActionsParams) {
  const [isActionCooldownActive, setIsActionCooldownActive] = useState(false);
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

  const selectedTrueFalseAnswer =
    selectedTrueFalseUiState.cardId === selectedItemId
      ? selectedTrueFalseUiState.answer
      : null;

  useLayoutEffect(() => {
    if (selectedItemId == null) return;
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

  const handleTrueFalseAnswer = useCallback(
    (value: boolean) => {
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
      confirmWithTutorial(choice, choice);
    },
    [
      confirmWithTutorial,
      displayResult,
      isActionCooldownActive,
      isBetweenCards,
      lastTrueFalseTapRef,
      selectedItemId,
      setAnswer,
    ],
  );

  const handleTrueFalseOk = useCallback(() => {
    if (isActionCooldownActive) return;
    acknowledgeExplanation();
  }, [acknowledgeExplanation, isActionCooldownActive]);

  const shouldUseTrueFalseActionBar =
    courseHasOnlyTrueFalse ||
    selectedItem?.type === "true_false" ||
    isKnowDontKnow;
  const shouldShowTrueFalseActions =
    shouldUseTrueFalseActionBar && shouldShowBoxes && !correction;
  const trueFalseActionsMode: "answer" | "ok" =
    isExplanationPending && shouldUseTrueFalseActionBar ? "ok" : "answer";
  const isImmediateActionLockActive =
    selectedItemId != null &&
    lastActionCooldownCardIdRef.current !== selectedItemId;
  const trueFalseActionsDisabled = isExplanationPending
    ? isBetweenCards || isActionCooldownActive || isImmediateActionLockActive
    : displayResult !== null ||
      isBetweenCards ||
      isActionCooldownActive ||
      isImmediateActionLockActive;
  const showCardActions = !(
    courseHasOnlyTrueFalse ||
    shouldShowTrueFalseActions ||
    selectedItem?.type === "true_false" ||
    isKnowDontKnow
  );

  const handleCardActionsConfirm = useCallback(() => {
    if (isExplanationVisible) {
      handleTrueFalseOk();
      return;
    }
    if (isActionCooldownActive || isImmediateActionLockActive) return;
    confirmWithTutorial();
  }, [
    confirmWithTutorial,
    handleTrueFalseOk,
    isActionCooldownActive,
    isExplanationVisible,
    isImmediateActionLockActive,
  ]);

  const handleCardConfirm = useCallback(
    (selectedTranslation?: string, answerOverride?: string) => {
      if (isActionCooldownActive || isImmediateActionLockActive) return;
      confirmWithTutorial(selectedTranslation, answerOverride);
    },
    [
      confirmWithTutorial,
      isActionCooldownActive,
      isImmediateActionLockActive,
    ],
  );

  const cardActionsDownloadDisabled =
    downloadDisabled ||
    isExplanationVisible ||
    isActionCooldownActive ||
    isImmediateActionLockActive;
  const cardActionsConfirmDisabled =
    isActionCooldownActive || isImmediateActionLockActive;
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
  };
}
