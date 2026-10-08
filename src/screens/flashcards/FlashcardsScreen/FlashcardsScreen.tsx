import { useFlashcardsScrollDiagnostics } from "./hooks/useFlashcardsScrollDiagnostics";
import { useFlashcardsLayoutDiagnostics } from "./hooks/useFlashcardsLayoutDiagnostics";
import { useFlashcardsCompletionCelebration } from "./hooks/useFlashcardsCompletionCelebration";
import { useFlashcardsCompletionPanel } from "./hooks/useFlashcardsCompletionPanel";
import { useFlashcardsCompletionPreview } from "./hooks/useFlashcardsCompletionPreview";
import { useFlashcardsSelectionValidity } from "./hooks/useFlashcardsSelectionValidity";
import { useFlashcardsRelearningCleanup } from "./hooks/useFlashcardsRelearningCleanup";
import { useFlashcardsCardSynchronization } from "./hooks/useFlashcardsCardSynchronization";
import { useFlashcardsCompletionRun } from "./hooks/useFlashcardsCompletionRun";
import FlashcardsPeekOverlay from "@/src/components/Box/Peek/FlashcardsPeek";
import { getResponsiveFlashcardMetrics } from "@/src/components/card/responsiveCardWidth";
import Confetti from "@/src/components/confetti/Confetti";
import { FlashcardsStudyButtons } from "@/src/features/flashcards/study/components/FlashcardsStudyButtons";
import { KeyboardBridgeInput } from "@/src/features/flashcards/study/components/KeyboardBridgeInput";
import { NudgeModal } from "@/src/components/nudge/NudgeModal";
import { useCoachmarkLayerPortal } from "@/src/components/onboarding/CoachmarkLayerPortal";
import { PreviewOptionSelector } from "@/src/components/selection/PreviewOptionSelector";
import { DEFAULT_FLASHCARDS_BATCH_SIZE } from "@/src/config/appConfig";
import { useLearningStats } from "@/src/contexts/LearningStatsContext";
import { useFlashcardsStatsBurst } from "@/src/features/flashcards/study/hooks/useFlashcardsStatsBurst";
import { useQuote } from "@/src/contexts/QuoteContext";
import { useSettings } from "@/src/contexts/SettingsContext";
import { scheduleCustomReview } from "@/src/db/sqlite/db";
import { useFlashcardImagePreload } from "@/src/features/flashcards/useFlashcardImagePreload";
import { useAutoResetFlag } from "@/src/hooks/useAutoResetFlag";
import { useBoxesPersistenceSnapshot } from "@/src/hooks/useBoxesPersistenceSnapshot";
import { useBoxFacesController } from "@/src/hooks/useBoxFacesController";
import { useDeviceLayout } from "@/src/hooks/useDeviceLayout";
import { useFlashcardsAutoflow } from "@/src/hooks/useFlashcardsAutoflow";
import {
  type CorrectAnswerMeta,
  useFlashcardsInteraction,
} from "@/src/hooks/useFlashcardsInteraction";
import useSpellchecking from "@/src/hooks/useSpellchecking";
import { FlashcardsCardSection } from "@/src/screens/flashcards/FlashcardsScreen/components/FlashcardsCardSection";
import { useStyles } from "@/src/screens/flashcards/FlashcardsScreen/FlashcardsScreen-styles";
import { useActionsPositionNudge } from "@/src/screens/flashcards/FlashcardsScreen/hooks/useActionsPositionNudge";
import { useFlashcardsCourseData } from "@/src/screens/flashcards/FlashcardsScreen/hooks/useFlashcardsCourseData";
import { useFlashcardsDistribution } from "@/src/screens/flashcards/FlashcardsScreen/hooks/useFlashcardsDistribution";
import { useFlashcardsResultEffects } from "@/src/screens/flashcards/FlashcardsScreen/hooks/useFlashcardsResultEffects";
import {
  BOX_SPAM_COOLDOWN_MS,
  BOX_SPAM_THRESHOLD,
  BOX_SPAM_WINDOW_MS,
  UI_WARMUP_DELAY_MS,
} from "@/src/screens/flashcards/FlashcardsScreen/model/FlashcardsScreen.constants";
import { FlashcardsStudyLayout } from "@/src/features/flashcards/study/components/FlashcardsStudyLayout";
import { useFlashcardsStudyCoordinator } from "@/src/features/flashcards/study/hooks/useFlashcardsStudyCoordinator";
import { useFlashcardActionBarState } from "@/src/features/flashcards/study/hooks/useFlashcardActionBarState";
import { useFlashcardsStudyLayout } from "@/src/features/flashcards/study/hooks/useFlashcardsStudyLayout";
import { useFlashcardsTutorials } from "@/src/screens/flashcards/FlashcardsScreen/hooks/useFlashcardsTutorials";
import { appendDebugEvent } from "@/src/services/debugEvents";
import { logFlashcardsScrollDebug } from "@/src/services/flashcardsScrollDebug";
import { returnFlashcardToUnknown } from "@/src/services/returnFlashcardToUnknown";
import { BoxesState } from "@/src/types/boxes";
import { getExplanationState } from "@/src/utils/explanationState";
import { CoachmarkAnchor } from "@edwardloopez/react-native-coachmark";
import { useIsFocused } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

