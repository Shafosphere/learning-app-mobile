import FlashcardsPeekOverlay from "@/src/components/Box/Peek/FlashcardsPeek";
import { getResponsiveFlashcardMetrics } from "@/src/components/card/responsiveCardWidth";
import Confetti from "@/src/components/confetti/Confetti";
import { FlashcardsButtons } from "@/src/components/flashcards/FlashcardsButtons";
import { NudgeModal } from "@/src/components/nudge/NudgeModal";
import { useCoachmarkLayerPortal } from "@/src/components/onboarding/CoachmarkLayerPortal";
import { PreviewOptionSelector } from "@/src/components/selection/PreviewOptionSelector";
import { DEFAULT_FLASHCARDS_BATCH_SIZE } from "@/src/config/appConfig";
import { resolveCourseIconProps } from "@/src/constants/customCourse";
import { getFlagSource } from "@/src/constants/languageFlags";
import { OFFICIAL_PACKS } from "@/src/constants/officialPacks";
import { useLearningStats } from "@/src/contexts/LearningStatsContext";
import {
  type StatBurst,
  useNavbarStats,
} from "@/src/contexts/NavbarStatsContext";
import { useQuote } from "@/src/contexts/QuoteContext";
import { useSettings } from "@/src/contexts/SettingsContext";
import { scheduleCustomReview } from "@/src/db/sqlite/db";
import { ensureCourseCompletionRunStarted } from "@/src/features/flashcards/courseCompletionRun";
import { preloadFlashcardImageUris } from "@/src/features/flashcards/flashcardImagePreload";
import { buildFlashcardImagePreloadPlan } from "@/src/features/flashcards/flashcardImagePreloadPlan";
import { useAutoResetFlag } from "@/src/hooks/useAutoResetFlag";
import { useAutoScaleToFit } from "@/src/hooks/useAutoScaleToFit";
import { useBoxesPersistenceSnapshot } from "@/src/hooks/useBoxesPersistenceSnapshot";
import { useBoxFacesController } from "@/src/hooks/useBoxFacesController";
import { useDeviceLayout } from "@/src/hooks/useDeviceLayout";
import { useFlashcardsAutoflow } from "@/src/hooks/useFlashcardsAutoflow";
import {
  type CorrectAnswerMeta,
  useFlashcardsInteraction,
} from "@/src/hooks/useFlashcardsInteraction";
import useSpellchecking from "@/src/hooks/useSpellchecking";
import { FlashcardsBoxesSection } from "@/src/screens/flashcards/FlashcardsScreen/components/FlashcardsBoxesSection";
import { FlashcardsCardSection } from "@/src/screens/flashcards/FlashcardsScreen/components/FlashcardsCardSection";
import { FlashcardsStudyContent } from "@/src/screens/flashcards/FlashcardsScreen/components/FlashcardsStudyContent";
import { useStyles } from "@/src/screens/flashcards/FlashcardsScreen/FlashcardsScreen-styles";
import { useActionsPositionNudge } from "@/src/screens/flashcards/FlashcardsScreen/hooks/useActionsPositionNudge";
import { useFlashcardsCourseData } from "@/src/screens/flashcards/FlashcardsScreen/hooks/useFlashcardsCourseData";
import { useFlashcardsDistribution } from "@/src/screens/flashcards/FlashcardsScreen/hooks/useFlashcardsDistribution";
import { useFlashcardsResultEffects } from "@/src/screens/flashcards/FlashcardsScreen/hooks/useFlashcardsResultEffects";
import {
  BOX_SPAM_COOLDOWN_MS,
  BOX_SPAM_THRESHOLD,
  BOX_SPAM_WINDOW_MS,
  EMPTY_BOXES_STATE,
  SCREEN_LAYOUT_TRANSITION,
  UI_WARMUP_DELAY_MS,
} from "@/src/screens/flashcards/FlashcardsScreen/model/FlashcardsScreen.constants";
import { useFlashcardsActions } from "@/src/screens/flashcards/FlashcardsScreen/hooks/useFlashcardsActions";
import { useFlashcardsBottomDockLayout } from "@/src/screens/flashcards/FlashcardsScreen/hooks/useFlashcardsBottomDockLayout";
import { useFlashcardsTutorials } from "@/src/screens/flashcards/FlashcardsScreen/hooks/useFlashcardsTutorials";
import { formatLearningTime } from "@/src/screens/flashcards/FlashcardsScreen/utils/FlashcardsScreen.utils";
import {
  consumeCourseFinishedPreview,
  subscribeCourseFinishedPreview,
} from "@/src/services/courseFinishedPreview";
import { appendDebugEvent } from "@/src/services/debugEvents";
import {
  returnFlashcardToUnknown,
  subscribeFlashcardReturnedToUnknown,
} from "@/src/services/returnFlashcardToUnknown";
import { registerProtectedDailyActivity } from "@/src/services/streakProtection";
import { BoxesState, WordWithTranslations } from "@/src/types/boxes";
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

