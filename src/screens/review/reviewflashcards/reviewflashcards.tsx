import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Card from "@/src/components/card/card";
import type { CardCorrectionType } from "@/src/components/card/card-types";
import BoxesCarousel from "@/src/components/Box/Carousel/BoxCarousel";
import Boxes from "@/src/components/Box/List/BoxList";
import FlashcardsPeekOverlay from "@/src/components/Box/Peek/FlashcardsPeek";
import Confetti from "@/src/components/confetti/Confetti";
import { FlashcardsButtons } from "@/src/components/flashcards/FlashcardsButtons";
import { FlashcardsPlaceholderCard } from "@/src/components/flashcards/FlashcardsPlaceholderCard";
import { useCoachmarkLayerPortal } from "@/src/components/onboarding/CoachmarkLayerPortal";
import { REVIEW_FLASHCARDS_COACHMARK_STEPS } from "@/src/constants/coachmarkFlows";
import {
  advanceCustomReview,
  getDueCustomReviewFlashcards,
  logCustomLearningEvent,
  scheduleCustomReview,
} from "@/src/db/sqlite/db";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useAutoScaleToFit } from "@/src/hooks/useAutoScaleToFit";
import { useAutoResetFlag } from "@/src/hooks/useAutoResetFlag";
import { useCoachmarkFlow } from "@/src/hooks/useCoachmarkFlow";
import { useKeyboardBottomOffset } from "@/src/hooks/useKeyboardBottomOffset";
import useSpellchecking from "@/src/hooks/useSpellchecking";
import { BoxesState, WordWithTranslations } from "@/src/types/boxes";
import { stripDiacritics } from "@/src/utils/diacritics";
import { getExplanationState } from "@/src/utils/explanationState";
import { mapReviewCardToWord } from "@/src/utils/flashcardsMapper";
import { playFeedbackSound } from "@/src/utils/soundPlayer";
import { makeTrueFalseHandler } from "@/src/utils/trueFalseAnswer";
import { useLocalSearchParams } from "expo-router";
import { CoachmarkAnchor } from "@edwardloopez/react-native-coachmark";
import { Animated, ScrollView, View } from "react-native";
import Reanimated, { LinearTransition } from "react-native-reanimated";
import { useStyles } from "@/src/screens/flashcards/FlashcardsScreen-styles";

const BOX_SPAM_WINDOW_MS = 2000;
const BOX_SPAM_THRESHOLD = 20;
const LONG_THINK_MS = 12 * 1000;
const SCREEN_LAYOUT_TRANSITION = LinearTransition.duration(420);
const BOTTOM_BUTTONS_MIN_HEIGHT = 50;
const BOTTOM_BUTTONS_DOCK_BOTTOM_OFFSET = 56;

const NON_INTRO_BOXES: readonly (keyof BoxesState)[] = [
  "boxZero",
  "boxOne",
  "boxTwo",
  "boxThree",
  "boxFour",
  "boxFive",
];

const createEmptyBoxes = (): BoxesState => ({
  boxZero: [],
  boxOne: [],
  boxTwo: [],
  boxThree: [],
  boxFour: [],
  boxFive: [],
});

const stageToBox = (stage?: number): keyof BoxesState => {
  const value = typeof stage === "number" ? stage : 0;
  const clamped = Math.max(0, Math.min(value, 5));
  if (clamped === 0) return "boxZero";
  if (clamped === 1) return "boxOne";
  if (clamped === 2) return "boxTwo";
  if (clamped === 3) return "boxThree";
  if (clamped === 4) return "boxFour";
  return "boxFive";
};

const boxToStage = (box: keyof BoxesState | null | undefined): number => {
  switch (box) {
    case "boxZero":
      return 0;
    case "boxOne":
      return 1;
    case "boxTwo":
      return 2;
    case "boxThree":
      return 3;
    case "boxFour":
      return 4;
    case "boxFive":
      return 5;
    default:
      return 0;
  }
};