export default function Flashcards() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const params = useLocalSearchParams<{ hintTutorialRestartToken?: string }>();
  const styles = useStyles();
  const {
    width: windowWidth,
    height: windowHeight,
    scale: windowScale,
    fontScale,
  } = useWindowDimensions();
  const cardMetrics = getResponsiveFlashcardMetrics(windowWidth);
  const {
    isSmallPhoneLayout: deviceIsSmallPhoneLayout,
    isTabletLayout,
    shortestSide,
    orientation,
    widthClass,
    heightClass,
  } = useDeviceLayout();
  const flashcardsContentWidth = isTabletLayout ? cardMetrics.width : undefined;
  const { t } = useTranslation();
  const keyboardBridgeInputRef = useRef<TextInput | null>(null);
  const {
    activeCustomCourseId,
    activeCourse,
    setActiveCustomCourseId,
    boxesLayout,
    flashcardsBatchSize,
    boxZeroSettingsHydrated,
    boxZeroEnabled,
    boxZeroAnswerSide,
    autoflowEnabled,
    explanationOnlyOnWrong,
    showExplanationEnabled,
    skipCorrectionEnabled,
    autoSubmitCorrectAnswer,
    actionButtonsPosition,
    setActionButtonsPosition,
    dominantHand,
    colors,
  } = useSettings();
  const studyLayout = useFlashcardsStudyLayout({
    isTabletLayout,
    boxesLayout,
    areButtonsOnTop: actionButtonsPosition === "top",
    isFocused,
  });
  const { isCompactStudyLayout } = studyLayout;

  const { registerKnownWord } = useLearningStats();
  const emitStatsBurst = useFlashcardsStatsBurst(
    "[Flashcards] Failed to refresh streak after answer",
  );
  const { triggerQuote } = useQuote();
  const [shouldCelebrate, setShouldCelebrate] = useState(false);
  const resetCelebrate = useCallback(() => setShouldCelebrate(false), []);
  useAutoResetFlag(shouldCelebrate, resetCelebrate);
  const pendingHintTutorialCardIdRef = useRef<number | null>(null);
  const hintTutorialSeenRef = useRef(false);
  const requestHintTutorialRef = useRef<
    ((cardId: number, source: "manual" | "auto") => void) | null
  >(null);
  const selectedItemIdRef = useRef<number | null>(null);
  const isCoachmarkActiveRef = useRef(false);
  const previousFaceActiveBoxRef = useRef<keyof BoxesState | null>(null);
  const boxSpamRef = useRef<{
    box: keyof BoxesState | null;
    ts: number;
    count: number;
  }>({ box: null, ts: 0, count: 0 });
  const boxFacesControllerRef = useRef<{
    handleCorrectAnswer: (
      box: keyof BoxesState,
      options?: { preferLove?: boolean },
    ) => void;
    handleWrongAnswer: (box: keyof BoxesState) => void;
  }>({
    handleCorrectAnswer: () => undefined,
    handleWrongAnswer: () => undefined,
  });
  const handleStatsBurst = useCallback(
    (boxKey: keyof BoxesState, meta: CorrectAnswerMeta) => {
      if (!isCoachmarkActiveRef.current && boxKey === "boxFive") {
        setShouldCelebrate(false);
        requestAnimationFrame(() => {
          setShouldCelebrate(true);
          triggerQuote({
            trigger: "quote_box_five_win",
            category: "win_mastery",
            probability: 1,
            cooldownMs: 5 * 60 * 1000,
          });
        });
      }

      void emitStatsBurst({
        logLearningEventPromise: meta.logLearningEventPromise,
        deltas: {
          masteredDelta: meta.wasNewMastered ? 1 : 0,
          promotionsDelta:
            boxKey === "boxOne" ||
            boxKey === "boxTwo" ||
            boxKey === "boxThree" ||
            boxKey === "boxFour"
              ? 1
              : 0,
        },
      });
    },
    [emitStatsBurst, triggerQuote],
  );

  const {
    boxes,
    setBoxes,
    isReady,
    usedWordIds,
    addUsedWordIds,
    removeUsedWordIds,
    relearningWordIds = [],
    markWordForRelearning = () => undefined,
    clearWordForRelearning = () => undefined,
    setBatchIndex,
    storageKey,
  } = useBoxesPersistenceSnapshot({
    sourceLangId: activeCustomCourseId ?? 0,
    targetLangId: activeCustomCourseId ?? 0,
    level: `custom-${activeCustomCourseId ?? 0}`,
    storageNamespace: "customBoxes",
    autosave: activeCustomCourseId !== null && isFocused,
    saveDelayMs: 1000,
  });

  const [isUiReady, setIsUiReady] = useState(false);
  const {
    customCourse,
    customCards,
    courseCompletionSummary,
    courseMasteryProgress,
    courseCompletionRunStartedAt,
    isLoadingData,
    loadedCourseId,
    loadError,
    setCourseCompletionSummary,
    setCourseCompletionRunStartedAt,
    patchCustomCardHints,
    patchCustomCard,
    handlePersistHintUpdate,
  } = useFlashcardsCourseData({
    activeCustomCourseId,
    isFocused,
    storageKey,
    setActiveCustomCourseId,
  });
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
  const [hintEditRequestToken, setHintEditRequestToken] = useState(0);
  const uiWarmupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingOverlayOpacity = useRef(new Animated.Value(1)).current;
  const lastActionCooldownCardIdRef = useRef<number | null>(null);
  const previousKeyboardVisibleRef = useRef<boolean | null>(null);
  const actionsPositionNudgeAnsweredRef = useRef<(() => void) | null>(null);
  const totalCards = customCards.length;

  useEffect(() => {
    if (!isFocused) return;
    void appendDebugEvent("flashcards", "flashcards.enter", {
      screen: "flashcards",
      courseId: activeCustomCourseId,
      storageKey,
    });
    return () => {
      void appendDebugEvent("flashcards", "flashcards.exit", {
        screen: "flashcards",
        courseId: activeCustomCourseId,
        storageKey,
      });
    };
  }, [activeCustomCourseId, isFocused, storageKey]);

  const courseHasOnlyTrueFalse = useMemo(
    () =>
      customCards.length > 0 &&
      customCards.every(
        (card) => card.type === "true_false" || card.type === "know_dont_know",
      ),
    [customCards],
  );
  const courseHasOnlyKnowDontKnow = useMemo(
    () =>
      customCards.length > 0 &&
      customCards.every((card) => card.type === "know_dont_know"),
    [customCards],
  );
  const { applyCompletionSummaryAnswer, ensureCompletionRunStarted } = useFlashcardsCompletionRun({
    activeCustomCourseId,
    courseCompletionRunStartedAt,
    setCourseCompletionRunStartedAt,
    setCourseCompletionSummary,
  });

  const skipCorrection = courseHasOnlyTrueFalse || skipCorrectionEnabled;
  const checkSpelling = useSpellchecking();
  const {
    activeBox,
    handleSelectBox: baseHandleSelectBox,
    selectedItem,
    answer,
    setAnswer,
    result,
    setResult,
    confirm,
    reversed,
    correction,
    wrongInputChange,
    setCorrectionRewers,
    learned,
    setLearned,
    acknowledgeExplanation,
    resetInteractionState,
    clearCardTransientState,
    clearSelection,
    updateSelectedItem,
    isBetweenCards,
    getQueueForBox,
    canConfirm,
  } = useFlashcardsInteraction({
    boxes,
    setBoxes,
    checkSpelling,
    addUsedWordIds,
    registerKnownWord,
    onWordPromotedOut: (word) => {
      if (activeCustomCourseId != null && customCourse?.reviewsEnabled) {
        void scheduleCustomReview(word.id, activeCustomCourseId, 0);
      }
    },
    onCorrectAnswer: (boxKey, meta) => {
      ensureCompletionRunStarted();
      applyCompletionSummaryAnswer("ok", meta.durationMs);
      handleStatsBurst(boxKey, meta);
      boxFacesControllerRef.current.handleCorrectAnswer(boxKey, {
        preferLove:
          meta.isTerminalSuccess ||
          meta.wasNewMastered ||
          meta.fromBox === "boxFour",
      });
    },
    onWrongAnswer: (boxKey, meta) => {
      ensureCompletionRunStarted();
      applyCompletionSummaryAnswer("wrong", meta.durationMs);
      boxFacesControllerRef.current.handleWrongAnswer(boxKey);
    },
    boxZeroEnabled,
    boxZeroAnswerSide,
    skipDemotionCorrection: skipCorrection,
    debugContext: {
      screen: "flashcards",
      courseId: activeCustomCourseId,
      storageKey,
    },
    courseName:
      customCourse?.name ??
      (activeCourse
        ? `${activeCourse.sourceLang} → ${activeCourse.targetLang}`
        : null),
    sourceType: activeCustomCourseId != null ? "custom" : "builtin",
  });
  const {
    remainingNewFlashcardsCount,
    totalCardsInBoxes,
    setReviewedCardIds,
    reviewedIdsSeedResolvedCourseId,
    isReviewedIdsSeedLoading,
    hasCardsReturnedToUnknown,
    handleManualAddFlashcards,
    handleAutoflowDownload,
  } = useFlashcardsDistribution({
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
    boxZeroSettingsHydrated,
    boxZeroEnabled,
    flashcardsBatchSize,
  });
  useFlashcardsRelearningCleanup({
    relearningWordIds,
    learned,
    clearWordForRelearning,
  });

  useFlashcardImagePreload({
    isFocused,
    selectedItem,
    correction,
    activeBox,
    getQueueForBox,
  });

  const {
    faces: boxFaces,
    handleSelection: handleBoxFaceSelection,
    handleBlockedInteraction: handleBlockedBoxInteraction,
    handleCorrectAnswer: handleBoxFaceCorrectAnswer,
    handleWrongAnswer: handleBoxFaceWrongAnswer,
  } = useBoxFacesController({
    boxes,
    activeBox,
  });
  boxFacesControllerRef.current = {
    handleCorrectAnswer: handleBoxFaceCorrectAnswer,
    handleWrongAnswer: handleBoxFaceWrongAnswer,
  };
  useEffect(() => {
    if (activeBox && previousFaceActiveBoxRef.current !== activeBox) {
      handleBoxFaceSelection(activeBox);
    }
    previousFaceActiveBoxRef.current = activeBox;
  }, [activeBox, handleBoxFaceSelection]);
  const correctionLocked = correction != null && correction.mode !== "intro";
  const selectedItemId = selectedItem?.id ?? null;
  useEffect(() => {
    selectedItemIdRef.current = selectedItemId;
  }, [selectedItemId]);
  const shouldHideHintsForActiveBox =
    isCompactStudyLayout || activeBox === "boxFour" || activeBox === "boxFive";
  const shouldReserveHintSpaceWhenHidden =
    !isCompactStudyLayout && (activeBox === "boxFour" || activeBox === "boxFive");
  useFlashcardsLayoutDiagnostics({
    isFocused,
    activeCustomCourseId,
    selectedItemId,
    windowWidth,
    windowHeight,
    windowScale,
    fontScale,
    shortestSide,
    orientation,
    widthClass,
    heightClass,
    deviceIsSmallPhoneLayout,
    isCompactStudyLayout,
    studyLayout,
    isTabletLayout,
    activeBox,
    shouldHideHintsForActiveBox,
    shouldReserveHintSpaceWhenHidden,
    boxesLayout,
    actionButtonsPosition,
  });

  const lastTrueFalseTapRef = useRef<{
    cardId: number | null;
    ts: number;
    answer: boolean | null;
  } | null>(null);
  const onAnsweredForActionsPositionNudge = useCallback(() => {
    actionsPositionNudgeAnsweredRef.current?.();
  }, []);
  const willEnterDemotionCorrection = useCallback(() => {
    if (!selectedItem || skipCorrection) {
      return false;
    }
    if (
      selectedItem.type === "true_false" ||
      selectedItem.type === "know_dont_know"
    ) {
      return false;
    }

    const answerToUse = answer.replace(/ +$/, "");
    const ok = reversed
      ? checkSpelling(answerToUse, selectedItem.text)
      : selectedItem.translations.some((translation) =>
          checkSpelling(answerToUse, translation),
        );

    return !ok;
  }, [answer, checkSpelling, reversed, selectedItem, skipCorrection]);
  const primeKeyboardBridgeForCorrection = useCallback(() => {
    if (!willEnterDemotionCorrection()) {
      return;
    }

    keyboardBridgeInputRef.current?.focus();
    void appendDebugEvent("flashcards", "screen.focus.keyboard_bridge", {
      selectedItemId,
      reason: "actions_confirm_will_enter_correction",
      keyboardVisible: Keyboard.isVisible?.() ?? null,
    });
  }, [selectedItemId, willEnterDemotionCorrection]);

  const requestHintEdit = useCallback(() => {
    setHintEditRequestToken((prev) => prev + 1);
  }, []);

  const { displayResult, resultPending, notifyQuestionStarted } =
    useFlashcardsResultEffects({
      result,
      selectedItemId,
      shouldHideHintsForActiveBox,
      onAnsweredForActionsPositionNudge,
      triggerQuote,
      isCoachmarkActiveRef,
      hintTutorialSeenRef,
      requestHintTutorialRef,
      lastTrueFalseTapRef,
    });
  const isKnowDontKnow = selectedItem?.type === "know_dont_know";
  const initialExplanationState = getExplanationState({
    selectedItem,
    result: displayResult,
    showExplanationEnabled,
    explanationOnlyOnWrong,
  });
  const waitingForOk =
    !correction &&
    !isBetweenCards &&
    initialExplanationState.isExplanationPending;
  const boxSelectionLocked =
    correctionLocked || waitingForOk || resultPending || isBetweenCards;

  const [peekBox, setPeekBox] = useState<keyof BoxesState | null>(null);
  const peekCards = useMemo(
    () => (peekBox ? getQueueForBox(peekBox) : []),
    [getQueueForBox, peekBox],
  );

  const handleBoxLongPress = useCallback(
    (boxName: keyof BoxesState) => {
      const list = boxes[boxName] ?? [];
      if (!list.length) return;
      setPeekBox(boxName);
    },
    [boxes],
  );

  const closePeek = useCallback(() => setPeekBox(null), []);

  const handleReturnPeekCardToUnknown = useCallback(
    async (cardId: number) => {
      if (activeCustomCourseId == null) {
        throw new Error("No active course selected.");
      }
      await returnFlashcardToUnknown({
        courseId: activeCustomCourseId,
        flashcardId: cardId,
      });
    },
    [activeCustomCourseId],
  );

  const { handleHintUpdate } = useFlashcardsCardSynchronization({
    activeCustomCourseId,
    selectedItemIdRef,
    setBoxes,
    setLearned,
    removeUsedWordIds,
    markWordForRelearning,
    setReviewedCardIds,
    resetInteractionState,
    patchCustomCard,
    updateSelectedItem,
    clearCardTransientState,
    patchCustomCardHints,
    handlePersistHintUpdate,
  });

  useEffect(() => {
    if (!peekBox) return;
    const hasCards = (boxes[peekBox] ?? []).length > 0;
    if (!hasCards) {
      setPeekBox(null);
    }
  }, [boxes, peekBox]);

  const introBoxLimitReached = boxZeroEnabled
    ? boxes.boxZero.length >= 30
    : boxes.boxOne.length >= 30;
  const incomingBatchSize =
    flashcardsBatchSize ?? DEFAULT_FLASHCARDS_BATCH_SIZE;

  // Allow autoflow to switch boxes even when a card is shown,
  // otherwise it never jumps to a clogged box until the current box is emptied.
  const canAutoflowSwitch = !boxSelectionLocked && !resultPending;

  useEffect(() => {
    if (selectedItem && displayResult === null) {
      notifyQuestionStarted();
    }
  }, [displayResult, notifyQuestionStarted, selectedItem]);

  useEffect(() => {
    if (!isFocused) return;
    if (activeCustomCourseId == null) return;
    if (loadedCourseId !== activeCustomCourseId) return;
    if (!boxZeroSettingsHydrated) return;
    if (boxZeroEnabled) return;
    if (!boxes.boxZero.length) return;

    const wordsToReset = boxes.boxZero;
    setBoxes((prev) => ({
      ...prev,
      boxZero: [],
    }));
    removeUsedWordIds(wordsToReset.map((word) => word.id));
  }, [
    activeCustomCourseId,
    boxZeroSettingsHydrated,
    boxZeroEnabled,
    boxes.boxZero,
    isFocused,
    loadedCourseId,
    removeUsedWordIds,
    setBoxes,
  ]);

  useFlashcardsSelectionValidity({
    selectedItem,
    customCards,
    clearSelection,
  });

  useEffect(() => {
    if (uiWarmupTimerRef.current) {
      clearTimeout(uiWarmupTimerRef.current);
      uiWarmupTimerRef.current = null;
    }
    if (!isFocused) {
      setIsUiReady(false);
      return;
    }
    setIsUiReady(false);
    uiWarmupTimerRef.current = setTimeout(() => {
      setIsUiReady(true);
      uiWarmupTimerRef.current = null;
    }, UI_WARMUP_DELAY_MS);
  }, [activeCustomCourseId, isFocused]);

  const isUiWarmupActive = isFocused && !isUiReady;
  const isReviewedIdsSeedResolved =
    activeCustomCourseId != null &&
    reviewedIdsSeedResolvedCourseId === activeCustomCourseId;
  const shouldKeepLoadingOverlayVisible =
    activeCustomCourseId != null &&
    !loadError &&
    (!boxZeroSettingsHydrated ||
      isLoadingData ||
      isReviewedIdsSeedLoading ||
      (customCards.length > 0 && !isReviewedIdsSeedResolved) ||
      loadedCourseId !== activeCustomCourseId ||
      isUiWarmupActive);
  const shouldRenderLoadingOverlay =
    shouldKeepLoadingOverlayVisible || showLoadingOverlay;
  const isCardFocusEnabled = isFocused && !shouldRenderLoadingOverlay;

  useEffect(() => {
    if (shouldKeepLoadingOverlayVisible) {
      loadingOverlayOpacity.stopAnimation();
      loadingOverlayOpacity.setValue(1);
      setShowLoadingOverlay(true);
      return;
    }

    if (!showLoadingOverlay) {
      loadingOverlayOpacity.setValue(0);
      return;
    }

    const fadeOut = Animated.timing(loadingOverlayOpacity, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    });
    fadeOut.start(({ finished }) => {
      if (!finished) return;
      setShowLoadingOverlay(false);
    });

    return () => {
      fadeOut.stop();
    };
  }, [
    loadingOverlayOpacity,
    shouldKeepLoadingOverlayVisible,
    showLoadingOverlay,
  ]);

  const downloadDisabled =
    customCards.length === 0 || isLoadingData || !isReady;
  const isCourseDisplayReady =
    activeCustomCourseId != null &&
    isReady &&
    !isLoadingData &&
    !loadError &&
    loadedCourseId === activeCustomCourseId &&
    isReviewedIdsSeedResolved &&
    customCards.length > 0;
  const isCourseFinishedPreviewEligible = __DEV__ && isCourseDisplayReady;
  const isCourseFinishedPreviewVisible = useFlashcardsCompletionPreview({
    isFocused,
    isCourseFinishedPreviewEligible,
    resetInteractionState,
    clearSelection,
    setBoxes,
    addUsedWordIds,
    customCards,
  });

  const {
    isCourseFinishedVisible,
    shouldShowBoxes,
    courseFinishedAccuracyLabel,
    courseFinishedTimeLabel,
    courseFinishedFlagSource,
    courseFinishedIconProps,
  } = useFlashcardsCompletionPanel({
    isCourseDisplayReady,
    remainingNewFlashcardsCount,
    totalCardsInBoxes,
    selectedItem,
    hasCardsReturnedToUnknown,
    courseMasteryProgress,
    isCourseFinishedPreviewVisible,
    isCourseFinishedPreviewEligible,
    courseCompletionSummary,
    customCourse,
    headlineColor: colors.headline,
  });

  const shouldRunFlashcardsCoachmark = !boxZeroEnabled;
  const {
    coachmark,
    hintCoachmark,
    setTutorialEventCompleted,
    confirmWithTutorial,
    shouldStartHintEditing,
    guidedFlashcardsCoachmarkStep,
    guidedHintCoachmarkStep,
    tutorialBoxCountOverrides,
    tutorialCardFocusToken,
  } = useFlashcardsTutorials({
    hintTutorialRestartToken: params.hintTutorialRestartToken,
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
  });

  const autoflow = useFlashcardsAutoflow({
    enabled:
      boxZeroSettingsHydrated &&
      autoflowEnabled &&
      isFocused &&
      (!shouldRunFlashcardsCoachmark || coachmark.hasSeen) &&
      !coachmark.isActive &&
      !coachmark.isPendingStart &&
      !hintCoachmark.isActive &&
      !hintCoachmark.isPendingStart,
    boxes,
    activeBox,
    handleSelectBox: baseHandleSelectBox,
    canSwitch: canAutoflowSwitch,
    boxZeroEnabled,
    isReady: isReady,
    downloadMore: handleAutoflowDownload,
    introBoxLimitReached,
    incomingBatchSize,
    totalFlashcardsInCourse: totalCards,
    remainingNewFlashcardsCount,
    onDebugEvent: (_area, event, payload) => {
      if (__DEV__ && process.env.NODE_ENV !== "test" && event === "autoflow.switch_box") {
        console.log("[flashcard-flow]", {
          timestampMs: Date.now(),
          event,
          cardId: selectedItemId,
          ...payload,
        });
      }
      void appendDebugEvent("flashcards", event, {
        screen: "flashcards",
        courseId: activeCustomCourseId,
        storageKey,
        ...payload,
      });
    },
  });
  const holdCardContent = isBetweenCards || Boolean(autoflow?.isSwitchPending);
  const currentFlashcardsStep = coachmark.currentStep;
  const shouldDisableTutorialCardAutofocus =
    (coachmark.isActive && currentFlashcardsStep?.id !== "flashcards-step-9") ||
    hintCoachmark.isActive;

  const handleSelectBox = useCallback(
    (boxName: keyof BoxesState) => {
      if (boxSelectionLocked) {
        handleBlockedBoxInteraction(boxName);
        return;
      }
      const now = Date.now();
      const isSameBox =
        boxSpamRef.current.box === boxName &&
        now - boxSpamRef.current.ts < BOX_SPAM_WINDOW_MS;

      if (isSameBox) {
        boxSpamRef.current.count += 1;
      } else {
        boxSpamRef.current = { box: boxName, ts: now, count: 1 };
      }
      boxSpamRef.current.ts = now;

      if (
        !isCoachmarkActiveRef.current &&
        boxSpamRef.current.count >= BOX_SPAM_THRESHOLD
      ) {
        triggerQuote({
          trigger: `quote_box_spam_${boxName}`,
          category: "box_spam",
          cooldownMs: BOX_SPAM_COOLDOWN_MS,
          respectGlobalCooldown: false, // zawsze pokaż, nawet gdy inny cytat był niedawno
        });
        boxSpamRef.current.count = 0;
      }

      setTutorialEventCompleted("box_selected", boxName);

      handleBoxFaceSelection(boxName);
      previousFaceActiveBoxRef.current = boxName;
      baseHandleSelectBox(boxName);
    },
    [
      baseHandleSelectBox,
      boxSelectionLocked,
      handleBlockedBoxInteraction,
      handleBoxFaceSelection,
      setTutorialEventCompleted,
      triggerQuote,
    ],
  );

  const actionsPositionNudge = useActionsPositionNudge({
    isFocused,
    actionButtonsPosition,
    setActionButtonsPosition,
    shouldShowBoxes,
    shouldRenderLoadingOverlay,
    isCoachmarkActive: coachmark.isActive,
    isCoachmarkPendingStart: coachmark.isPendingStart,
    isHintCoachmarkActive: hintCoachmark.isActive,
    isHintCoachmarkPendingStart: hintCoachmark.isPendingStart,
    t,
  });
  actionsPositionNudgeAnsweredRef.current =
    actionsPositionNudge.onAnsweredForNudge;

  const introModeActive = boxZeroEnabled && activeBox === "boxZero";
  const isIntroMode = Boolean(introModeActive && correction?.mode === "intro");
  const showCorrectionInputs = Boolean(
    correction && (displayResult === false || isIntroMode),
  );
  const { isExplanationVisible, isExplanationPending } = getExplanationState({
    selectedItem,
    result: displayResult,
    showCorrectionInputs,
    showExplanationEnabled,
    explanationOnlyOnWrong,
  });
  const actionState = useFlashcardActionBarState({
    selectedItem,
    selectedItemId,
    answer,
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
    onConfirm: confirmWithTutorial,
    canConfirm,
    onOk: acknowledgeExplanation,
    lastTrueFalseTapRef,
    lastActionCooldownCardIdRef,
    t,
  });
  const {
    emptyAnswerSubmitWarning,
    trueFalseActionsDisabled,
    shouldShowTrueFalseActions,
    showCardActions,
    handleCardActionsConfirm,
    handleCardConfirm,
    cardActionsDownloadDisabled,
    cardActionsConfirmDisabled,
    cardActionsConfirmLabel,
  } = actionState;
  const shouldShowKnowDontKnowAdd =
    shouldShowBoxes &&
    (courseHasOnlyTrueFalse ||
      selectedItem?.type === "true_false" ||
      isKnowDontKnow);
  const areButtonsOnTop = actionButtonsPosition === "top";
  const shouldAnimateScreenLayout =
    !shouldKeepLoadingOverlayVisible && !showLoadingOverlay;
  const studyPresentation = useFlashcardsStudyCoordinator({
    studyLayout,
    isTabletLayout,
    boxesLayout,
    areButtonsOnTop,
    shouldShowBoxes,
    selectedItemId,
    showCardActions,
    shouldShowTrueFalseActions,
    inlineCardActionEligible: showCardActions && selectedItem != null && !isExplanationVisible
      && selectedItem.type !== "true_false" && selectedItem.type !== "know_dont_know",
    shouldAnimateScreenLayout,
    isFocused,
    debugScreen: "flashcards",
    courseId: activeCustomCourseId,
    storageKey,
    displayResult,
    activeBox,
    correction,
    previousKeyboardVisibleRef,
  });
  const { useInlineCardAction } = studyPresentation;
  const {
    shouldReserveBottomButtonsSpace,
    bottomButtonsDockBottomOffset,
    bottomButtonsReservedSpace,
  } = studyPresentation.dock;


  useEffect(() => {
    resetInteractionState();
  }, [activeCustomCourseId, resetInteractionState]);

  useEffect(() => {
    return () => {
      if (uiWarmupTimerRef.current) {
        clearTimeout(uiWarmupTimerRef.current);
      }
    };
  }, []);

  const handleBackToCourses = useCallback(() => router.push("/coursepanel"), [router]);
  const handleEditCard = useCallback((cardId: number) => {
    if (activeCustomCourseId == null) return;
    router.push({
      pathname: "/editflashcard",
      params: { courseId: String(activeCustomCourseId), flashcardId: String(cardId) },
    });
  }, [activeCustomCourseId, router]);
  const inlineCardAction = useMemo(() => useInlineCardAction ? {
    disabled: cardActionsConfirmDisabled,
    label: cardActionsConfirmLabel,
    onCorrectionConfirm: handleCardActionsConfirm,
  } : undefined, [useInlineCardAction, cardActionsConfirmDisabled, cardActionsConfirmLabel, handleCardActionsConfirm]);

  const cardSection = (
    <FlashcardsCardSection
      holdContent={holdCardContent}
      activeBox={activeBox}
      keyboardBridgeInputRef={keyboardBridgeInputRef}
      inlineAction={inlineCardAction}
      activeCustomCourseId={activeCustomCourseId}
      loadError={loadError}
      customCards={customCards}
      customCourse={customCourse}
      isCourseFinishedVisible={isCourseFinishedVisible}
      courseFinishedFlagSource={courseFinishedFlagSource}
      courseFinishedIconProps={courseFinishedIconProps}
      courseFinishedAccuracyLabel={courseFinishedAccuracyLabel}
      courseFinishedTimeLabel={courseFinishedTimeLabel}
      onBackToCourses={handleBackToCourses}
      onEditCard={handleEditCard}
      t={t}
      selectedItem={selectedItem}
      setAnswer={setAnswer}
      answer={answer}
      emptyAnswerSubmitWarning={emptyAnswerSubmitWarning}
      displayResult={displayResult}
      confirm={handleCardConfirm}
      reversed={reversed}
      setResult={setResult}
      correction={correction}
      wrongInputChange={wrongInputChange}
      setCorrectionRewers={setCorrectionRewers}
      introModeActive={introModeActive}
      onHintUpdate={handleHintUpdate}
      shouldStartHintEditing={shouldStartHintEditing}
      hintEditRequestToken={hintEditRequestToken}
      isCardFocusEnabled={isCardFocusEnabled}
      shouldDisableTutorialCardAutofocus={shouldDisableTutorialCardAutofocus}
      focusRequestToken={tutorialCardFocusToken}
      isBetweenCards={isBetweenCards}
      shouldKeepLoadingOverlayVisible={shouldKeepLoadingOverlayVisible}
      showLoadingOverlay={showLoadingOverlay}
      skipCorrectionEnabled={skipCorrection}
      autoSubmitCorrectAnswer={autoSubmitCorrectAnswer}
      hideHints={shouldHideHintsForActiveBox}
      reserveHintSpaceWhenHidden={shouldReserveHintSpaceWhenHidden}
      showExplanationEnabled={showExplanationEnabled}
      explanationOnlyOnWrong={explanationOnlyOnWrong}
    />
  );

  const renderButtons = (position: "top" | "bottom") => (
    <FlashcardsStudyButtons
      position={position}
      isTabletLayout={isTabletLayout}
      dominantHand={dominantHand}
      actionState={actionState}
      contentWidth={flashcardsContentWidth}
      coachmarkId="flashcards-buttons-section"
      trueFalseActionsDisabled={trueFalseActionsDisabled || holdCardContent}
      onCardActionsConfirmPressIn={
        isExplanationVisible ? undefined : primeKeyboardBridgeForCorrection
      }
      onDownload={handleManualAddFlashcards}
      showAddFlashcards={shouldShowKnowDontKnowAdd}
      onAddFlashcards={() => void handleManualAddFlashcards()}
      addFlashcardsDisabled={downloadDisabled || holdCardContent}
      downloadDisabled={cardActionsDownloadDisabled || holdCardContent}
      downloadCoachmarkId="flashcards-add-button"
      confirmCoachmarkId="flashcards-confirm-button"
      confirmDisabled={cardActionsConfirmDisabled || holdCardContent}
    />
  );

  useFlashcardsScrollDiagnostics({
    isFocused,
    selectedItemId,
    answerLength: answer.length,
    displayResult,
    resultPending,
    correctionMode: correction?.mode ?? null,
    isBetweenCards,
    isCompactStudyLayout,
    useInlineCardAction,
    studyLayout,
    bottomButtonsReservedSpace,
    bottomButtonsDockBottomOffset,
    shouldReserveBottomButtonsSpace,
    areButtonsOnTop,
    shouldAnimateScreenLayout,
    windowWidth,
    windowHeight,
  });

  useFlashcardsCompletionCelebration({
    isCourseFinishedVisible,
    setShouldCelebrate,
  });

  const coachmarkLayer = useMemo(
    () =>
      coachmark.isActive
        ? {
            currentStep: guidedFlashcardsCoachmarkStep,
            currentIndex: coachmark.currentIndex,
            totalSteps: coachmark.totalSteps,
            canGoBack: coachmark.canGoBack,
            canGoNext: coachmark.canGoNext,
            onBack: coachmark.goBack,
            onNext: coachmark.goNext,
          }
        : hintCoachmark.isActive
          ? {
              currentStep: guidedHintCoachmarkStep,
              currentIndex: hintCoachmark.currentIndex,
              totalSteps: hintCoachmark.totalSteps,
              canGoBack: hintCoachmark.canGoBack,
              canGoNext: hintCoachmark.canGoNext,
              onBack: hintCoachmark.goBack,
              onNext: hintCoachmark.goNext,
            }
          : null,
    [
      coachmark.canGoBack,
      coachmark.canGoNext,
      coachmark.currentIndex,
      coachmark.goBack,
      coachmark.goNext,
      coachmark.isActive,
      coachmark.totalSteps,
      guidedFlashcardsCoachmarkStep,
      guidedHintCoachmarkStep,
      hintCoachmark.canGoBack,
      hintCoachmark.canGoNext,
      hintCoachmark.currentIndex,
      hintCoachmark.goBack,
      hintCoachmark.goNext,
      hintCoachmark.isActive,
      hintCoachmark.totalSteps,
    ],
  );

  useCoachmarkLayerPortal("flashcards-screen", coachmarkLayer);

  return (
    <View style={styles.container}>
      <KeyboardBridgeInput
        ref={keyboardBridgeInputRef}
        onFocus={() => logFlashcardsScrollDebug("screen.keyboard_bridge.focus", { selectedItemId: selectedItemIdRef.current })}
        onBlur={() => logFlashcardsScrollDebug("screen.keyboard_bridge.blur", { selectedItemId: selectedItemIdRef.current })}
      />
      <Confetti generateConfetti={shouldCelebrate} />
      <CoachmarkAnchor
        id="flashcards-bubble-anchor"
        shape="rect"
        radius={12}
        style={{ position: "absolute", top: 1, left: 1, width: 1, height: 1 }}
      />

      <FlashcardsStudyLayout
        layout={studyPresentation}
        styles={styles}
        cardSection={cardSection}
        topButtons={renderButtons("top")}
        bottomButtons={renderButtons("bottom")}
        isCourseFinishedVisible={isCourseFinishedVisible}
        interactionBlocked={shouldRenderLoadingOverlay}
        boxes={shouldShowBoxes ? {
          debugSizes: __DEV__ && isFocused,
          debugCourseId: activeCustomCourseId,
          boxes,
          activeBox,
          boxZeroEnabled,
          tutorialBoxCountOverrides,
          boxFaces,
          handleSelectBox,
          handleBoxLongPress,
          boxSelectionLocked,
          flashcardsContentWidth,
          t,
        } : null}
      />

      {shouldRenderLoadingOverlay ? (
        <Animated.View
          pointerEvents="auto"
          style={[
            styles.loadingOverlay,
            {
              opacity: shouldKeepLoadingOverlayVisible
                ? 1
                : loadingOverlayOpacity,
            },
          ]}
        >
          <View style={styles.loadingOverlayContent}>
            <ActivityIndicator size="large" color={colors.paragraph} />
          </View>
        </Animated.View>
      ) : null}

      <FlashcardsPeekOverlay
        visible={peekBox !== null}
        boxKey={peekBox}
        cards={peekCards}
        boxZeroEnabled={boxZeroEnabled}
        activeCourseName={customCourse?.name ?? null}
        onClose={closePeek}
        onReturnToUnknown={handleReturnPeekCardToUnknown}
      />
      <NudgeModal
        visible={actionsPositionNudge.isVisible}
        title={t("onboarding.flashcards.actionsPositionNudge.title")}
        confirmLabel={t("onboarding.flashcards.actionsPositionNudge.confirm")}
        onConfirm={() => void actionsPositionNudge.handleConfirm()}
        onClose={actionsPositionNudge.handleClose}
      >
        <PreviewOptionSelector
          options={actionsPositionNudge.options}
          value={actionsPositionNudge.preview}
          onChange={actionsPositionNudge.handlePreviewSelect}
          description={t("onboarding.flashcards.actionsPositionNudge.subtitle")}
          variant="modal"
          imageFit="cover"
          previewAspectRatio={1.02}
          testIDPrefix="flashcards-actions-nudge"
        />
      </NudgeModal>
    </View>
  );
}
