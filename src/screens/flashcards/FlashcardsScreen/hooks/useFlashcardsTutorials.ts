import {
  FLASHCARDS_COACHMARK_STEPS,
  HINT_COACHMARK_STEPS,
  type CoachmarkAdvanceEvent,
  type CoachmarkFlowStep,
} from "@/src/constants/coachmarkFlows";
import { useCoachmarkFlow } from "@/src/hooks/useCoachmarkFlow";
import type { BoxesState, WordWithTranslations } from "@/src/types/boxes";
import type { MutableRefObject } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Keyboard } from "react-native";
import type {
  HintTutorialTriggerSource,
  TutorialCompletionState,
} from "../model/FlashcardsScreen.types";

type UseFlashcardsTutorialsParams = {
  hintTutorialRestartToken?: string;
  isFocused: boolean;
  isUiReady: boolean;
  shouldShowBoxes: boolean;
  shouldRenderLoadingOverlay: boolean;
  boxZeroEnabled: boolean;
  selectedItem: WordWithTranslations | null;
  selectedItemId: number | null;
  answer: string;
  reversed: boolean;
  checkSpelling: (input: string, expected: string) => boolean;
  confirm: (selectedTranslation?: string, answerOverride?: string) => void;
  setAnswer: (answer: string) => void;
  setShouldCelebrate: (shouldCelebrate: boolean) => void;
  requestHintEdit: () => void;
  shouldHideHintsForActiveBox: boolean;
  isCoachmarkActiveRef: MutableRefObject<boolean>;
  pendingHintTutorialCardIdRef: MutableRefObject<number | null>;
  hintTutorialSeenRef: MutableRefObject<boolean>;
  requestHintTutorialRef: MutableRefObject<
    ((cardId: number, source: HintTutorialTriggerSource) => void) | null
  >;
};