const distributeByStage = (words: WordWithTranslations[]): BoxesState => {
  const next = createEmptyBoxes();
  for (const word of words) {
    const box = stageToBox(word.stage);
    next[box].push(word);
  }
  return next;
};

const findFirstActiveBox = (boxes: BoxesState): keyof BoxesState | null => {
  for (const box of NON_INTRO_BOXES) {
    if ((boxes[box] ?? []).length > 0) {
      return box;
    }
  }
  return null;
};

// Lightweight placeholder: keeps UI pieces but no data fetching or persistence.
export default function ReviewFlashcardsPlaceholder() {
  const params = useLocalSearchParams<{
    courseId?: string;
    onboarding?: string;
  }>();
  const styles = useStyles();
  const {
    actionButtonsPosition,
    getCustomCourseShowExplanationEnabled,
    getCustomCourseExplanationOnlyOnWrong,
  } = useSettings();
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
  const [boxes, setBoxes] = useState<BoxesState>(() => createEmptyBoxes());
  const [activeBox, setActiveBox] = useState<keyof BoxesState | null>(null);
  const [selectedItem, setSelectedItem] = useState<WordWithTranslations | null>(
    null,
  );
  const [queueNext, setQueueNext] = useState(false);
  const [peekBox, setPeekBox] = useState<keyof BoxesState | null>(null);
  const [peekCards, setPeekCards] = useState<WordWithTranslations[]>([]);
  const [questionShownAt, setQuestionShownAt] = useState<number | null>(null);
  const [longThink, setLongThink] = useState(false);
  const [isBetweenCards, setIsBetweenCards] = useState(false);
  const boxSpamRef = useRef<{ box: keyof BoxesState | null; ts: number; count: number }>({
    box: null,
    ts: 0,
    count: 0,
  });
  const [layout] = useState<"classic" | "carousel">("classic");
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<boolean | null>(null);
  const [correction, setCorrection] = useState<CardCorrectionType | null>(null);
  const [pendingExplanationMove, setPendingExplanationMove] = useState<{
    cardId: number;
    promote: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queuesRef = useRef<Record<keyof BoxesState, WordWithTranslations[]>>({
    boxZero: [],
    boxOne: [],
    boxTwo: [],
    boxThree: [],
    boxFour: [],
    boxFive: [],
  });

  const resetSessionState = useCallback((nextBoxes: BoxesState) => {
    setBoxes(nextBoxes);
    setActiveBox(null);
    queuesRef.current = {
      boxZero: nextBoxes.boxZero.length > 0 ? [...nextBoxes.boxZero] : [],
      boxOne: nextBoxes.boxOne.length > 0 ? [...nextBoxes.boxOne] : [],
      boxTwo: nextBoxes.boxTwo.length > 0 ? [...nextBoxes.boxTwo] : [],
      boxThree: nextBoxes.boxThree.length > 0 ? [...nextBoxes.boxThree] : [],
      boxFour: nextBoxes.boxFour.length > 0 ? [...nextBoxes.boxFour] : [],
      boxFive: nextBoxes.boxFive.length > 0 ? [...nextBoxes.boxFive] : [],
    };
    setSelectedItem(null);
    setQueueNext(false);
    setPeekBox(null);
    setPeekCards([]);
    setQuestionShownAt(null);
    setLongThink(false);
    setIsBetweenCards(false);
    setAnswer("");
    setResult(null);
    setCorrection(null);
    setPendingExplanationMove(null);
  }, []);

  const clearTransitionTimer = useCallback(() => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
  }, []);

  const removeCardFromSession = useCallback((cardId: number, box: keyof BoxesState) => {
    setBoxes((prev) => {
      const nextState = (Object.keys(prev) as Array<keyof BoxesState>).reduce(
        (acc, boxKey) => {
          acc[boxKey] = (prev[boxKey] ?? []).filter((item) => item.id !== cardId);
          return acc;
        },
        {} as BoxesState,
      );
      const nextActive = findFirstActiveBox(nextState);
      if ((nextState[box] ?? []).length === 0 && nextActive !== box) {
        setActiveBox(nextActive);
      }
      if (nextActive == null) {
        setSelectedItem(null);
        setQuestionShownAt(null);
        setLongThink(false);
      }
      return nextState;
    });
  }, []);

  const reloadSession = useCallback(async () => {
    clearTransitionTimer();
    if (!courseId) {
      resetSessionState(createEmptyBoxes());
      return;
    }
    setIsLoading(true);
    try {
      const cards = await getDueCustomReviewFlashcards(courseId);
      const mapped = cards.map(mapReviewCardToWord);
      resetSessionState(distributeByStage(mapped));
    } catch (err) {
      console.error("Failed to load review flashcards", err);
      resetSessionState(createEmptyBoxes());
    } finally {
      setIsLoading(false);
    }
  }, [clearTransitionTimer, courseId, resetSessionState]);

  const syncQueueWithBox = useCallback(
    (box: keyof BoxesState) => {
      const boxItems = boxes[box] ?? [];
      if (boxItems.length === 0) {
        queuesRef.current[box] = [];
        return;
      }
      const allowedIds = new Set(boxItems.map((item) => item.id));
      const existing = queuesRef.current[box] ?? [];
      const trimmed = existing.filter((item) => allowedIds.has(item.id));
      const queuedIds = new Set(trimmed.map((item) => item.id));
      const newItems = boxItems.filter((item) => !queuedIds.has(item.id));
      queuesRef.current[box] = [...trimmed, ...newItems];
    },
    [boxes],
  );

  const ensureQueueHasItems = useCallback(
    (box: keyof BoxesState) => {
      const list = boxes[box];
      const queue = queuesRef.current[box] ?? [];
      if (!list || list.length === 0) {
        queuesRef.current[box] = [];
        return;
      }
      if (queue.length === 0) {
        const shuffled = [...list];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        queuesRef.current[box] = shuffled;
      }
    },
    [boxes],
  );

  const selectNextWord = useCallback(
    (box: keyof BoxesState) => {
      const list = boxes[box];
      if (!list || list.length === 0) {
        setSelectedItem(null);
        setAnswer("");
        setResult(null);
        setCorrection(null);
        setQuestionShownAt(null);
        setLongThink(false);
        return;
      }
      syncQueueWithBox(box);
      ensureQueueHasItems(box);
      const queue = queuesRef.current[box] ?? [];
      const [next, ...rest] = queue;
      queuesRef.current[box] = rest;
      setSelectedItem(next ?? null);
      setAnswer("");
      setResult(null);
      setCorrection(null);
      setQuestionShownAt(Date.now());
      setLongThink(false);
    },
    [boxes, ensureQueueHasItems, syncQueueWithBox],
  );

  useEffect(() => {
    return () => {
      clearTransitionTimer();
    };
  }, [clearTransitionTimer]);

  useFocusEffect(
    useCallback(() => {
      void reloadSession();
      return () => {
        clearTransitionTimer();
      };
    }, [clearTransitionTimer, reloadSession]),
  );

  const handleSelectBox = (box: keyof BoxesState) => {
    const now = Date.now();
    const spam = boxSpamRef.current;
    const isSameBox = spam.box === box && now - spam.ts <= BOX_SPAM_WINDOW_MS;
    if (isSameBox) {
      spam.count += 1;
    } else {
      spam.box = box;
      spam.count = 1;
    }
    spam.ts = now;
    if (spam.count > BOX_SPAM_THRESHOLD) {
      return; // soft guard: ignore excessive taps
    }
    if (isBetweenCards) return;
    setActiveBox(box);
    if (correction) return;
    selectNextWord(box);
  };

  const handleBoxLongPress = (box: keyof BoxesState) => {
    const cards = boxes[box] ?? [];
    setPeekBox(box);
    setPeekCards(cards);
  };

  const closePeek = () => {
    setPeekBox(null);
    setPeekCards([]);
  };

  const reversed = selectedItem?.flipped ?? false;
  const answerOnly =
    (selectedItem?.answerOnly ?? false) ||
    (!selectedItem?.text?.trim() &&
      Boolean(selectedItem?.imageFront || selectedItem?.imageBack)) ||
    selectedItem?.type === "true_false" ||
    selectedItem?.type === "know_dont_know";
  const effectiveReversed = answerOnly ? false : reversed;
  const correctionAnswerOnly = correction?.answerOnly ?? false;
  const correctionEffectiveReversed = correctionAnswerOnly
    ? false
    : (correction?.reversed ?? false);

  useEffect(() => {
    if (!correction || !activeBox || !courseId) return;
    if (transitionTimerRef.current) return;

    const expectsAwersInput =
      !correctionAnswerOnly && correctionEffectiveReversed;
    const expectsRewersInput =
      correctionAnswerOnly || !correctionEffectiveReversed;
    const awersOk =
      !expectsAwersInput || checkSpelling(correction.input1, correction.awers);
    const rewersOk =
      !expectsRewersInput ||
      checkSpelling(correction.input2 ?? "", correction.rewers);

    if (!(awersOk && rewersOk)) return;
    if (!correction.cardId) return;

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
    void (async () => {
      try {
        await scheduleCustomReview(
          correction.cardId!,
          courseId,
          0,
        );
      } catch (error) {
        console.error("Failed to demote after correction", error);
      }
    })();

    removeCardFromSession(correction.cardId, activeBox);
    setCorrection(null);
    setResult(null);
    setAnswer("");
    setPendingExplanationMove(null);
    setQueueNext(true);
  }, [
    activeBox,
    boxes,
    correction,
    courseId,
    checkSpelling,
    correctionAnswerOnly,
    correctionEffectiveReversed,
    pendingExplanationMove,
    selectedItem,
    removeCardFromSession,
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
    if (!activeBox) return;
    if (correction) return;
    if (queueNext) {
      selectNextWord(activeBox);
      setQueueNext(false);
      return;
    }
    // if current selectedItem disappeared from box, pick next
    const list = boxes[activeBox] ?? [];
    if (!list.length) {
      setSelectedItem(null);
      return;
    }
    if (selectedItem && list.some((item) => item.id === selectedItem.id)) {
      return;
    }
    selectNextWord(activeBox);
  }, [activeBox, boxes, correction, queueNext, selectNextWord, selectedItem]);

  useEffect(() => {
    if (!selectedItem) return;
    if (result !== null) return;
    if (!questionShownAt) return;
    const elapsed = Date.now() - questionShownAt;
    if (elapsed < LONG_THINK_MS) return;
    if (longThink) return;
    setLongThink(true);
    // Soft-guard: briefly block rapid box switching after long think mark
    setIsBetweenCards(true);
    setTimeout(() => setIsBetweenCards(false), 400);
  }, [longThink, questionShownAt, result, selectedItem]);

  const wrongInputChange = (which: 1 | 2, value: string) => {
    setCorrection((current) =>
      current
        ? {
          ...current,
          [which === 1 ? "input1" : "input2"]: value,
        }
        : current,
    );
  };

  const setCorrectionRewers = (value: string) => {
    setCorrection((current) =>
      current ? { ...current, rewers: value } : current,
    );
  };

  const handleConfirm = useCallback((
    _selectedTranslation?: string,
    answerOverride?: string,
  ) => {
    if (!selectedItem || !activeBox || !courseId) return;
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    if (
      pendingExplanationMove &&
      pendingExplanationMove.cardId === selectedItem.id &&
      result !== null
    ) {
      const currentCardId = selectedItem.id;
      void (async () => {
        try {
          if (pendingExplanationMove.promote) {
            await advanceCustomReview(
              currentCardId,
              courseId,
            );
          } else {
            await scheduleCustomReview(
              currentCardId,
              courseId,
              0,
            );
          }
        } catch (error) {
          console.error("Failed to finalize explanation move", error);
        }
      })();
      removeCardFromSession(currentCardId, activeBox);
      setPendingExplanationMove(null);
      setAnswer("");
      setResult(null);
      setQueueNext(true);
      setIsBetweenCards(true);
      setTimeout(() => setIsBetweenCards(false), 300);
      return;
    }
    const userAnswer = (answerOverride ?? answer).trim();
    const isKnowDontKnow = selectedItem.type === "know_dont_know";
    const ok = isKnowDontKnow
      ? userAnswer.toLowerCase() === "true"
      : userAnswer.length > 0 &&
        (effectiveReversed
          ? checkSpelling(userAnswer, selectedItem.text)
          : (selectedItem.translations ?? []).some((t) =>
            checkSpelling(userAnswer, t),
          ));

    setResult(ok);
    playFeedbackSound(ok);
    const reset = () => {
      setAnswer("");
      setResult(null);
    };

    const currentStage = selectedItem.stage ?? boxToStage(activeBox);
    const currentBox = selectedItem.stage != null ? stageToBox(selectedItem.stage) : activeBox;
    const durationMs =
      questionShownAt != null ? Math.max(0, Date.now() - questionShownAt) : undefined;
    const logAttemptEvent = (resultValue: "ok" | "wrong") => {
      void logCustomLearningEvent({
        flashcardId: selectedItem.id,
        courseId,
        box: currentBox,
        result: resultValue,
        durationMs,
      }).catch((error) => {
        console.warn("[Review] Failed to log learning event", error);
      });
    };

    if (!ok) {
      logAttemptEvent("wrong");
      const wrongExplanationState = getExplanationState({
        selectedItem,
        result: false,
        showExplanationEnabled,
        explanationOnlyOnWrong,
      });
      if (isKnowDontKnow) {
        if (wrongExplanationState.isExplanationPending) {
          setPendingExplanationMove({
            cardId: selectedItem.id,
            promote: false,
          });
          return;
        }
        const delayMs = wrongExplanationState.hasExplanation ? 3500 : 1500;
        void (async () => {
          try {
            await scheduleCustomReview(
              selectedItem.id,
              courseId,
              0,
            );
          } catch (error) {
            console.error("Failed to demote after know/dont know", error);
            setBoxes((prev) => {
              const current = prev[activeBox] ?? [];
              if (current.some((item) => item.id === selectedItem.id)) {
                return prev;
              }
              return {
                ...prev,
                [activeBox]: [selectedItem, ...current],
              };
            });
            setActiveBox((current) => current ?? activeBox);
          }
        })();

        transitionTimerRef.current = setTimeout(() => {
          removeCardFromSession(selectedItem.id, activeBox);
          reset();
          transitionTimerRef.current = null;
          setQueueNext(true);
          setIsBetweenCards(true);
          setTimeout(() => setIsBetweenCards(false), 300);
        }, delayMs);
        return;
      }
      if (selectedItem.type === "true_false" && wrongExplanationState.isExplanationPending) {
        setPendingExplanationMove({
          cardId: selectedItem.id,
          promote: false,
        });
        return;
      }
      setCorrection({
        cardId: selectedItem.id,
        awers: selectedItem.text,
        rewers: selectedItem.translations[0] ?? "",
        input1: "",
        input2: "",
        answerOnly,
        mode: "demote",
        promptText: effectiveReversed
          ? selectedItem.translations[0] ?? ""
          : selectedItem.text,
        promptImageUri: effectiveReversed
          ? selectedItem.imageBack ?? null
          : selectedItem.imageFront ?? null,
        reversed,
        word: selectedItem,
      });
      return;
    }

    logAttemptEvent("ok");
    const isPerfect = (() => {
      const normalizeStrict = (s: string) =>
        stripDiacritics(s.trim().toLowerCase());
      const normalizedUser = normalizeStrict(answer);
      if (effectiveReversed) {
        return normalizedUser === normalizeStrict(selectedItem.text);
      }
      return (selectedItem.translations ?? []).some(
        (t) => normalizedUser === normalizeStrict(t),
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

    void (async () => {
      try {
        await advanceCustomReview(
          selectedItem.id,
          courseId,
        );
      } catch (error) {
        console.error("Failed to advance custom review", error);
        setBoxes((prev) => {
          const current = prev[activeBox] ?? [];
          if (current.some((item) => item.id === selectedItem.id)) {
            return prev;
          }
          return {
            ...prev,
            [activeBox]: [selectedItem, ...current],
          };
        });
        setActiveBox((current) => current ?? activeBox);
      }
    })();

    transitionTimerRef.current = setTimeout(() => {
      removeCardFromSession(selectedItem.id, activeBox);
      reset();
      transitionTimerRef.current = null;
      setQueueNext(true);
      setIsBetweenCards(true);
      setTimeout(() => setIsBetweenCards(false), 300);
    }, delayMs);
  }, [
    activeBox,
    answer,
    checkSpelling,
    courseId,
    effectiveReversed,
    pendingExplanationMove,
    removeCardFromSession,
    result,
    selectedItem,
  ]);

  const handleTrueFalseAnswer = useMemo(
    () =>
      makeTrueFalseHandler({
        setAnswer,
        confirm: handleConfirm,
      }),
    [handleConfirm, setAnswer],
  );
  const handleTrueFalseOk = useCallback(() => {
    if (isLoading) return;
    handleConfirm();
  }, [handleConfirm, isLoading]);

  const shouldShowTrueFalseActions =
    (selectedItem?.type === "true_false" ||
      selectedItem?.type === "know_dont_know") &&
    !correction;
  const showCorrectionInputs = Boolean(correction && result === false);
  const { isExplanationVisible, isExplanationPending } = getExplanationState({
    selectedItem,
    result,
    showCorrectionInputs,
    showExplanationEnabled,
    explanationOnlyOnWrong,
  });
  const trueFalseActionsMode =
    isExplanationPending && shouldShowTrueFalseActions ? "ok" : "answer";
  const trueFalseActionsDisabled = isExplanationPending
    ? isLoading
    : result !== null || isLoading;
  const showCardActions = !(
    shouldShowTrueFalseActions ||
    selectedItem?.type === "true_false" ||
    selectedItem?.type === "know_dont_know"
  );
  const bottomButtonsAnchorRef = useRef<View | null>(null);
  const [bottomButtonsHeight, setBottomButtonsHeight] = useState(0);
  const [bottomButtonsBottomInWindow, setBottomButtonsBottomInWindow] =
    useState<number | null>(null);
  const measureBottomButtons = useCallback(() => {
    requestAnimationFrame(() => {
      bottomButtonsAnchorRef.current?.measureInWindow((_x, y, _w, h) => {
        if (h <= 0) return;
        const nextBottom = y + h;
        setBottomButtonsBottomInWindow((prev) => {
          if (prev !== null && Math.abs(prev - nextBottom) < 1) return prev;
          return nextBottom;
        });
      });
    });
  }, []);
  const handleCardActionsConfirm = () => handleConfirm();
  const cardActionsDownloadDisabled = true;
  const cardActionsConfirmDisabled = false;
  const cardActionsConfirmLabel = isExplanationVisible ? "OK" : "ZATWIERDŹ";
  const effectiveTrueFalseButtonsVariant =
    selectedItem?.type === "know_dont_know" || selectedItem?.answerOnly
      ? "know_dont_know"
      : "true_false";
  const isCarouselLayout = layout !== "classic";
  const carouselMinScale = 0.42;
  const {
    scale: boxesScale,
    scaledHeight: boxesScaledHeight,
    scaleOffsetY,
    onViewportLayout: onBoxesViewportLayout,
    onContentLayout: onBoxesContentLayout,
    needsScrollFallback: boxesNeedScrollFallback,
  } = useAutoScaleToFit({ minScale: isCarouselLayout ? carouselMinScale : 0.72 });
  const areButtonsOnTop = actionButtonsPosition === "top";
  const { keyboardVisible, bottomOffset: bottomButtonsOffset } =
    useKeyboardBottomOffset({
      enabled: !areButtonsOnTop,
      gap: 8,
      targetBottomInWindow: bottomButtonsBottomInWindow,
      keyboardTopCorrection: 44,
    });

  useEffect(() => {
    if (areButtonsOnTop) return;
    measureBottomButtons();
  }, [
    areButtonsOnTop,
    measureBottomButtons,
    selectedItem?.id,
    shouldShowTrueFalseActions,
    showCardActions,
  ]);

  useEffect(() => {
    if (areButtonsOnTop || !keyboardVisible) return;
    const timers = [0, 120, 280, 520].map((delay) =>
      setTimeout(() => {
        measureBottomButtons();
      }, delay),
    );
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [areButtonsOnTop, keyboardVisible, measureBottomButtons, selectedItem?.id]);

  const renderButtons = (position: "top" | "bottom") => (
    <FlashcardsButtons
      position={position}
      showTrueFalseActions={shouldShowTrueFalseActions}
      trueFalseActionsDisabled={trueFalseActionsDisabled}
      onTrueFalseAnswer={handleTrueFalseAnswer}
      trueFalseActionsMode={trueFalseActionsMode}
      onTrueFalseOk={handleTrueFalseOk}
      trueFalseButtonsVariant={effectiveTrueFalseButtonsVariant}
      selectedTrueFalseAnswer={
        answer === "true" ? true : answer === "false" ? false : null
      }
      showCardActions={showCardActions}
      onCardActionsConfirm={handleCardActionsConfirm}
      onDownload={async () => undefined}
      downloadDisabled={cardActionsDownloadDisabled}
      downloadCoachmarkId="review-flashcards-add-button"
      confirmDisabled={cardActionsConfirmDisabled}
      confirmLabel={cardActionsConfirmLabel}
    />
  );

  const boxesContent =
    layout === "classic" ? (
      <Boxes
        boxes={boxes}
        activeBox={activeBox}
        handleSelectBox={handleSelectBox}
        onBoxLongPress={handleBoxLongPress}
        countsCoachmarkId="review-flashcards-box-counts"
      />
    ) : (
      <BoxesCarousel
        boxes={boxes}
        activeBox={activeBox}
        handleSelectBox={handleSelectBox}
        onBoxLongPress={handleBoxLongPress}
      />
    );
  const boxesScaleOffsetY = scaleOffsetY;
  const shouldRenderBottomButtons = !areButtonsOnTop;
  const bottomButtonsReservedSpace = shouldRenderBottomButtons
    ? Math.max(bottomButtonsHeight, BOTTOM_BUTTONS_MIN_HEIGHT) +
      BOTTOM_BUTTONS_DOCK_BOTTOM_OFFSET
    : 0;
  const hasCardsInSession = Object.values(boxes).some((box) => box.length > 0);
  const shouldPromptBoxSelection =
    !isLoading && selectedItem == null && hasCardsInSession && activeBox == null;
  const isSessionEmpty = !isLoading && selectedItem == null && !hasCardsInSession;
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
      <CoachmarkAnchor
        id="review-flashcards-bubble-anchor"
        shape="rect"
        radius={12}
        style={{ position: "absolute", top: 1, left: 1, width: 1, height: 1 }}
      />
      <Confetti generateConfetti={shouldCelebrate} />

      <View
        style={[
          styles.content,
          shouldRenderBottomButtons
            ? { paddingBottom: bottomButtonsReservedSpace }
            : null,
        ]}
      >
        <Reanimated.View
          layout={SCREEN_LAYOUT_TRANSITION}
          style={styles.cardSectionWrapper}
        >
          <CoachmarkAnchor id="review-flashcards-card-section" shape="rect" radius={20}>
            <View collapsable={false}>
              {isSessionEmpty ? (
                <FlashcardsPlaceholderCard
                  title="Brak fiszek w tej sesji"
                  description="Odśwież ekran albo wróć później, gdy kolejne powtórki będą gotowe."
                />
              ) : (
                <Card
                  selectedItem={selectedItem}
                  setAnswer={setAnswer}
                  answer={answer}
                  result={result}
                  confirm={handleConfirm}
                  reversed={reversed}
                  setResult={setResult}
                  correction={correction}
                  wrongInputChange={wrongInputChange}
                  setCorrectionRewers={setCorrectionRewers}
                  introMode={false}
                  onHintUpdate={() => undefined}
                  hideHints
                  isFocused={!isLoading}
                  showExplanationEnabled={showExplanationEnabled}
                  explanationOnlyOnWrong={explanationOnlyOnWrong}
                />
              )}
            </View>
          </CoachmarkAnchor>
        </Reanimated.View>

        {areButtonsOnTop ? (
          <Reanimated.View
            layout={SCREEN_LAYOUT_TRANSITION}
            style={styles.topButtonsWrapper}
          >
            <CoachmarkAnchor
              id="review-flashcards-buttons-section"
              shape="rect"
              radius={24}
            >
              <View collapsable={false}>{renderButtons("top")}</View>
            </CoachmarkAnchor>
          </Reanimated.View>
        ) : null}

        <Reanimated.View
          layout={SCREEN_LAYOUT_TRANSITION}
          style={[
            styles.boxesWrapper,
            !areButtonsOnTop && styles.boxesWrapperWithBottomButtons,
          ]}
        >
          <CoachmarkAnchor id="review-flashcards-boxes-section" shape="rect" radius={24}>
            <View collapsable={false}>
              {boxesNeedScrollFallback ? (
                <ScrollView
                  style={styles.boxesViewport}
                  contentContainerStyle={styles.boxesViewportScrollContent}
                  onLayout={onBoxesViewportLayout}
                  showsVerticalScrollIndicator={false}
                >
                  <View
                    style={[
                      styles.boxesScaledContent,
                      boxesScaledHeight ? { height: boxesScaledHeight } : null,
                    ]}
                  >
                    <View
                      style={{
                        transform: [
                          { translateY: -boxesScaleOffsetY },
                          { scale: boxesScale },
                        ],
                      }}
                      onLayout={onBoxesContentLayout}
                    >
                      {boxesContent}
                    </View>
                  </View>
                </ScrollView>
              ) : (
                <View style={styles.boxesViewport} onLayout={onBoxesViewportLayout}>
                  <View
                    style={[
                      styles.boxesScaledContent,
                      boxesScaledHeight ? { height: boxesScaledHeight } : null,
                    ]}
                  >
                    <View
                      style={{
                        transform: [
                          { translateY: -boxesScaleOffsetY },
                          { scale: boxesScale },
                        ],
                      }}
                      onLayout={onBoxesContentLayout}
                    >
                      {boxesContent}
                    </View>
                  </View>
                </View>
              )}
            </View>
          </CoachmarkAnchor>
        </Reanimated.View>

        {shouldRenderBottomButtons ? (
          <View
            style={[
              styles.bottomButtonsDock,
              { bottom: BOTTOM_BUTTONS_DOCK_BOTTOM_OFFSET },
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
        activeCustomCourseId={courseId}
        activeCourseName={null}
        onClose={closePeek}
      />
    </View>
  );
}
