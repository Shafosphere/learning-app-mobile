import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import Card from "@/src/components/card/card";
import type { CardCorrectionType } from "@/src/components/card/card-types";
import { PromptImage } from "@/src/components/card/subcomponents/PromptImage";
import BoxesCarousel from "@/src/components/Box/Carousel/BoxCarousel";
import Boxes from "@/src/components/Box/List/BoxList";
import FlashcardsPeekOverlay from "@/src/components/Box/Peek/FlashcardsPeek";
import Confetti from "@/src/components/confetti/Confetti";
import { FlashcardsButtons } from "@/src/components/flashcards/FlashcardsButtons";
import { NudgeModal } from "@/src/components/nudge/NudgeModal";
import { useCoachmarkLayerPortal } from "@/src/components/onboarding/CoachmarkLayerPortal";
import { REVIEW_FLASHCARDS_COACHMARK_STEPS } from "@/src/constants/coachmarkFlows";
import {
  advanceCustomReview,
  getDueCustomReviewFlashcards,
  getCustomFlashcardConsecutiveWrongCount,
  logCustomLearningEvent,
  scheduleCustomReview,
} from "@/src/db/sqlite/db";
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
import { useKeyboardBottomOffset } from "@/src/hooks/useKeyboardBottomOffset";
import {
  appendDebugEvent,
  summarizeBoxes,
} from "@/src/services/debugEvents";
import { returnFlashcardToUnknown } from "@/src/services/returnFlashcardToUnknown";
import { registerProtectedDailyActivity } from "@/src/services/streakProtection";
import useSpellchecking from "@/src/hooks/useSpellchecking";
import { BoxesState, WordWithTranslations } from "@/src/types/boxes";
import { getCorrectionFieldRequirements } from "@/src/utils/correctionFields";
import { stripDiacritics } from "@/src/utils/diacritics";
import { getExplanationState } from "@/src/utils/explanationState";
import { mapReviewCardToWord } from "@/src/utils/flashcardsMapper";
import { playFeedbackSound } from "@/src/utils/soundPlayer";
import { makeTrueFalseHandler } from "@/src/utils/trueFalseAnswer";
import { useLocalSearchParams } from "expo-router";
import { CoachmarkAnchor } from "@edwardloopez/react-native-coachmark";
import { Animated, ScrollView, Text, View } from "react-native";
import Reanimated, { LinearTransition } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useStyles } from "./reviewflashcards-styles";

