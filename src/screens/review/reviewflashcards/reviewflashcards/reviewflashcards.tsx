import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import Card from "@/src/components/card/card";
import { getResponsiveFlashcardMetrics } from "@/src/components/card/responsiveCardWidth";
import { PromptImage } from "@/src/components/card/subcomponents/PromptImage";
import FlashcardsPeekOverlay from "@/src/components/Box/Peek/FlashcardsPeek";
import Confetti from "@/src/components/confetti/Confetti";
import { FlashcardsButtons } from "@/src/components/flashcards/FlashcardsButtons";
import { NudgeModal } from "@/src/components/nudge/NudgeModal";
import { useCoachmarkLayerPortal } from "@/src/components/onboarding/CoachmarkLayerPortal";
import { REVIEW_FLASHCARDS_COACHMARK_STEPS } from "@/src/constants/coachmarkFlows";
import {
  type StatBurst,
  useNavbarStats,
} from "@/src/contexts/NavbarStatsContext";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useAutoScaleToFit } from "@/src/hooks/useAutoScaleToFit";
import { useAutoResetFlag } from "@/src/hooks/useAutoResetFlag";
import { useBoxFacesController } from "@/src/hooks/useBoxFacesController";
import { useCoachmarkFlow } from "@/src/hooks/useCoachmarkFlow";
import { useDeviceLayout } from "@/src/hooks/useDeviceLayout";
import { FlashcardsBoxesSection } from "@/src/screens/flashcards/FlashcardsScreen/components/FlashcardsBoxesSection";
import { FlashcardsStudyContent } from "@/src/screens/flashcards/FlashcardsScreen/components/FlashcardsStudyContent";
import { useFlashcardActionBarState } from "@/src/screens/flashcards/FlashcardsScreen/hooks/useFlashcardsActions";
import { useFlashcardsBottomDockLayout } from "@/src/screens/flashcards/FlashcardsScreen/hooks/useFlashcardsBottomDockLayout";
import { appendDebugEvent } from "@/src/services/debugEvents";
import { returnFlashcardToUnknown } from "@/src/services/returnFlashcardToUnknown";
import { registerProtectedDailyActivity } from "@/src/services/streakProtection";
import useSpellchecking from "@/src/hooks/useSpellchecking";
import { BoxesState } from "@/src/types/boxes";
import { useLocalSearchParams } from "expo-router";
import { CoachmarkAnchor } from "@edwardloopez/react-native-coachmark";
import {
  Animated,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { LinearTransition } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import {
  REVIEW_MISTAKE_NUDGE_PREVIEW_FRONT_IMAGE,
} from "./model/reviewFlashcards.constants";
import { useReviewFlashcardsAnswerFlow } from "./hooks/useReviewFlashcardsAnswerFlow";
import { useReviewFlashcardsSession } from "./hooks/useReviewFlashcardsSession";
import { useReviewMistakeNudge } from "./hooks/useReviewMistakeNudge";
import { useReviewMutationQueue } from "./hooks/useReviewMutationQueue";
import { useStyles } from "./reviewflashcards-styles";

const SCREEN_LAYOUT_TRANSITION = LinearTransition.duration(420);

// Lightweight placeholder: keeps UI pieces but no data fetching or persistence.
export default function ReviewFlashcardsPlaceholder() {
  const params = useLocalSearchParams<{
    courseId?: string;
    onboarding?: string;
    mistakeNudgePreviewToken?: string;
  }>();
  const styles = useStyles();
  const { width: windowWidth } = useWindowDimensions();
  const cardMetrics = getResponsiveFlashcardMetrics(windowWidth);
  const { isSmallPhoneLayout, isTabletLayout } = useDeviceLayout();
  const flashcardsContentWidth = isTabletLayout ? cardMetrics.width : undefined;
  const isFocused = useIsFocused();
  const { t } = useTranslation();
  const keyboardBridgeInputRef = useRef<TextInput | null>(null);
  const { applyStatBurst, getStatsSnapshot } = useNavbarStats();
  const settings = useSettings();
  const {
    actionButtonsPosition,
    dominantHand,
    cancelTodayLearningReminderSchedule,
    getCustomCourseShowExplanationEnabled,
    getCustomCourseExplanationOnlyOnWrong,
    ignoreDiacriticsInSpellcheck,
    learningRemindersEnabled,
  } = settings;
  const mistakeNudgeTextColor = settings.colors?.paragraph ?? "#1f2937";
  const mistakeNudgeTitleColor = settings.colors?.headline ?? "#111827";
  const checkSpelling = useSpellchecking();
  const [shouldCelebrate, setShouldCelebrate] = useState(false);
  const resetCelebrate = useCallback(() => setShouldCelebrate(false), []);
  useAutoResetFlag(shouldCelebrate, resetCelebrate);
  const courseId = useMemo(() => {
    const id = params?.courseId;
    const num =
      typeof id === "string"
        ? Number(id)
        : Array.isArray(id)
          ? Number(id[0])
          : NaN;
    return Number.isFinite(num) ? num : null;
  }, [params?.courseId]);
  const shouldStartReviewCoachmark = params?.onboarding === "review-flashcards";
  const previousKeyboardVisibleRef = useRef<boolean | null>(null);
  const mistakeNudgePreviewToken =
    typeof params?.mistakeNudgePreviewToken === "string"
      ? params.mistakeNudgePreviewToken
      : Array.isArray(params?.mistakeNudgePreviewToken)
        ? params.mistakeNudgePreviewToken[0]
        : undefined;
  useEffect(() => {
    void appendDebugEvent("review", "review.enter", {
      screen: "review",
      courseId,
    });
    return () => {
      void appendDebugEvent("review", "review.exit", {
        screen: "review",
        courseId,
      });
    };
  }, [courseId]);

  const showExplanationEnabled = useMemo(
    () =>
      courseId != null ? getCustomCourseShowExplanationEnabled(courseId) : true,
    [courseId, getCustomCourseShowExplanationEnabled]
  );
  const explanationOnlyOnWrong = useMemo(
    () =>
      courseId != null ? getCustomCourseExplanationOnlyOnWrong(courseId) : false,
    [courseId, getCustomCourseExplanationOnlyOnWrong]
  );
  const [layout] = useState<"classic" | "carousel">("classic");
  const [isLoading, setIsLoading] = useState(false);
  const reviewMutationQueueRef = useRef(new Map<number, Promise<unknown>>());
  const removeCardFromSessionRef = useRef<
    (cardId: number, box: keyof BoxesState) => void
  >(() => {});
  const setQueueNextRef = useRef<(value: boolean) => void>(() => {});
  const setAnswerRef = useRef<(value: string) => void>(() => {});
  const setResultRef = useRef<(value: boolean | null) => void>(() => {});
  const setIsBetweenCardsRef = useRef<(value: boolean) => void>(() => {});
  const setPendingExplanationMoveRef = useRef<
    ReturnType<typeof useReviewFlashcardsAnswerFlow>["setPendingExplanationMove"]
  >(() => {});
  const correctionActiveRef = useRef(false);
  const isBetweenCardsRef = useRef(false);
  const clearTransitionTimerRef = useRef<() => void>(() => {});
  const resetAnswerFlowRef = useRef<() => void>(() => {});
  const getCorrectionActive = useCallback(() => correctionActiveRef.current, []);
  const getIsBetweenCards = useCallback(() => isBetweenCardsRef.current, []);
  const clearTransitionTimerBridge = useCallback(() => {
    clearTransitionTimerRef.current();
  }, []);
  const boxFaceSelectionRef = useRef<(box: keyof BoxesState) => void>(() => {});
  const blockedBoxInteractionRef = useRef<(box: keyof BoxesState) => void>(() => {});
  const handleBoxFaceSelectionBridge = useCallback((box: keyof BoxesState) => {
    boxFaceSelectionRef.current(box);
  }, []);
  const handleBlockedBoxInteractionBridge = useCallback((box: keyof BoxesState) => {
    blockedBoxInteractionRef.current(box);
  }, []);
  const removeCardFromSessionBridge = useCallback(
    (cardId: number, box: keyof BoxesState) => {
      removeCardFromSessionRef.current(cardId, box);
    },
    []
  );
  const setQueueNextBridge = useCallback((value: boolean) => {
    setQueueNextRef.current(value);
  }, []);
  const setAnswerBridge = useCallback((value: string) => {
    setAnswerRef.current(value);
  }, []);
  const setResultBridge = useCallback((value: boolean | null) => {
    setResultRef.current(value);
  }, []);
  const setIsBetweenCardsBridge = useCallback((value: boolean) => {
    setIsBetweenCardsRef.current(value);
  }, []);
  const setPendingExplanationMoveBridge: ReturnType<
    typeof useReviewFlashcardsAnswerFlow
  >["setPendingExplanationMove"] = useCallback((value) => {
    setPendingExplanationMoveRef.current(value);
  }, []);

  const { enqueueReviewMutation, hasPendingMutation } = useReviewMutationQueue({
    reviewMutationQueueRef,
  });

  const {
    mistakeNudge,
    setMistakeNudge,
    queueMistakeNudgeCheck,
    finalizeWrongReviewCard,
    handleKeepReviewingAfterMistakeNudge,
    handleReturnMistakeNudgeToUnknown,
  } = useReviewMistakeNudge({
    courseId,
    enqueueReviewMutation,
    removeCardFromSession: removeCardFromSessionBridge,
    setAnswer: setAnswerBridge,
    setResult: setResultBridge,
    setQueueNext: setQueueNextBridge,
    setIsBetweenCards: setIsBetweenCardsBridge,
    setPendingExplanationMove: setPendingExplanationMoveBridge,
  });

  useEffect(() => {
    if (!__DEV__ || !mistakeNudgePreviewToken) return;

    const timer = setTimeout(() => {
      setMistakeNudge({
        card: {
          id: -1,
          text: "",
          translations: [t("flashcards.card.reviewMistakeNudge.preview.back")],
          flipped: false,
          stage: 2,
          imageFront: REVIEW_MISTAKE_NUDGE_PREVIEW_FRONT_IMAGE,
        },
        box: "boxTwo",
        wrongStreak: 3,
        confirming: false,
        error: false,
        preview: true,
      });
    }, 120);

    return () => clearTimeout(timer);
  }, [mistakeNudgePreviewToken, setMistakeNudge, t]);

  const handleSessionReset = useCallback(() => {
    setMistakeNudge(null);
    resetAnswerFlowRef.current();
  }, [setMistakeNudge]);
  const {
    boxes,
    setBoxes,
    activeBox,
    setActiveBox,
    selectedItem,
    selectedItemId,
    setQueueNext,
    peekBox,
    peekCards,
    upcomingPeekCards,
    isUpcomingPeekLoading,
    upcomingPeekError,
    hasCardsInSession,
    reloadSession,
    removeCardFromSession,
    handleSelectBox,
    handleBoxLongPress,
    closePeek,
    removePeekCard,
  } = useReviewFlashcardsSession({
    courseId,
    isLoading,
    setIsLoading,
    correctionActive: getCorrectionActive,
    mistakeNudgeActive: mistakeNudge != null,
    isBetweenCards: getIsBetweenCards,
    handleBlockedBoxInteraction: handleBlockedBoxInteractionBridge,
    handleBoxFaceSelection: handleBoxFaceSelectionBridge,
    clearTransitionTimer: clearTransitionTimerBridge,
    onSessionReset: handleSessionReset,
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

  useEffect(() => {
    removeCardFromSessionRef.current = removeCardFromSession;
    setQueueNextRef.current = setQueueNext;
    boxFaceSelectionRef.current = handleBoxFaceSelection;
    blockedBoxInteractionRef.current = handleBlockedBoxInteraction;
  }, [
    handleBlockedBoxInteraction,
    handleBoxFaceSelection,
    removeCardFromSession,
    setQueueNext,
  ]);

  const handleStatsBurst = useCallback(
    (boxKey: keyof BoxesState, logLearningEventPromise: Promise<void>) => {
      const baseBurst: StatBurst = {
        masteredDelta: 0,
        streakDelta: 0,
        promotionsDelta:
          boxKey === "boxOne" ||
          boxKey === "boxTwo" ||
          boxKey === "boxThree" ||
          boxKey === "boxFour"
            ? 1
            : 0,
      };

      const hasBaseDelta = baseBurst.promotionsDelta > 0;

      void (async () => {
        await logLearningEventPromise;

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
          console.warn("[Review] Failed to refresh streak after answer", error);
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
    [applyStatBurst, getStatsSnapshot],
  );

  const handleReturnPeekCardToUnknown = useCallback(
    async (cardId: number) => {
      if (courseId == null || peekBox == null) {
        throw new Error("No review course or source box selected.");
      }
      const sourceBox = peekBox;
      await enqueueReviewMutation(cardId, () =>
        returnFlashcardToUnknown({ courseId, flashcardId: cardId })
      );
      removeCardFromSession(cardId, sourceBox);
      removePeekCard(cardId);
    },
    [courseId, enqueueReviewMutation, peekBox, removeCardFromSession, removePeekCard],
  );

  const {
    answer,
    setAnswer,
    setResult,
    displayResult,
    correction,
    wrongInputChange,
    setCorrectionReversed,
    isBetweenCards,
    setIsBetweenCards,
    reversed,
    isExplanationVisible,
    isExplanationPending,
    setPendingExplanationMove,
    handleConfirm,
    acknowledgeExplanation,
    resetAnswerFlow,
    clearTransitionTimer,
  } = useReviewFlashcardsAnswerFlow({
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
    mistakeNudgeActive: mistakeNudge != null,
    handleBoxFaceCorrectAnswer,
    handleBoxFaceWrongAnswer,
    handleStatsBurst,
    setShouldCelebrate,
    keyboardBridgeInputRef,
  });

  useLayoutEffect(() => {
    setAnswerRef.current = setAnswer;
    setResultRef.current = setResult;
    setIsBetweenCardsRef.current = setIsBetweenCards;
    setPendingExplanationMoveRef.current = setPendingExplanationMove;
    correctionActiveRef.current = correction != null;
    isBetweenCardsRef.current = isBetweenCards;
    clearTransitionTimerRef.current = clearTransitionTimer;
    resetAnswerFlowRef.current = resetAnswerFlow;
  }, [
    clearTransitionTimer,
    correction,
    isBetweenCards,
    resetAnswerFlow,
    setAnswer,
    setIsBetweenCards,
    setPendingExplanationMove,
    setResult,
  ]);

  useFocusEffect(
    useCallback(() => {
      void reloadSession();
      return () => {
        clearTransitionTimer();
      };
    }, [clearTransitionTimer, reloadSession]),
  );

  const pendingDbMutationForSelectedCard =
    selectedItemId != null && hasPendingMutation(selectedItemId);
  const externalActionLocked =
    isLoading ||
    mistakeNudge != null ||
    pendingDbMutationForSelectedCard ||
    isBetweenCards;
  const {
    selectedTrueFalseAnswer,
    isActionCooldownActive,
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
  } = useFlashcardActionBarState({
    selectedItem,
    selectedItemId,
    displayResult,
    isBetweenCards,
    correction,
    courseHasOnlyTrueFalse: false,
    courseHasOnlyKnowDontKnow: false,
    isKnowDontKnow: selectedItem?.type === "know_dont_know",
    downloadDisabled: true,
    externalActionLocked,
    shouldShowBoxes: true,
    isExplanationVisible,
    isExplanationPending,
    setAnswer,
    onConfirm: handleConfirm,
    onOk: acknowledgeExplanation,
    t,
  });
  const effectiveLayout = layout;
  const isCarouselLayout = effectiveLayout !== "classic";
  const carouselMinScale = 0.3;
  const areButtonsOnTop = actionButtonsPosition === "top";
  const classicBoxesMinScale = isTabletLayout
    ? areButtonsOnTop
      ? 0.72
      : 0.54
    : 0.72;
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
    bottomButtonsDockBottomOffset,
    bottomButtonsReservedSpace,
  } = useFlashcardsBottomDockLayout({
    areButtonsOnTop,
    shouldShowBoxes: true,
    selectedItemId,
    showCardActions,
    shouldShowTrueFalseActions,
    isSmallPhoneLayout,
    isFocused,
    debugScreen: "review",
    debugCategory: "review",
    courseId,
    storageKey: null,
    displayResult,
    activeBox,
    correction,
    previousKeyboardVisibleRef,
  });
  const carouselBottomClearance =
    isCarouselLayout && !areButtonsOnTop
      ? Math.max(56, Math.min(96, bottomButtonsReservedSpace))
      : 0;

  const mistakeNudgeFrontText = mistakeNudge
    ? mistakeNudge.card.text.trim() ||
      (!mistakeNudge.card.imageFront
        ? t("flashcards.card.peek.emptyContent")
        : "")
    : "";
  const mistakeNudgeBackText = mistakeNudge
    ? mistakeNudge.card.translations[0]?.trim() ||
      (!mistakeNudge.card.imageBack
        ? t("flashcards.card.peek.emptyTranslation")
        : "")
    : "";
  const renderMistakeNudgeSide = (
    label: string,
    value: string,
    imageUri?: string | null
  ) => (
    <View>
      <Text
        style={{
          color: mistakeNudgeTextColor,
          fontSize: 12,
          fontWeight: "800",
          opacity: 0.7,
        }}
      >
        {label}
      </Text>
      {imageUri ? (
        <View style={{ alignItems: "flex-start", marginTop: 6, marginBottom: 6 }}>
          <PromptImage
            uri={imageUri}
            imageStyle={{
              width: 96,
              height: 84,
              maxWidth: 120,
              maxHeight: 96,
              borderRadius: 8,
            }}
          />
        </View>
      ) : null}
      {value ? (
        <Text
          style={{
            color: mistakeNudgeTitleColor,
            fontSize: 16,
            fontWeight: "800",
          }}
        >
          {value}
        </Text>
      ) : null}
    </View>
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
      showTrueFalseActions={shouldShowTrueFalseActions}
      trueFalseActionsDisabled={trueFalseActionsDisabled}
      onTrueFalseAnswer={handleTrueFalseAnswer}
      trueFalseActionsMode={trueFalseActionsMode}
      onTrueFalseOk={handleTrueFalseOk}
      trueFalseButtonsVariant={effectiveTrueFalseButtonsVariant}
      selectedTrueFalseAnswer={selectedTrueFalseAnswer}
      showCardActions={showCardActions}
      onCardActionsConfirm={handleCardActionsConfirm}
      onDownload={async () => undefined}
      downloadDisabled={cardActionsDownloadDisabled}
      downloadCoachmarkId="review-flashcards-add-button"
      confirmCoachmarkId="review-flashcards-confirm-button"
      confirmDisabled={cardActionsConfirmDisabled}
      confirmLabel={cardActionsConfirmLabel}
    />
  );

  const boxesScaleOffsetY = scaleOffsetY;
  const isTabletCenteredStudyLayout = isTabletLayout;
  const isTabletCompactBoxesLayout =
    isTabletCenteredStudyLayout && areButtonsOnTop;
  const cardSection = (
    <CoachmarkAnchor id="review-flashcards-card-section" shape="rect" radius={20}>
      <View collapsable={false}>
        <Card
          selectedItem={selectedItem}
          setAnswer={setAnswer}
          answer={answer}
          result={displayResult}
          confirm={handleCardConfirm}
          reversed={reversed}
          setResult={setResult}
          correction={correction}
          wrongInputChange={wrongInputChange}
          setCorrectionRewers={setCorrectionReversed}
          introMode={false}
          hideHints={isSmallPhoneLayout}
          isFocused={!isLoading}
          isBetweenCards={isBetweenCards || isActionCooldownActive}
          showExplanationEnabled={showExplanationEnabled}
          explanationOnlyOnWrong={explanationOnlyOnWrong}
        />
      </View>
    </CoachmarkAnchor>
  );
  const topButtons = (
    <CoachmarkAnchor
      id="review-flashcards-buttons-section"
      shape="rect"
      radius={24}
    >
      <View collapsable={false}>{renderButtons("top")}</View>
    </CoachmarkAnchor>
  );
  const boxesSection = (
    <FlashcardsBoxesSection
      coachmarkId="review-flashcards-boxes-section"
      countsCoachmarkId="review-flashcards-box-counts"
      testID="review-flashcards-boxes-wrapper"
      styles={styles}
      screenSectionLayout={SCREEN_LAYOUT_TRANSITION}
      boxes={boxes}
      activeBox={activeBox}
      boxZeroEnabled={true}
      tutorialBoxCountOverrides={undefined}
      boxFaces={boxFaces}
      handleSelectBox={handleSelectBox}
      handleBoxLongPress={handleBoxLongPress}
      handleManualAddFlashcards={async () => undefined}
      effectiveBoxesLayout={effectiveLayout}
      boxSelectionLocked={
        isBetweenCards || isLoading || correction != null || mistakeNudge != null
      }
      shouldShowFloatingAdd={false}
      addButtonDisabled={true}
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
  );
  const coachmark = useCoachmarkFlow({
    flowKey: "review-flashcards-guided",
    storageKey: "@review_flashcards_intro_seen_v1",
    shouldStart:
      shouldStartReviewCoachmark && !isLoading && hasCardsInSession,
    steps: REVIEW_FLASHCARDS_COACHMARK_STEPS,
  });
  const coachmarkLayer = useMemo(
    () =>
      coachmark.isActive
        ? {
            currentStep: coachmark.currentStep,
            currentIndex: coachmark.currentIndex,
            totalSteps: coachmark.totalSteps,
            canGoBack: coachmark.canGoBack,
            canGoNext: coachmark.canGoNext,
            onBack: coachmark.goBack,
            onNext: coachmark.goNext,
          }
        : null,
    [
      coachmark.canGoBack,
      coachmark.canGoNext,
      coachmark.currentIndex,
      coachmark.currentStep,
      coachmark.goBack,
      coachmark.goNext,
      coachmark.isActive,
      coachmark.totalSteps,
    ],
  );

  useCoachmarkLayerPortal("review-flashcards-screen", coachmarkLayer);

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
      <CoachmarkAnchor
        id="review-flashcards-bubble-anchor"
        shape="rect"
        radius={12}
        style={{ position: "absolute", top: 1, left: 1, width: 1, height: 1 }}
      />
      <Confetti generateConfetti={shouldCelebrate} />

      <View
        testID="review-flashcards-content"
        style={[
          styles.content,
          shouldRenderBottomButtons
            ? { paddingBottom: bottomButtonsReservedSpace }
            : null,
        ]}
      >
        {isTabletCenteredStudyLayout ? (
          <View
            testID="review-flashcards-study-stack"
            style={[styles.studyStack, styles.tabletCenteredStudyStack]}
          >
            <FlashcardsStudyContent
              styles={styles}
              screenSectionLayout={SCREEN_LAYOUT_TRANSITION}
              cardSection={cardSection}
              topButtons={topButtons}
              boxesSection={boxesSection}
              isCourseFinishedVisible={false}
              showTopButtons={areButtonsOnTop}
            />
          </View>
        ) : (
          <FlashcardsStudyContent
            styles={styles}
            screenSectionLayout={SCREEN_LAYOUT_TRANSITION}
            cardSection={cardSection}
            topButtons={topButtons}
            boxesSection={boxesSection}
            isCourseFinishedVisible={false}
            showTopButtons={areButtonsOnTop}
          />
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
              <CoachmarkAnchor
                id="review-flashcards-buttons-section"
                shape="rect"
                radius={24}
              >
                <View collapsable={false}>
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
              </CoachmarkAnchor>
            </View>
          </View>
        ) : null}
      </View>

      <FlashcardsPeekOverlay
        visible={peekBox !== null}
        boxKey={peekBox}
        cards={peekCards}
        cardLayout="uniform"
        upcomingCards={upcomingPeekCards}
        upcomingLoading={isUpcomingPeekLoading}
        upcomingError={upcomingPeekError}
        activeCourseName={null}
        onClose={closePeek}
        onReturnToUnknown={handleReturnPeekCardToUnknown}
      />
      <NudgeModal
        visible={mistakeNudge != null}
        title={t("flashcards.card.reviewMistakeNudge.title")}
        description={t("flashcards.card.reviewMistakeNudge.description", {
          count: mistakeNudge?.wrongStreak ?? 3,
        })}
        confirmLabel={
          mistakeNudge?.confirming
            ? t("flashcards.card.reviewMistakeNudge.returning")
            : t("flashcards.card.reviewMistakeNudge.confirm")
        }
        confirmDisabled={mistakeNudge?.confirming}
        secondaryLabel={t("flashcards.card.reviewMistakeNudge.keep")}
        onSecondaryPress={handleKeepReviewingAfterMistakeNudge}
        onConfirm={() => void handleReturnMistakeNudgeToUnknown()}
        onClose={handleKeepReviewingAfterMistakeNudge}
      >
        <View style={{ gap: 8, marginTop: 12 }}>
          {renderMistakeNudgeSide(
            t("flashcards.card.reviewMistakeNudge.front"),
            mistakeNudgeFrontText,
            mistakeNudge?.card.imageFront
          )}
          {renderMistakeNudgeSide(
            t("flashcards.card.reviewMistakeNudge.back"),
            mistakeNudgeBackText,
            mistakeNudge?.card.imageBack
          )}
          {mistakeNudge?.error ? (
            <Text
              style={{
                color: mistakeNudgeTextColor,
                fontSize: 13,
                fontWeight: "700",
              }}
            >
              {t("flashcards.card.reviewMistakeNudge.error")}
            </Text>
          ) : null}
        </View>
      </NudgeModal>
    </View>
  );
}
