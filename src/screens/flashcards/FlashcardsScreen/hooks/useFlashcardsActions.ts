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

type UseFlashcardActionBarStateParams = {
  selectedItem: WordWithTranslations | null;
  selectedItemId: number | null;
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
  onOk: () => void;
  lastTrueFalseTapRef?: MutableRefObject<LastTrueFalseTap | null>;
  lastActionCooldownCardIdRef?: MutableRefObject<number | null>;
  t: TFunction;
};

export function useFlashcardActionBarState({
  selectedItem,
  selectedItemId,
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
  onOk,
  lastTrueFalseTapRef: providedLastTrueFalseTapRef,
  lastActionCooldownCardIdRef: providedLastActionCooldownCardIdRef,
  t,
}: UseFlashcardActionBarStateParams) {
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

  useLayoutEffect(() => {
    if (selectedItemId == null) {
      lastActionCooldownCardIdRef.current = null;
      setIsActionCooldownActive(false);
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
    onConfirm();
  }, [
    externalActionLocked,
    handleTrueFalseOk,
    isActionCooldownActive,
    isExplanationVisible,
    isImmediateActionLockActive,
    onConfirm,
  ]);

  const handleCardConfirm = useCallback(
    (selectedTranslation?: string, answerOverride?: string) => {
      if (
        isActionCooldownActive ||
        isImmediateActionLockActive ||
        externalActionLocked
      ) {
        return;
      }
      onConfirm(selectedTranslation, answerOverride);
    },
    [
      externalActionLocked,
      isActionCooldownActive,
      isImmediateActionLockActive,
      onConfirm,
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
  };
}

export const useFlashcardsActions = useFlashcardActionBarState;