export function useFlashcardsTutorials({
  hintTutorialRestartToken,
  isFocused,
  isUiReady,
  shouldShowBoxes,
  shouldRenderLoadingOverlay,
  boxZeroEnabled,
  selectedItem,
  selectedItemId,
  answer,
  reversed,
  checkSpelling,
  confirm,
  setAnswer,
  setShouldCelebrate,
  requestHintEdit,
  shouldHideHintsForActiveBox,
  isCoachmarkActiveRef,
  pendingHintTutorialCardIdRef,
  hintTutorialSeenRef,
  requestHintTutorialRef,
}: UseFlashcardsTutorialsParams) {
  const [tutorialCompletionState, setTutorialCompletionState] =
    useState<TutorialCompletionState>({});
  const [tutorialBoxCountOverrides, setTutorialBoxCountOverrides] = useState<
    Partial<Record<keyof BoxesState, number>> | null
  >(null);
  const [tutorialSuccessVariant, setTutorialSuccessVariant] = useState<
    "normal" | "assisted"
  >("normal");
  const [hintTutorialRequestedCardId, setHintTutorialRequestedCardId] =
    useState<number | null>(null);
  const [hintTutorialTriggerSource, setHintTutorialTriggerSource] =
    useState<HintTutorialTriggerSource>("manual");
  const [tutorialCardFocusToken, setTutorialCardFocusToken] = useState(0);
  const selectedItemIdRef = useRef<number | null>(null);
  const tutorialExpectedBoxRef = useRef<keyof BoxesState | null>(null);
  const tutorialForceCorrectRef = useRef(false);
  const tutorialDismissKeyboardRef = useRef(false);

  useEffect(() => {
    selectedItemIdRef.current = selectedItemId;
  }, [selectedItemId]);

  useEffect(() => {
    requestHintTutorialRef.current = (cardId, source) => {
      pendingHintTutorialCardIdRef.current = cardId;
      setHintTutorialTriggerSource(source);
      setHintTutorialRequestedCardId(cardId);
    };
    return () => {
      requestHintTutorialRef.current = null;
    };
  }, [pendingHintTutorialCardIdRef, requestHintTutorialRef]);

  const shouldRunFlashcardsCoachmark = !boxZeroEnabled;
  const coachmark = useCoachmarkFlow({
    flowKey: "flashcards-guided",
    storageKey: "@flashcards_intro_seen_v1",
    shouldStart:
      shouldRunFlashcardsCoachmark &&
      isFocused &&
      isUiReady &&
      shouldShowBoxes &&
      !shouldRenderLoadingOverlay,
    steps: FLASHCARDS_COACHMARK_STEPS,
    completionState: tutorialCompletionState,
  });
  const canRequestHintTutorial =
    isFocused &&
    isUiReady &&
    shouldShowBoxes &&
    !shouldRenderLoadingOverlay &&
    selectedItemId != null &&
    !shouldHideHintsForActiveBox;
  const handleHintTutorialComplete = useCallback(() => {
    const pendingCardId = pendingHintTutorialCardIdRef.current;
    pendingHintTutorialCardIdRef.current = null;
    setHintTutorialRequestedCardId(null);
    setHintTutorialTriggerSource("manual");
    if (pendingCardId == null || pendingCardId !== selectedItemIdRef.current) {
      return;
    }
    requestHintEdit();
  }, [pendingHintTutorialCardIdRef, requestHintEdit]);
  const hintCoachmark = useCoachmarkFlow({
    flowKey: "flashcards-hint-guided",
    storageKey: "@flashcards_hint_tutorial_seen_v1",
    shouldStart:
      hintTutorialRequestedCardId != null &&
      hintTutorialRequestedCardId === selectedItemId &&
      canRequestHintTutorial &&
      !coachmark.isActive &&
      !coachmark.isPendingStart,
    steps: HINT_COACHMARK_STEPS,
    restartToken: hintTutorialRestartToken,
    onComplete: handleHintTutorialComplete,
  });

  useEffect(() => {
    hintTutorialSeenRef.current = hintCoachmark.isReady && hintCoachmark.hasSeen;
  }, [hintCoachmark.hasSeen, hintCoachmark.isReady, hintTutorialSeenRef]);

  useEffect(() => {
    if (hintTutorialRequestedCardId == null) {
      return;
    }
    if (
      selectedItemId !== hintTutorialRequestedCardId ||
      !canRequestHintTutorial
    ) {
      pendingHintTutorialCardIdRef.current = null;
      setHintTutorialRequestedCardId(null);
      setHintTutorialTriggerSource("manual");
    }
  }, [
    canRequestHintTutorial,
    hintTutorialRequestedCardId,
    pendingHintTutorialCardIdRef,
    selectedItemId,
  ]);

  useEffect(() => {
    if (!hintTutorialRestartToken || !canRequestHintTutorial) {
      return;
    }
    if (selectedItemId == null) {
      return;
    }

    pendingHintTutorialCardIdRef.current = selectedItemId;
    setHintTutorialTriggerSource("manual");
    setHintTutorialRequestedCardId(selectedItemId);
  }, [
    canRequestHintTutorial,
    hintTutorialRestartToken,
    pendingHintTutorialCardIdRef,
    selectedItemId,
  ]);

  const isCoachmarkActive = coachmark.isActive || hintCoachmark.isActive;
  useEffect(() => {
    isCoachmarkActiveRef.current = isCoachmarkActive;
  }, [isCoachmarkActive, isCoachmarkActiveRef]);

  const currentFlashcardsStep = coachmark.currentStep;

  const setTutorialEventCompleted = useCallback(
    (event: CoachmarkAdvanceEvent, selectedBox?: keyof BoxesState) => {
      if (
        event === "box_selected" &&
        selectedBox != null &&
        tutorialExpectedBoxRef.current !== selectedBox
      ) {
        return;
      }
      setTutorialCompletionState((prev) =>
        prev[event] ? prev : { ...prev, [event]: true },
      );
    },
    [],
  );

  const getForcedTutorialAnswer = useCallback(
    (item: WordWithTranslations) => {
      if (item.type === "true_false" || item.type === "know_dont_know") {
        return {
          selectedTranslation: "true",
          answerText: "true",
        };
      }

      if (reversed) {
        return {
          selectedTranslation: item.text,
          answerText: item.text,
        };
      }

      const translation = item.translations[0] ?? "";
      return {
        selectedTranslation: translation,
        answerText: translation,
      };
    },
    [reversed],
  );

  const isTutorialAnswerAlreadyCorrect = useCallback(
    (item: WordWithTranslations, candidateAnswer: string) => {
      const trimmed = candidateAnswer.trim();
      if (trimmed.length === 0) {
        return false;
      }
      if (item.type === "true_false" || item.type === "know_dont_know") {
        return trimmed.toLowerCase() === "true";
      }
      if (reversed) {
        return checkSpelling(trimmed, item.text);
      }
      return item.translations.some((translation) =>
        checkSpelling(trimmed, translation),
      );
    },
    [checkSpelling, reversed],
  );

  const shouldStartHintEditing = useCallback(() => {
    if (!hintCoachmark.isReady || hintCoachmark.hasSeen || !canRequestHintTutorial) {
      return true;
    }
    if (selectedItemId == null) {
      return true;
    }
    pendingHintTutorialCardIdRef.current = selectedItemId;
    setHintTutorialTriggerSource("manual");
    setHintTutorialRequestedCardId(selectedItemId);
    return false;
  }, [
    canRequestHintTutorial,
    hintCoachmark.hasSeen,
    hintCoachmark.isReady,
    pendingHintTutorialCardIdRef,
    selectedItemId,
  ]);

  const confirmWithTutorial = useCallback(
    (selectedTranslation?: string, answerOverride?: string) => {
      if (!tutorialForceCorrectRef.current || !selectedItem) {
        confirm(selectedTranslation, answerOverride);
        return;
      }

      const forcedAnswer = getForcedTutorialAnswer(selectedItem);
      const userAnswer = answerOverride ?? answer;
      setTutorialSuccessVariant(
        isTutorialAnswerAlreadyCorrect(selectedItem, userAnswer)
          ? "normal"
          : "assisted",
      );
      setAnswer(forcedAnswer.answerText);
      confirm(forcedAnswer.selectedTranslation, forcedAnswer.answerText);
      if (tutorialDismissKeyboardRef.current) {
        Keyboard.dismiss();
      }
      setTutorialEventCompleted("answer_submitted");
      setTutorialEventCompleted("forced_correct_answer_shown");
      setTutorialEventCompleted("box_promoted");
    },
    [
      answer,
      confirm,
      getForcedTutorialAnswer,
      isTutorialAnswerAlreadyCorrect,
      selectedItem,
      setAnswer,
      setTutorialEventCompleted,
    ],
  );

  useEffect(() => {
    tutorialExpectedBoxRef.current = currentFlashcardsStep?.expectedBox ?? null;
    tutorialForceCorrectRef.current =
      currentFlashcardsStep?.forceCorrectOnSubmit === true;
    tutorialDismissKeyboardRef.current =
      currentFlashcardsStep?.dismissKeyboardOnAdvance === true;
  }, [currentFlashcardsStep]);

  useEffect(() => {
    if (!coachmark.isActive) {
      setTutorialCompletionState({});
      setTutorialBoxCountOverrides(null);
      setTutorialSuccessVariant("normal");
      tutorialExpectedBoxRef.current = null;
      tutorialForceCorrectRef.current = false;
      tutorialDismissKeyboardRef.current = false;
      return;
    }

    setTutorialBoxCountOverrides(currentFlashcardsStep?.showDemoBoxCounts ?? null);
  }, [coachmark.isActive, currentFlashcardsStep]);

  useEffect(() => {
    if (!coachmark.isActive || !currentFlashcardsStep?.triggerDemoConfetti) {
      return;
    }

    setShouldCelebrate(false);
    requestAnimationFrame(() => {
      setShouldCelebrate(true);
      setTutorialEventCompleted("confetti_demo_shown");
    });
  }, [
    coachmark.isActive,
    currentFlashcardsStep?.id,
    currentFlashcardsStep?.triggerDemoConfetti,
    setShouldCelebrate,
    setTutorialEventCompleted,
  ]);

  useEffect(() => {
    if (!coachmark.isActive) {
      return;
    }
    if (currentFlashcardsStep?.id === "flashcards-step-9") {
      return;
    }
    Keyboard.dismiss();
  }, [coachmark.currentIndex, coachmark.isActive, currentFlashcardsStep?.id]);

  useEffect(() => {
    if (!coachmark.isActive || currentFlashcardsStep?.id !== "flashcards-step-9") {
      return;
    }

    setTutorialCardFocusToken((prev) => prev + 1);
  }, [coachmark.isActive, currentFlashcardsStep?.id]);

  const guidedFlashcardsCoachmarkStep: CoachmarkFlowStep | null = useMemo(() => {
    if (!currentFlashcardsStep) {
      return null;
    }
    if (currentFlashcardsStep.id === "flashcards-step-9") {
      if (selectedItem?.type === "true_false") {
        return {
          ...currentFlashcardsStep,
          descriptionKey: "onboarding.flashcards.step9.descriptionTrueFalse",
        };
      }
      if (selectedItem?.type === "know_dont_know") {
        return {
          ...currentFlashcardsStep,
          descriptionKey: "onboarding.flashcards.step9.descriptionKnowDontKnow",
        };
      }
    }
    if (
      currentFlashcardsStep.id === "flashcards-step-10" &&
      tutorialSuccessVariant === "assisted"
    ) {
      return {
        ...currentFlashcardsStep,
        descriptionKey: "onboarding.flashcards.step10.descriptionAssisted",
        successVariant: "assisted",
      };
    }
    return currentFlashcardsStep;
  }, [currentFlashcardsStep, selectedItem?.type, tutorialSuccessVariant]);

  const guidedHintCoachmarkStep: CoachmarkFlowStep | null = useMemo(() => {
    if (!hintCoachmark.currentStep) {
      return null;
    }
    if (hintCoachmark.currentStep.id !== "flashcards-hint-step-1") {
      return hintCoachmark.currentStep;
    }
    return {
      ...hintCoachmark.currentStep,
      titleKey:
        hintTutorialTriggerSource === "auto"
          ? "onboarding.hints.autoStep1.title"
          : "onboarding.hints.manualStep1.title",
      descriptionKey:
        hintTutorialTriggerSource === "auto"
          ? "onboarding.hints.autoStep1.description"
          : "onboarding.hints.manualStep1.description",
    };
  }, [hintCoachmark.currentStep, hintTutorialTriggerSource]);

  return {
    coachmark,
    hintCoachmark,
    isCoachmarkActive,
    setTutorialEventCompleted,
    confirmWithTutorial,
    shouldStartHintEditing,
    guidedFlashcardsCoachmarkStep,
    guidedHintCoachmarkStep,
    tutorialBoxCountOverrides,
    tutorialCardFocusToken,
    tutorialSuccessVariant,
  };
}