// import MediumBoxes from "@/src/components/box/mediumboxes";
export default function Flashcards() {
  const router = useRouter();
  const params = useLocalSearchParams<{ hintTutorialRestartToken?: string }>();
  const styles = useStyles();
  const { width: windowWidth } = useWindowDimensions();
  const cardMetrics = getResponsiveFlashcardMetrics(windowWidth);
  const { isSmallPhoneLayout, isTabletLayout } = useDeviceLayout();
  const flashcardsContentWidth = isTabletLayout ? cardMetrics.width : undefined;
  const { t } = useTranslation();
  const keyboardBridgeInputRef = useRef<TextInput | null>(null);
  const {
    activeCustomCourseId,
    setActiveCustomCourseId,
    boxesLayout,
    flashcardsBatchSize,
    boxZeroEnabled,
    autoflowEnabled,
    explanationOnlyOnWrong,
    showExplanationEnabled,
    skipCorrectionEnabled,
    actionButtonsPosition,
    setActionButtonsPosition,
    dominantHand,
    colors,
  } = useSettings();
  const { registerKnownWord } = useLearningStats();
  const { applyStatBurst, getStatsSnapshot } = useNavbarStats();
  const { triggerQuote } = useQuote();
  const isFocused = useIsFocused();
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

      const baseBurst: StatBurst = {
        masteredDelta: meta.wasNewMastered ? 1 : 0,
        streakDelta: 0,
        promotionsDelta:
          boxKey === "boxOne" ||
          boxKey === "boxTwo" ||
          boxKey === "boxThree" ||
          boxKey === "boxFour"
            ? 1
            : 0,
      };

      const hasBaseDelta =
        baseBurst.masteredDelta > 0 || baseBurst.promotionsDelta > 0;

      void (async () => {
        await meta.logLearningEventPromise;

        let streakDelta: 0 | 1 = 0;
        let streakDaysOverride: number | undefined;
        let shieldCountOverride: 0 | 1 | 2 | undefined;
        try {
          const nextStreak = await registerProtectedDailyActivity();
          const currentStats = getStatsSnapshot();
          if (nextStreak.streakDays !== currentStats.streakDays) {
            if (nextStreak.streakDays > currentStats.streakDays) {
              streakDelta = 1;
            }
            streakDaysOverride = nextStreak.streakDays;
          }
          if (nextStreak.shieldCount !== currentStats.shieldCount) {
            shieldCountOverride = nextStreak.shieldCount;
          }
        } catch (error) {
          console.warn(
            "[Flashcards] Failed to refresh streak after answer",
            error,
          );
        }

        if (
          !hasBaseDelta &&
          streakDelta === 0 &&
          streakDaysOverride == null &&
          shieldCountOverride == null
        ) {
          return;
        }

        applyStatBurst({
          ...baseBurst,
          streakDelta,
          ...(streakDaysOverride == null ? {} : { streakDaysOverride }),
          ...(shieldCountOverride == null ? {} : { shieldCountOverride }),
        });
      })();
    },
    [applyStatBurst, getStatsSnapshot, triggerQuote],
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
    handlePersistHintUpdate,
  } = useFlashcardsCourseData({
    activeCustomCourseId,
    isFocused,
    storageKey,
    setActiveCustomCourseId,
  });
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
  const [hintEditRequestToken, setHintEditRequestToken] = useState(0);
  const [isCourseFinishedPreviewVisible, setIsCourseFinishedPreviewVisible] =
    useState(false);
  const uiWarmupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingOverlayOpacity = useRef(new Animated.Value(1)).current;
  const courseCompletionRunStartedAtRef = useRef<number | null>(null);
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
  const applyCompletionSummaryAnswer = useCallback(
    (answerResult: "ok" | "wrong", durationMs: number) => {
      setCourseCompletionSummary((prev) => ({
        totalAnswers: prev.totalAnswers + 1,
        correctCount: prev.correctCount + (answerResult === "ok" ? 1 : 0),
        wrongCount: prev.wrongCount + (answerResult === "wrong" ? 1 : 0),
        timeMs: prev.timeMs + Math.max(0, durationMs),
      }));
    },
    [setCourseCompletionSummary],
  );
  useEffect(() => {
    courseCompletionRunStartedAtRef.current = courseCompletionRunStartedAt;
  }, [courseCompletionRunStartedAt]);

  const ensureCompletionRunStarted = useCallback(
    (fallbackNowMs?: number) => {
      if (activeCustomCourseId == null) {
        return;
      }
      if (courseCompletionRunStartedAtRef.current != null) {
        return;
      }

      const startedAt = Math.max(0, fallbackNowMs ?? Date.now());
      courseCompletionRunStartedAtRef.current = startedAt;
      setCourseCompletionRunStartedAt(startedAt);
      void ensureCourseCompletionRunStarted(
        activeCustomCourseId,
        startedAt,
      ).catch((error) => {
        console.warn(
          "[Flashcards] Failed to persist completion run start",
          error,
        );
      });
    },
    [activeCustomCourseId, setCourseCompletionRunStartedAt],
  );
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
    clearSelection,
    updateSelectedItem,
    isBetweenCards,
    getQueueForBox,
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
    skipDemotionCorrection: skipCorrection,
    debugContext: {
      screen: "flashcards",
      courseId: activeCustomCourseId,
      storageKey,
    },
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
    boxZeroEnabled,
    flashcardsBatchSize,
  });
  useEffect(() => {
    if (relearningWordIds.length === 0 || learned.length === 0) return;
    const learnedIds = new Set(learned.map((word) => word.id));
    relearningWordIds
      .filter((id) => learnedIds.has(id))
      .forEach((id) => clearWordForRelearning(id));
  }, [clearWordForRelearning, learned, relearningWordIds]);

  useEffect(() => {
    if (!isFocused) return;

    const uris = buildFlashcardImagePreloadPlan({
      selectedItem,
      correction,
      activeBox,
      getQueueForBox,
    });
    preloadFlashcardImageUris(uris);
  }, [activeBox, correction, getQueueForBox, isFocused, selectedItem]);

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
    isSmallPhoneLayout || activeBox === "boxFour" || activeBox === "boxFive";
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

  useEffect(() => {
    return subscribeFlashcardReturnedToUnknown(({ courseId, flashcardId }) => {
      if (activeCustomCourseId !== courseId) return;

      setBoxes((prev) => ({
        boxZero: prev.boxZero.filter((card) => card.id !== flashcardId),
        boxOne: prev.boxOne.filter((card) => card.id !== flashcardId),
        boxTwo: prev.boxTwo.filter((card) => card.id !== flashcardId),
        boxThree: prev.boxThree.filter((card) => card.id !== flashcardId),
        boxFour: prev.boxFour.filter((card) => card.id !== flashcardId),
        boxFive: prev.boxFive.filter((card) => card.id !== flashcardId),
      }));
      setLearned((prev) => prev.filter((card) => card.id !== flashcardId));
      removeUsedWordIds(flashcardId);
      markWordForRelearning(flashcardId);
      setReviewedCardIds((prev) => prev.filter((id) => id !== flashcardId));

      if (selectedItemIdRef.current === flashcardId) {
        resetInteractionState();
      }
    });
  }, [
    activeCustomCourseId,
    markWordForRelearning,
    removeUsedWordIds,
    resetInteractionState,
    setBoxes,
    setLearned,
    setReviewedCardIds,
  ]);

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
    boxZeroEnabled,
    boxes.boxZero,
    isFocused,
    loadedCourseId,
    removeUsedWordIds,
    setBoxes,
  ]);

  useEffect(() => {
    if (
      selectedItem &&
      !customCards.some((card) => card.id === selectedItem.id)
    ) {
      clearSelection();
    }
  }, [clearSelection, customCards, selectedItem]);

  const patchCardEverywhere = useCallback(
    (cardId: number, hintFront: string | null, hintBack: string | null) => {
      const patcher = (item: WordWithTranslations) =>
        item.id === cardId ? { ...item, hintFront, hintBack } : item;

      patchCustomCardHints(cardId, hintFront, hintBack);
      setBoxes((prev) => ({
        boxZero: prev.boxZero.map(patcher),
        boxOne: prev.boxOne.map(patcher),
        boxTwo: prev.boxTwo.map(patcher),
        boxThree: prev.boxThree.map(patcher),
        boxFour: prev.boxFour.map(patcher),
        boxFive: prev.boxFive.map(patcher),
      }));
      setLearned((prev) => prev.map(patcher));
      updateSelectedItem((current) => (current ? patcher(current) : current));
    },
    [patchCustomCardHints, setBoxes, setLearned, updateSelectedItem],
  );

  const handleHintUpdate = useCallback(
    async (
      cardId: number,
      hintFront: string | null,
      hintBack: string | null,
    ) => {
      if (activeCustomCourseId == null) return;
      patchCardEverywhere(cardId, hintFront, hintBack);
      try {
        await handlePersistHintUpdate(cardId, hintFront, hintBack);
      } catch (error) {
        console.error("Failed to update flashcard hint", { cardId, error });
      }
    },
    [activeCustomCourseId, handlePersistHintUpdate, patchCardEverywhere],
  );

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
    (isLoadingData ||
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
  const baseShouldShowBoxes = isCourseDisplayReady;
  const isCourseFinishedActuallyVisible =
    baseShouldShowBoxes &&
    ((remainingNewFlashcardsCount === 0 &&
      totalCardsInBoxes === 0 &&
      selectedItem == null) ||
      (!hasCardsReturnedToUnknown &&
        courseMasteryProgress.cardsCount > 0 &&
        courseMasteryProgress.completedCardsCount >=
          courseMasteryProgress.cardsCount));
  const isCourseFinishedPreviewEligible = __DEV__ && baseShouldShowBoxes;
  const isCourseFinishedVisible =
    isCourseFinishedActuallyVisible ||
    (isCourseFinishedPreviewVisible && isCourseFinishedPreviewEligible);
  const shouldShowBoxes = baseShouldShowBoxes && !isCourseFinishedVisible;

  const tryOpenCourseFinishedPreview = useCallback(() => {
    if (!isFocused) return;
    if (!isCourseFinishedPreviewEligible) return;
    if (!consumeCourseFinishedPreview()) return;

    resetInteractionState();
    clearSelection();
    setBoxes(EMPTY_BOXES_STATE);
    addUsedWordIds(customCards.map((card) => card.id));
    setIsCourseFinishedPreviewVisible(true);
  }, [
    addUsedWordIds,
    clearSelection,
    customCards,
    isCourseFinishedPreviewEligible,
    isFocused,
    resetInteractionState,
    setBoxes,
  ]);

  useEffect(() => {
    const unsubscribe = subscribeCourseFinishedPreview(() => {
      tryOpenCourseFinishedPreview();
    });

    return unsubscribe;
  }, [tryOpenCourseFinishedPreview]);

  useEffect(() => {
    tryOpenCourseFinishedPreview();
  }, [tryOpenCourseFinishedPreview]);

  useEffect(() => {
    if (!isCourseFinishedPreviewVisible) {
      return;
    }
    if (!isFocused || !isCourseFinishedPreviewEligible) {
      setIsCourseFinishedPreviewVisible(false);
    }
  }, [
    isCourseFinishedPreviewEligible,
    isCourseFinishedPreviewVisible,
    isFocused,
  ]);

  const courseFinishedAccuracyLabel =
    courseCompletionSummary.totalAnswers > 0
      ? `${Math.round(
          (courseCompletionSummary.correctCount /
            courseCompletionSummary.totalAnswers) *
            100,
        )}%`
      : "0%";
  const courseFinishedTimeLabel = formatLearningTime(
    courseCompletionSummary.timeMs,
  );
  const courseFinishedFlagSource = useMemo(() => {
    if (!customCourse?.slug) {
      return undefined;
    }

    const manifest = OFFICIAL_PACKS.find(
      (pack) => pack.slug === customCourse.slug,
    );
    const flagLang = manifest?.smallFlag ?? manifest?.sourceLang;
    return flagLang ? getFlagSource(flagLang) : undefined;
  }, [customCourse?.slug]);
  const courseFinishedIconProps = useMemo(() => {
    if (!customCourse) {
      return null;
    }

    return resolveCourseIconProps(
      customCourse.iconId,
      customCourse.iconColor ?? colors.headline,
    );
  }, [customCourse, colors.headline]);
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

  useFlashcardsAutoflow({
    enabled:
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
      void appendDebugEvent("flashcards", event, {
        screen: "flashcards",
        courseId: activeCustomCourseId,
        storageKey,
        ...payload,
      });
    },
  });
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
  const {
    selectedTrueFalseAnswer,
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
  } = useFlashcardsActions({
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
    onConfirm: confirmWithTutorial,
    onOk: acknowledgeExplanation,
    lastTrueFalseTapRef,
    lastActionCooldownCardIdRef,
    t,
  });
  const addButtonDisabled = downloadDisabled;
  const shouldShowFloatingAdd =
    shouldShowBoxes &&
    (courseHasOnlyTrueFalse ||
      selectedItem?.type === "true_false" ||
      isKnowDontKnow);
  const effectiveBoxesLayout = boxesLayout;
  const isCarouselLayout = effectiveBoxesLayout !== "classic";
  const areButtonsOnTop = actionButtonsPosition === "top";
  const carouselMinScale = 0.3;
  const classicBoxesMinScale = isTabletLayout
    ? areButtonsOnTop
      ? 0.72
      : 0.54
    : 0.648;
  const {
    scale: boxesScale,
    scaledHeight: boxesScaledHeight,
    scaleOffsetY,
    onViewportLayout: onBoxesViewportLayout,
    onContentLayout: onBoxesContentLayout,
    needsScrollFallback: boxesNeedScrollFallback,
  } = useAutoScaleToFit({
    minScale: isCarouselLayout ? carouselMinScale : classicBoxesMinScale,
  });
  const {
    bottomButtonsAnchorRef,
    setBottomButtonsHeight,
    measureBottomButtons,
    bottomButtonsOffset,
    shouldRenderBottomButtons,
    shouldReserveBottomButtonsSpace,
    bottomButtonsDockBottomOffset,
    bottomButtonsReservedSpace,
  } = useFlashcardsBottomDockLayout({
    areButtonsOnTop,
    shouldShowBoxes,
    selectedItemId,
    showCardActions,
    shouldShowTrueFalseActions,
    isSmallPhoneLayout,
    isFocused,
    debugScreen: "flashcards",
    courseId: activeCustomCourseId,
    storageKey,
    displayResult,
    activeBox,
    correction,
    previousKeyboardVisibleRef,
  });
  const carouselBottomClearance =
    isCarouselLayout && !areButtonsOnTop
      ? Math.max(56, Math.min(96, bottomButtonsReservedSpace))
      : 0;

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

  const cardSection = (
    <FlashcardsCardSection
      activeCustomCourseId={activeCustomCourseId}
      loadError={loadError}
      customCards={customCards}
      customCourse={customCourse}
      isCourseFinishedVisible={isCourseFinishedVisible}
      courseFinishedFlagSource={courseFinishedFlagSource}
      courseFinishedIconProps={courseFinishedIconProps}
      courseFinishedAccuracyLabel={courseFinishedAccuracyLabel}
      courseFinishedTimeLabel={courseFinishedTimeLabel}
      onBackToCourses={() => router.push("/coursepanel")}
      t={t}
      selectedItem={selectedItem}
      setAnswer={setAnswer}
      answer={answer}
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
      hideHints={shouldHideHintsForActiveBox}
      showExplanationEnabled={showExplanationEnabled}
      explanationOnlyOnWrong={explanationOnlyOnWrong}
    />
  );

  const renderButtons = (position: "top" | "bottom") => (
    <FlashcardsButtons
      position={position}
      align={
        position === "bottom" && isTabletLayout
          ? dominantHand === "left"
            ? "left"
            : dominantHand === "center"
              ? "center"
            : "right"
          : "center"
      }
      contentWidth={flashcardsContentWidth}
      coachmarkId="flashcards-buttons-section"
      showTrueFalseActions={shouldShowTrueFalseActions}
      trueFalseActionsDisabled={trueFalseActionsDisabled}
      onTrueFalseAnswer={handleTrueFalseAnswer}
      trueFalseActionsMode={trueFalseActionsMode}
      onTrueFalseOk={handleTrueFalseOk}
      trueFalseButtonsVariant={effectiveTrueFalseButtonsVariant}
      selectedTrueFalseAnswer={selectedTrueFalseAnswer}
      showCardActions={showCardActions}
      onCardActionsConfirm={handleCardActionsConfirm}
      onCardActionsConfirmPressIn={
        isExplanationVisible ? undefined : primeKeyboardBridgeForCorrection
      }
      onDownload={handleManualAddFlashcards}
      downloadDisabled={cardActionsDownloadDisabled}
      downloadCoachmarkId="flashcards-add-button"
      confirmCoachmarkId="flashcards-confirm-button"
      confirmDisabled={cardActionsConfirmDisabled}
      confirmLabel={cardActionsConfirmLabel}
    />
  );

  const boxesScaleOffsetY = scaleOffsetY;
  const shouldAnimateScreenLayout =
    !shouldKeepLoadingOverlayVisible && !showLoadingOverlay;
  const screenSectionLayout = shouldAnimateScreenLayout
    ? SCREEN_LAYOUT_TRANSITION
    : undefined;
  const isTabletCenteredStudyLayout = isTabletLayout && shouldShowBoxes;
  const isTabletCompactBoxesLayout =
    isTabletCenteredStudyLayout && areButtonsOnTop;

  const wasCourseFinishedVisibleRef = useRef(false);

  useEffect(() => {
    if (isCourseFinishedVisible && !wasCourseFinishedVisibleRef.current) {
      setShouldCelebrate(false);
      requestAnimationFrame(() => {
        setShouldCelebrate(true);
      });
    }

    wasCourseFinishedVisibleRef.current = isCourseFinishedVisible;
  }, [isCourseFinishedVisible]);

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

  const topButtons = renderButtons("top");

  const boxesSection = shouldShowBoxes ? (
    <FlashcardsBoxesSection
      styles={styles}
      screenSectionLayout={screenSectionLayout}
      boxes={boxes}
      activeBox={activeBox}
      boxZeroEnabled={boxZeroEnabled}
      tutorialBoxCountOverrides={tutorialBoxCountOverrides}
      boxFaces={boxFaces}
      handleSelectBox={handleSelectBox}
      handleBoxLongPress={handleBoxLongPress}
      handleManualAddFlashcards={handleManualAddFlashcards}
      effectiveBoxesLayout={effectiveBoxesLayout}
      boxSelectionLocked={boxSelectionLocked}
      shouldShowFloatingAdd={shouldShowFloatingAdd}
      addButtonDisabled={addButtonDisabled}
      isSmallPhoneLayout={isSmallPhoneLayout}
      isTabletLayout={isTabletLayout}
      isTabletCompactBoxesLayout={isTabletCompactBoxesLayout}
      areButtonsOnTop={areButtonsOnTop}
      flashcardsContentWidth={flashcardsContentWidth}
      boxesScale={boxesScale}
      boxesScaledHeight={boxesScaledHeight}
      boxesScaleOffsetY={boxesScaleOffsetY}
      boxesNeedScrollFallback={boxesNeedScrollFallback}
      carouselBottomClearance={carouselBottomClearance}
      onBoxesViewportLayout={onBoxesViewportLayout}
      onBoxesContentLayout={onBoxesContentLayout}
      t={t}
    />
  ) : null;

  const studyContent = (
    <FlashcardsStudyContent
      styles={styles}
      screenSectionLayout={screenSectionLayout}
      cardSection={cardSection}
      topButtons={topButtons}
      boxesSection={boxesSection}
      isCourseFinishedVisible={isCourseFinishedVisible}
      showTopButtons={areButtonsOnTop && shouldShowBoxes}
    />
  );

  return (
    <View style={styles.container}>
      <TextInput
        ref={keyboardBridgeInputRef}
        style={styles.keyboardBridgeInput}
        value=""
        caretHidden
        autoCorrect={false}
        spellCheck={false}
        autoCapitalize="none"
        importantForAutofill="no"
        textContentType="none"
      />
      <Confetti generateConfetti={shouldCelebrate} />
      <CoachmarkAnchor
        id="flashcards-bubble-anchor"
        shape="rect"
        radius={12}
        style={{ position: "absolute", top: 1, left: 1, width: 1, height: 1 }}
      />

      <View
        testID="flashcards-content"
        style={[
          styles.content,
          shouldReserveBottomButtonsSpace
            ? { paddingBottom: bottomButtonsReservedSpace }
            : null,
        ]}
        pointerEvents={shouldRenderLoadingOverlay ? "none" : "auto"}
      >
        {isTabletCenteredStudyLayout ? (
          <View
            testID="flashcards-study-stack"
            style={[styles.studyStack, styles.tabletCenteredStudyStack]}
          >
            {studyContent}
          </View>
        ) : (
          studyContent
        )}

        {shouldRenderBottomButtons ? (
          <View
            style={[
              styles.bottomButtonsDock,
              { bottom: bottomButtonsDockBottomOffset },
            ]}
            pointerEvents="box-none"
          >
            <View
              ref={bottomButtonsAnchorRef}
              onLayout={(event) => {
                const nextHeight = event.nativeEvent.layout.height;
                setBottomButtonsHeight((prev) =>
                  Math.abs(prev - nextHeight) < 1 ? prev : nextHeight,
                );
                measureBottomButtons();
              }}
              collapsable={false}
              style={styles.bottomButtonsWrapper}
            >
              <Animated.View
              style={{
                width: "100%",
                transform: [
                  {
                    translateY: Animated.multiply(bottomButtonsOffset, -1),
                    },
                  ],
                }}
              >
                {renderButtons("bottom")}
              </Animated.View>
            </View>
          </View>
        ) : null}
      </View>

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