const BOX_SPAM_WINDOW_MS = 2000;
const BOX_SPAM_THRESHOLD = 20;
const LONG_THINK_MS = 12 * 1000;
const ACTION_POST_ANSWER_COOLDOWN_MS = 1000;
const SCREEN_LAYOUT_TRANSITION = LinearTransition.duration(420);
const BOTTOM_BUTTONS_MIN_HEIGHT = 50;
const BOTTOM_BUTTONS_DOCK_BOTTOM_OFFSET = 56;
const COMPACT_BOTTOM_BUTTONS_DOCK_BOTTOM_OFFSET = 20;
const REVIEW_MISTAKE_NUDGE_PREVIEW_FRONT_IMAGE =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 140">
      <path d="M80 8 154 132H6Z" fill="#fff7ed" stroke="#dc2626" stroke-width="12" stroke-linejoin="round"/>
      <path d="M80 42v42" stroke="#111827" stroke-width="12" stroke-linecap="round"/>
      <circle cx="80" cy="108" r="7" fill="#111827"/>
    </svg>`
  );

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

type ReviewMistakeNudgeCandidate = {
  card: WordWithTranslations;
  box: keyof BoxesState;
  wrongStreak: number;
};

type ReviewMistakeNudgeState = ReviewMistakeNudgeCandidate & {
  confirming: boolean;
  error: boolean;
  preview?: boolean;
};

// Lightweight placeholder: keeps UI pieces but no data fetching or persistence.
export default function ReviewFlashcardsPlaceholder() {
  const params = useLocalSearchParams<{
    courseId?: string;
    onboarding?: string;
    mistakeNudgePreviewToken?: string;
  }>();
  const styles = useStyles();
  const { isSmallPhoneLayout } = useDeviceLayout();
  const { t } = useTranslation();
  const { applyStatBurst, getStatsSnapshot } = useNavbarStats();
  const settings = useSettings();
  const {
    actionButtonsPosition,
    cancelTodayLearningReminderSchedule,
    getCustomCourseShowExplanationEnabled,
    getCustomCourseExplanationOnlyOnWrong,
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
  }, [mistakeNudgePreviewToken, t]);

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
  const previousFaceActiveBoxRef = useRef<keyof BoxesState | null>(null);
  const boxSpamRef = useRef<{ box: keyof BoxesState | null; ts: number; count: number }>({
    box: null,
    ts: 0,
    count: 0,
  });
  const [layout] = useState<"classic" | "carousel">("classic");
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<boolean | null>(null);
  const [correction, setCorrection] = useState<CardCorrectionType | null>(null);
  const [mistakeNudge, setMistakeNudge] =
    useState<ReviewMistakeNudgeState | null>(null);
  const [pendingExplanationMove, setPendingExplanationMove] = useState<{
    cardId: number;
    promote: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionCooldownActive, setIsActionCooldownActive] = useState(false);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionCooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const reviewMutationQueueRef = useRef(new Map<number, Promise<unknown>>());
  const pendingMistakeNudgeRef = useRef(
    new Map<number, Promise<ReviewMistakeNudgeCandidate | null>>()
  );
  const lastActionCooldownCardIdRef = useRef<number | null>(null);
  const queuesRef = useRef<Record<keyof BoxesState, WordWithTranslations[]>>({
    boxZero: [],
    boxOne: [],
    boxTwo: [],
    boxThree: [],
    boxFour: [],
    boxFive: [],
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
    setMistakeNudge(null);
    pendingMistakeNudgeRef.current.clear();
    setPendingExplanationMove(null);
    setIsActionCooldownActive(false);
    lastActionCooldownCardIdRef.current = null;
    if (actionCooldownTimerRef.current) {
      clearTimeout(actionCooldownTimerRef.current);
      actionCooldownTimerRef.current = null;
    }
  }, []);

  const clearTransitionTimer = useCallback(() => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
  }, []);

  const removeCardFromSession = useCallback((cardId: number, box: keyof BoxesState) => {
    setBoxes((prev) => {
      const nextState = (Object.keys(prev) as (keyof BoxesState)[]).reduce(
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
      void appendDebugEvent("review", "review.card.remove", {
        screen: "review",
        courseId,
        cardId,
        fromBox: box,
      });
      void appendDebugEvent("review", "review.session_counts", {
        screen: "review",
        courseId,
        counts: summarizeBoxes(nextState),
      });
      return nextState;
    });
  }, [courseId]);

  const enqueueReviewMutation = useCallback(
    <T,>(cardId: number, operation: () => Promise<T>): Promise<T> => {
      const prior = reviewMutationQueueRef.current.get(cardId) ?? Promise.resolve();
      const queued = prior.catch(() => undefined).then(operation);
      reviewMutationQueueRef.current.set(cardId, queued);
      void queued.finally(() => {
        if (reviewMutationQueueRef.current.get(cardId) === queued) {
          reviewMutationQueueRef.current.delete(cardId);
        }
      }).catch(() => undefined);
      return queued;
    },
    [],
  );

  const queueMistakeNudgeCheck = useCallback(
    (
      card: WordWithTranslations,
      box: keyof BoxesState,
      logCompleted: Promise<boolean>,
    ) => {
      if (!courseId) return;
      const candidatePromise = logCompleted
        .then(async (logged) => {
          if (!logged) return null;
          const wrongStreak = await getCustomFlashcardConsecutiveWrongCount(
            card.id,
            courseId
          );
          if (wrongStreak > 0 && wrongStreak % 3 === 0) {
            return { card, box, wrongStreak };
          }
          return null;
        })
        .catch((error) => {
          console.warn("[Review] Failed to check wrong answer streak", error);
          return null;
        });
      pendingMistakeNudgeRef.current.set(card.id, candidatePromise);
    },
    [courseId]
  );

  const consumeMistakeNudgeCandidate = useCallback(
    async (cardId: number) => {
      const candidatePromise = pendingMistakeNudgeRef.current.get(cardId);
      if (!candidatePromise) return null;
      try {
        return await candidatePromise;
      } finally {
        if (pendingMistakeNudgeRef.current.get(cardId) === candidatePromise) {
          pendingMistakeNudgeRef.current.delete(cardId);
        }
      }
    },
    []
  );

  const demoteAndRemoveReviewCard = useCallback(
    (card: WordWithTranslations, box: keyof BoxesState) => {
      if (!courseId) return;
      void (async () => {
        try {
          void appendDebugEvent("review", "review.demote", {
            screen: "review",
            courseId,
            cardId: card.id,
            fromBox: box,
          });
          await enqueueReviewMutation(card.id, () =>
            scheduleCustomReview(card.id, courseId, 0)
          );
        } catch (error) {
          console.error("Failed to demote review card", error);
        }
      })();

      removeCardFromSession(card.id, box);
      setPendingExplanationMove(null);
      setAnswer("");
      setResult(null);
      setQueueNext(true);
      setIsBetweenCards(true);
      setTimeout(() => setIsBetweenCards(false), 300);
    },
    [courseId, enqueueReviewMutation, removeCardFromSession]
  );

  const finalizeWrongReviewCard = useCallback(
    async (card: WordWithTranslations, box: keyof BoxesState) => {
      const candidate = await consumeMistakeNudgeCandidate(card.id);
      if (candidate) {
        setMistakeNudge({ ...candidate, confirming: false, error: false });
        setPendingExplanationMove(null);
        setAnswer("");
        setResult(false);
        setIsBetweenCards(false);
        return;
      }
      demoteAndRemoveReviewCard(card, box);
    },
    [consumeMistakeNudgeCandidate, demoteAndRemoveReviewCard]
  );

  const handleKeepReviewingAfterMistakeNudge = useCallback(() => {
    if (!mistakeNudge || mistakeNudge.confirming) return;
    const { card, box } = mistakeNudge;
    setMistakeNudge(null);
    demoteAndRemoveReviewCard(card, box);
  }, [demoteAndRemoveReviewCard, mistakeNudge]);

  const handleReturnMistakeNudgeToUnknown = useCallback(async () => {
    if (!mistakeNudge) return;
    if (mistakeNudge.preview || !courseId) {
      setMistakeNudge(null);
      return;
    }
    const { card, box } = mistakeNudge;
    setMistakeNudge((current) =>
      current ? { ...current, confirming: true, error: false } : current
    );
    try {
      await enqueueReviewMutation(card.id, () =>
        returnFlashcardToUnknown({ courseId, flashcardId: card.id })
      );
      removeCardFromSession(card.id, box);
      setMistakeNudge(null);
      setPendingExplanationMove(null);
      setAnswer("");
      setResult(null);
      setQueueNext(true);
      setIsBetweenCards(true);
      setTimeout(() => setIsBetweenCards(false), 300);
    } catch (error) {
      console.warn("[Review] Failed to return mistake nudge card to unknown", error);
      setMistakeNudge((current) =>
        current ? { ...current, confirming: false, error: true } : current
      );
    }
  }, [
    courseId,
    enqueueReviewMutation,
    mistakeNudge,
    removeCardFromSession,
  ]);

  const reloadSession = useCallback(async () => {
    clearTransitionTimer();
    if (!courseId) {
      resetSessionState(createEmptyBoxes());
      return;
    }
    setIsLoading(true);
    void appendDebugEvent("review", "review.load.start", {
      screen: "review",
      courseId,
    });
    try {
      const cards = await getDueCustomReviewFlashcards(courseId);
      const mapped = cards.map(mapReviewCardToWord);
      const nextBoxes = distributeByStage(mapped);
      resetSessionState(nextBoxes);
      void appendDebugEvent("review", "review.load.success", {
        screen: "review",
        courseId,
        reviewIdsCount: mapped.length,
        counts: summarizeBoxes(nextBoxes),
      });
    } catch (err) {
      console.error("Failed to load review flashcards", err);
      resetSessionState(createEmptyBoxes());
      void appendDebugEvent("review", "review.load.error", {
        screen: "review",
        courseId,
        message: err instanceof Error ? err.message : String(err),
      });
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
      if (actionCooldownTimerRef.current) {
        clearTimeout(actionCooldownTimerRef.current);
        actionCooldownTimerRef.current = null;
      }
    };
  }, [clearTransitionTimer]);

  const selectedItemId = selectedItem?.id ?? null;

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
    setIsActionCooldownActive(true);
    if (actionCooldownTimerRef.current) {
      clearTimeout(actionCooldownTimerRef.current);
    }
    actionCooldownTimerRef.current = setTimeout(() => {
      setIsActionCooldownActive(false);
      actionCooldownTimerRef.current = null;
    }, ACTION_POST_ANSWER_COOLDOWN_MS);
  }, [selectedItemId]);

  useFocusEffect(
    useCallback(() => {
      void reloadSession();
      return () => {
        clearTransitionTimer();
      };
    }, [clearTransitionTimer, reloadSession]),
  );

  const handleSelectBox = (box: keyof BoxesState) => {
    if (isLoading || correction || mistakeNudge) {
      handleBlockedBoxInteraction(box);
      return;
    }
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
      handleBlockedBoxInteraction(box);
      return; // soft guard: ignore excessive taps
    }
    if (isBetweenCards) {
      handleBlockedBoxInteraction(box);
      return;
    }
    void appendDebugEvent("review", "review.box_select", {
      screen: "review",
      courseId,
      box,
      counts: summarizeBoxes(boxes),
    });
    setActiveBox(box);
    selectNextWord(box);
  };

  useEffect(() => {
    if (activeBox && previousFaceActiveBoxRef.current !== activeBox) {
      handleBoxFaceSelection(activeBox);
    }
    previousFaceActiveBoxRef.current = activeBox;
  }, [activeBox, handleBoxFaceSelection]);

  const handleBoxLongPress = (box: keyof BoxesState) => {
    const cards = boxes[box] ?? [];
    setPeekBox(box);
    setPeekCards(cards);
  };

  const closePeek = () => {
    setPeekBox(null);
    setPeekCards([]);
  };

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
      setPeekCards((current) => {
        const nextCards = current.filter((card) => card.id !== cardId);
        if (nextCards.length === 0) {
          setPeekBox(null);
        }
        return nextCards;
      });
    },
    [courseId, enqueueReviewMutation, peekBox, removeCardFromSession],
  );

  const reversed = selectedItem?.flipped ?? false;
  const answerOnly =
    (selectedItem?.answerOnly ?? false) ||
    (!selectedItem?.text?.trim() &&
      Boolean(selectedItem?.imageFront || selectedItem?.imageBack)) ||
    selectedItem?.type === "true_false" ||
    selectedItem?.type === "know_dont_know";
  const effectiveReversed = answerOnly ? false : reversed;

  useEffect(() => {
    if (!correction || !activeBox || !courseId) return;
    if (transitionTimerRef.current) return;

    const correctionFieldRequirements =
      getCorrectionFieldRequirements(correction);
    const expectsAwersInput = correctionFieldRequirements.awers;
    const expectsRewersInput = correctionFieldRequirements.rewers;
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
    setCorrection(null);
    setResult(null);
    setAnswer("");
    setPendingExplanationMove(null);
    const resolvedCard = card ?? correction.word ?? selectedItem;
    if (!resolvedCard) return;
    void finalizeWrongReviewCard(resolvedCard, activeBox);
  }, [
    activeBox,
    boxes,
    correction,
    courseId,
    checkSpelling,
    explanationOnlyOnWrong,
    finalizeWrongReviewCard,
    selectedItem,
    showExplanationEnabled,
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
    if (!selectedItem || !activeBox || !courseId || mistakeNudge) return;
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
      if (pendingExplanationMove.promote) {
        void (async () => {
          try {
            void appendDebugEvent("review", "review.advance", {
              screen: "review",
              courseId,
              cardId: currentCardId,
              fromBox: activeBox,
            });
            await enqueueReviewMutation(currentCardId, () =>
              advanceCustomReview(currentCardId, courseId)
            );
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
      } else {
        void finalizeWrongReviewCard(selectedItem, activeBox);
      }
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

    const currentBox = selectedItem.stage != null ? stageToBox(selectedItem.stage) : activeBox;
    const durationMs =
      questionShownAt != null ? Math.max(0, Date.now() - questionShownAt) : undefined;
    const logAttemptEvent = (resultValue: "ok" | "wrong") =>
      logCustomLearningEvent({
        flashcardId: selectedItem.id,
        courseId,
        box: currentBox,
        result: resultValue,
        durationMs,
      });

    if (!ok) {
      const wrongLogPromise = logAttemptEvent("wrong")
        .then(() => true)
        .catch((error) => {
          console.warn("[Review] Failed to log learning event", error);
          return false;
        });
      queueMistakeNudgeCheck(selectedItem, currentBox, wrongLogPromise);
      void appendDebugEvent("review", "review.answer.wrong", {
        screen: "review",
        courseId,
        cardId: selectedItem.id,
        fromBox: currentBox,
        durationMs: durationMs ?? 0,
      });
      handleBoxFaceWrongAnswer(activeBox);
      void wrongLogPromise;
      const wrongExplanationState = getExplanationState({
        selectedItem,
        result: false,
        showExplanationEnabled,
        explanationOnlyOnWrong,
      });
      if (isKnowDontKnow || selectedItem.type === "true_false") {
        if (wrongExplanationState.isExplanationPending) {
          setPendingExplanationMove({
            cardId: selectedItem.id,
            promote: false,
          });
          return;
        }
        const delayMs = wrongExplanationState.hasExplanation ? 3500 : 1500;
        transitionTimerRef.current = setTimeout(() => {
          void finalizeWrongReviewCard(selectedItem, activeBox);
          reset();
          transitionTimerRef.current = null;
          setIsBetweenCards(true);
          setTimeout(() => setIsBetweenCards(false), 300);
        }, delayMs);
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
        reversed: effectiveReversed,
        word: selectedItem,
      });
      return;
    }

    const logLearningEventPromise = logAttemptEvent("ok").catch((error) => {
      console.warn("[Review] Failed to log learning event", error);
    });
    if (learningRemindersEnabled) {
      void logLearningEventPromise.then(() => cancelTodayLearningReminderSchedule());
    }
    void appendDebugEvent("review", "review.answer.correct", {
      screen: "review",
      courseId,
      cardId: selectedItem.id,
      fromBox: currentBox,
      durationMs: durationMs ?? 0,
      isTerminalSuccess: activeBox === "boxFive",
    });
    handleStatsBurst(currentBox, logLearningEventPromise);
    handleBoxFaceCorrectAnswer(activeBox, {
      preferLove: activeBox === "boxFour" || activeBox === "boxFive",
    });
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
        void appendDebugEvent("review", "review.advance", {
          screen: "review",
          courseId,
          cardId: selectedItem.id,
          fromBox: activeBox,
        });
        await enqueueReviewMutation(selectedItem.id, () =>
          advanceCustomReview(selectedItem.id, courseId)
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
    answerOnly,
    checkSpelling,
    courseId,
    effectiveReversed,
    enqueueReviewMutation,
    explanationOnlyOnWrong,
    handleBoxFaceCorrectAnswer,
    handleBoxFaceWrongAnswer,
    handleStatsBurst,
    cancelTodayLearningReminderSchedule,
    finalizeWrongReviewCard,
    learningRemindersEnabled,
    mistakeNudge,
    pendingExplanationMove,
    questionShownAt,
    queueMistakeNudgeCheck,
    removeCardFromSession,
    result,
    selectedItem,
    showExplanationEnabled,
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
    if (isLoading || isActionCooldownActive || mistakeNudge) return;
    handleConfirm();
  }, [handleConfirm, isActionCooldownActive, isLoading, mistakeNudge]);

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
  const isImmediateActionLockActive =
    selectedItemId != null &&
    lastActionCooldownCardIdRef.current !== selectedItemId;
  const trueFalseActionsDisabled = isExplanationPending
    ? isLoading ||
      isActionCooldownActive ||
      isImmediateActionLockActive ||
      mistakeNudge != null
    : result !== null ||
      isLoading ||
      isActionCooldownActive ||
      isImmediateActionLockActive ||
      mistakeNudge != null;
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
  const handleCardConfirm = useCallback(
    (selectedTranslation?: string, answerOverride?: string) => {
      if (isActionCooldownActive || isImmediateActionLockActive) return;
      handleConfirm(selectedTranslation, answerOverride);
    },
    [
      handleConfirm,
      isActionCooldownActive,
      isImmediateActionLockActive,
    ],
  );
  const cardActionsDownloadDisabled = true;
  const cardActionsConfirmDisabled =
    isActionCooldownActive ||
    isImmediateActionLockActive ||
    mistakeNudge != null;
  const cardActionsConfirmLabel = isExplanationVisible
    ? t("flashcards.card.actions.ok")
    : t("flashcards.card.actions.confirm");
  const effectiveTrueFalseButtonsVariant =
    selectedItem?.type === "know_dont_know" || selectedItem?.answerOnly
      ? "know_dont_know"
      : "true_false";
  const effectiveLayout = layout;
  const isCarouselLayout = effectiveLayout !== "classic";
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
      confirmCoachmarkId="review-flashcards-confirm-button"
      confirmDisabled={cardActionsConfirmDisabled}
      confirmLabel={cardActionsConfirmLabel}
    />
  );

  const boxesContent =
    effectiveLayout === "classic" ? (
      <Boxes
        boxes={boxes}
        activeBox={activeBox}
        handleSelectBox={handleSelectBox}
        onBoxLongPress={handleBoxLongPress}
        countsCoachmarkId="review-flashcards-box-counts"
        disabled={isBetweenCards || isLoading || correction != null || mistakeNudge != null}
        faces={boxFaces}
        horizontalScroll={isSmallPhoneLayout}
      />
    ) : (
      <BoxesCarousel
        boxes={boxes}
        activeBox={activeBox}
        handleSelectBox={handleSelectBox}
        onBoxLongPress={handleBoxLongPress}
        disabled={isBetweenCards || isLoading || correction != null || mistakeNudge != null}
        faces={boxFaces}
      />
    );
  const boxesScaleOffsetY = scaleOffsetY;
  const shouldRenderBottomButtons = !areButtonsOnTop;
  const bottomButtonsDockBottomOffset = isSmallPhoneLayout
    ? COMPACT_BOTTOM_BUTTONS_DOCK_BOTTOM_OFFSET
    : BOTTOM_BUTTONS_DOCK_BOTTOM_OFFSET;
  const bottomButtonsReservedSpace = shouldRenderBottomButtons
    ? Math.max(bottomButtonsHeight, BOTTOM_BUTTONS_MIN_HEIGHT) +
      bottomButtonsDockBottomOffset
    : 0;
  const hasCardsInSession = Object.values(boxes).some((box) => box.length > 0);
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
              <Card
                selectedItem={selectedItem}
                setAnswer={setAnswer}
                answer={answer}
                result={result}
                confirm={handleCardConfirm}
                reversed={reversed}
                setResult={setResult}
                correction={correction}
                wrongInputChange={wrongInputChange}
                setCorrectionRewers={setCorrectionRewers}
                introMode={false}
                onHintUpdate={() => undefined}
                hideHints
                isFocused={!isLoading}
                isBetweenCards={isBetweenCards || isActionCooldownActive}
                showExplanationEnabled={showExplanationEnabled}
                explanationOnlyOnWrong={explanationOnlyOnWrong}
              />
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
                  style={styles.boxesScrollViewport}
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
