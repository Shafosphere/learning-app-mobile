import { FlashcardsStudyLayout } from "@/src/features/flashcards/study/components/FlashcardsStudyLayout";
import { useFlashcardsStudyLayout } from "@/src/features/flashcards/study/hooks/useFlashcardsStudyLayout";
import { useFlashcardsStudyCoordinator } from "@/src/features/flashcards/study/hooks/useFlashcardsStudyCoordinator";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import Card from "@/src/components/card/card";
import { getResponsiveFlashcardMetrics } from "@/src/components/card/responsiveCardWidth";
import FlashcardsPeekOverlay from "@/src/components/Box/Peek/FlashcardsPeek";
import Confetti from "@/src/components/confetti/Confetti";
import { FlashcardsStudyButtons } from "@/src/features/flashcards/study/components/FlashcardsStudyButtons";
import { KeyboardBridgeInput } from "@/src/features/flashcards/study/components/KeyboardBridgeInput";
import { useCoachmarkLayerPortal } from "@/src/components/onboarding/CoachmarkLayerPortal";
import { REVIEW_FLASHCARDS_COACHMARK_STEPS } from "@/src/constants/coachmarkFlows";
import { useFlashcardsStatsBurst } from "@/src/features/flashcards/study/hooks/useFlashcardsStatsBurst";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useAutoResetFlag } from "@/src/hooks/useAutoResetFlag";
import { useBoxFacesController } from "@/src/hooks/useBoxFacesController";
import { useCoachmarkFlow } from "@/src/hooks/useCoachmarkFlow";
import { useDeviceLayout } from "@/src/hooks/useDeviceLayout";
import { useFlashcardActionBarState } from "@/src/features/flashcards/study/hooks/useFlashcardActionBarState";
import { useFlashcardImagePreload } from "@/src/features/flashcards/useFlashcardImagePreload";
import { appendDebugEvent } from "@/src/services/debugEvents";
import { returnFlashcardToUnknown } from "@/src/services/returnFlashcardToUnknown";
import useSpellchecking from "@/src/hooks/useSpellchecking";
import { BoxesState } from "@/src/types/boxes";
import { useLocalSearchParams } from "expo-router";
import { CoachmarkAnchor } from "@edwardloopez/react-native-coachmark";
import {
  Image as RNImage,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { imageMaps } from "@/src/constants/imageMaps";
import {
  REVIEW_MISTAKE_NUDGE_PREVIEW_FRONT_IMAGE,
} from "./model/reviewFlashcards.constants";
import { useReviewFlashcardsAnswerFlow } from "./hooks/useReviewFlashcardsAnswerFlow";
import { useReviewFlashcardsSession } from "./hooks/useReviewFlashcardsSession";
import { useReviewMistakeNudge } from "./hooks/useReviewMistakeNudge";
import { useReviewMutationQueue } from "./hooks/useReviewMutationQueue";
import { ReviewMistakeBatchModal } from "./components/ReviewMistakeBatchModal";
import { useStyles } from "@/src/features/flashcards/study/study.styles";

// Review session loads due cards and persists answers through review-specific hooks.
export default function ReviewFlashcardsScreen() {
  const params = useLocalSearchParams<{
    courseId?: string;
    onboarding?: string;
    mistakeNudgePreviewToken?: string;
  }>();
  const styles = useStyles();
  const { width: windowWidth } = useWindowDimensions();
  const cardMetrics = getResponsiveFlashcardMetrics(windowWidth);
  const { isTabletLayout } = useDeviceLayout();
  const flashcardsContentWidth = isTabletLayout ? cardMetrics.width : undefined;
  const isFocused = useIsFocused();
  const { t } = useTranslation();
  const keyboardBridgeInputRef = useRef<TextInput | null>(null);
  const emitStatsBurst = useFlashcardsStatsBurst(
    "[Review] Failed to refresh streak after answer",
  );
  const settings = useSettings();
  const {
    actionButtonsPosition,
    dominantHand,
    cancelTodayLearningReminderSchedule,
    getCustomCourseShowExplanationEnabled,
    getCustomCourseExplanationOnlyOnWrong,
    ignoreDiacriticsInSpellcheck,
    learningRemindersEnabled,
    autoSubmitCorrectAnswer,
  } = settings;
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
      const previewFlagUris = [
        imageMaps.europeFlags["pl.svg"],
        imageMaps.europeFlags["de.svg"],
        imageMaps.europeFlags["fr.svg"],
        imageMaps.europeFlags["it.svg"],
      ].map((source) => RNImage.resolveAssetSource(source).uri);
      const previewPairs = [
        ["warning road sign", t("flashcards.card.reviewMistakeNudge.preview.back")],
        ["pedestrian crossing", "przejście dla pieszych"],
        ["speed limit", "ograniczenie prędkości"],
        ["$\\frac{3}{4} + \\frac{1}{8}$", "$\\frac{7}{8}$"],
        ["Rozwiąż równanie $2x^2 - 5x - 3 = 0$", "$x = 3$ lub $x = -\\frac{1}{2}$"],
        ["$\\sqrt{144} + \\sqrt{81}$", "$21$"],
        ["Prawdopodobieństwo zdarzenia przeciwnego", "$P(A') = 1 - P(A)$"],
        ["Długi tekst awersu sprawdzający obcięcie zawartości w bardzo wąskim kafelku", "Długi rewers również nie może rozepchnąć widoku ani przycisków"],
      ] as const;
      setMistakeNudge({
        cards: Array.from({ length: 18 }, (_, index) => {
          const [text, translation] = previewPairs[index % previewPairs.length];
          return {
            card: {
              id: -index - 1,
              text,
              translations: [translation],
              flipped: false,
              stage: index % 5,
              ...(index % 3 === 0
                ? { imageFront: previewFlagUris[index % previewFlagUris.length] }
                : index % 5 === 0
                  ? { imageBack: previewFlagUris[index % previewFlagUris.length] }
                  : index % 7 === 0
                    ? { imageFront: REVIEW_MISTAKE_NUDGE_PREVIEW_FRONT_IMAGE }
                  : {}),
            },
            box: "boxTwo",
            wrongStreak: index % 2 === 0 ? 3 : 6,
          };
        }),
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
    getQueueForBox,
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
    mistakeNudgeActive: false,
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
      void emitStatsBurst({
        logLearningEventPromise,
        deltas: {
          masteredDelta: 0,
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
    [emitStatsBurst],
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
    canConfirm,
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
    mistakeNudgeActive: false,
    handleBoxFaceCorrectAnswer,
    handleBoxFaceWrongAnswer,
    handleStatsBurst,
    setShouldCelebrate,
    keyboardBridgeInputRef,
  });

  useFlashcardImagePreload({
    isFocused,
    selectedItem,
    correction,
    activeBox,
    getQueueForBox,
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
    (mistakeNudge != null && !hasCardsInSession) ||
    pendingDbMutationForSelectedCard ||
    isBetweenCards;
  const actionState = useFlashcardActionBarState({
    selectedItem,
    selectedItemId,
    answer,
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
    canConfirm,
    onOk: acknowledgeExplanation,
    t,
  });
  const {
    emptyAnswerSubmitWarning,
    isActionCooldownActive,
    shouldShowTrueFalseActions,
    showCardActions,
    handleCardActionsConfirm,
    handleCardConfirm,
    cardActionsConfirmDisabled,
    cardActionsConfirmLabel,
  } = actionState;
  const areButtonsOnTop = actionButtonsPosition === "top";
  const studyLayout = useFlashcardsStudyLayout({
    isTabletLayout,
    boxesLayout: "classic",
    areButtonsOnTop,
    isFocused,
  });
  const studyPresentation = useFlashcardsStudyCoordinator({
    studyLayout,
    isTabletLayout,
    boxesLayout: "classic",
    areButtonsOnTop,
    shouldShowBoxes: true,
    selectedItemId,
    showCardActions,
    shouldShowTrueFalseActions,
    inlineCardActionEligible: showCardActions && selectedItem != null && !isExplanationVisible
      && selectedItem.type !== "true_false" && selectedItem.type !== "know_dont_know",
    shouldAnimateScreenLayout: true,
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
  const { useInlineCardAction } = studyPresentation;

  const mistakeNudgeCards = mistakeNudge?.cards ?? [];

  const renderButtons = (position: "top" | "bottom") => (
    <FlashcardsStudyButtons
      position={position}
      isTabletLayout={isTabletLayout}
      dominantHand={dominantHand}
      actionState={actionState}
      contentWidth={flashcardsContentWidth}
      onDownload={async () => undefined}
      downloadCoachmarkId="review-flashcards-add-button"
      confirmCoachmarkId="review-flashcards-confirm-button"
    />
  );

  const cardSection = (
    <CoachmarkAnchor id="review-flashcards-card-section" shape="rect" radius={20}>
      <View collapsable={false}>
        <Card
          activeBox={activeBox}
          contentDebugSource="review"
          keyboardBridgeInputRef={keyboardBridgeInputRef}
          inlineAction={useInlineCardAction ? {
            disabled: cardActionsConfirmDisabled,
            label: cardActionsConfirmLabel,
            onCorrectionConfirm: handleCardActionsConfirm,
          } : undefined}
          selectedItem={selectedItem}
          setAnswer={setAnswer}
          answer={answer}
          emptyAnswerSubmitWarning={emptyAnswerSubmitWarning}
          result={displayResult}
          confirm={handleCardConfirm}
          reversed={reversed}
          setResult={setResult}
          correction={correction}
          wrongInputChange={wrongInputChange}
          setCorrectionRewers={setCorrectionReversed}
          introMode={false}
          hideHints={studyLayout.isCompactStudyLayout}
          isFocused={isFocused && !isLoading}
          isBetweenCards={isBetweenCards || isActionCooldownActive}
          autoSubmitCorrectAnswer={autoSubmitCorrectAnswer}
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
      <KeyboardBridgeInput
        ref={keyboardBridgeInputRef}
      />
      <CoachmarkAnchor
        id="review-flashcards-bubble-anchor"
        shape="rect"
        radius={12}
        style={{ position: "absolute", top: 1, left: 1, width: 1, height: 1 }}
      />
      <Confetti generateConfetti={shouldCelebrate} />

      <FlashcardsStudyLayout
        layout={studyPresentation}
        styles={styles}
        testIDPrefix="review-flashcards"
        bottomButtonsCoachmarkId="review-flashcards-buttons-section"
        cardSection={cardSection}
        topButtons={topButtons}
        bottomButtons={renderButtons("bottom")}
        isCourseFinishedVisible={false}
        interactionBlocked={false}
        boxes={{
          coachmarkId: "review-flashcards-boxes-section",
          countsCoachmarkId: "review-flashcards-box-counts",
          testID: "review-flashcards-boxes-wrapper",
          boxes,
          activeBox,
          boxZeroEnabled: true,
          boxFaces,
          handleSelectBox,
          handleBoxLongPress,
          boxSelectionLocked: isBetweenCards || isLoading || correction != null
            || (mistakeNudge != null && !hasCardsInSession),
          flashcardsContentWidth,
          t,
        }}
      />

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
      <ReviewMistakeBatchModal
        visible={mistakeNudge != null && !hasCardsInSession}
        cards={mistakeNudgeCards}
        confirming={mistakeNudge?.confirming ?? false}
        error={mistakeNudge?.error ?? false}
        onKeepReviewing={handleKeepReviewingAfterMistakeNudge}
        onConfirm={(selectedCardIds) =>
          void handleReturnMistakeNudgeToUnknown(selectedCardIds)
        }
      />
    </View>
  );
}
