import Ionicons from "@expo/vector-icons/Ionicons";
import Card from "@/src/components/card/card";
import BoxesCarousel from "@/src/components/Box/Carousel/BoxCarousel";
import Boxes from "@/src/components/Box/List/BoxList";
import FlashcardsPeekOverlay from "@/src/components/Box/Peek/FlashcardsPeek";
import Confetti from "@/src/components/confetti/Confetti";
import { FlashcardsButtons } from "@/src/components/flashcards/FlashcardsButtons";
import { DEFAULT_FLASHCARDS_BATCH_SIZE } from "@/src/config/appConfig";
import { useLearningStats } from "@/src/contexts/LearningStatsContext";
import {
  type StatBurst,
  useNavbarStats,
} from "@/src/contexts/NavbarStatsContext";
import { useSettings } from "@/src/contexts/SettingsContext";
import type { CustomCourseRecord } from "@/src/db/sqlite/db";
import {
  getCustomCourseById,
  getCustomFlashcards,
  getCustomReviewedFlashcardIds,
  getGlobalDailyStreakDays,
  scheduleCustomReview,
  updateCustomFlashcardHints,
} from "@/src/db/sqlite/db";
import { useBoxesPersistenceSnapshot } from "@/src/hooks/useBoxesPersistenceSnapshot";
import { useAutoResetFlag } from "@/src/hooks/useAutoResetFlag";
import { useFlashcardsAutoflow } from "@/src/hooks/useFlashcardsAutoflow";
import {
  type CorrectAnswerMeta,
  useFlashcardsInteraction,
} from "@/src/hooks/useFlashcardsInteraction";
import { useKeyboardBottomOffset } from "@/src/hooks/useKeyboardBottomOffset";
import { useAutoScaleToFit } from "@/src/hooks/useAutoScaleToFit";
import useSpellchecking from "@/src/hooks/useSpellchecking";
import { BoxesState, WordWithTranslations } from "@/src/types/boxes";
import { getExplanationState } from "@/src/utils/explanationState";
import { mapCustomCardToWord } from "@/src/utils/flashcardsMapper";
import { playFeedbackSound } from "@/src/utils/soundPlayer";
import { useIsFocused } from "@react-navigation/native";
// import { useRouter } from "expo-router";
import { FLASHCARDS_INTRO_MESSAGES } from "@/src/constants/introMessages";
import { useQuote } from "@/src/contexts/QuoteContext";
import { useScreenIntro } from "@/src/hooks/useScreenIntro";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import Reanimated, { LinearTransition } from "react-native-reanimated";
import { useStyles } from "@/src/screens/flashcards/FlashcardsScreen-styles";

const STREAK_TARGET = 5;
const STREAK_COOLDOWN_MS = 15 * 60 * 1000;
const COMEBACK_COOLDOWN_MS = 20 * 60 * 1000;
const LONG_THINK_MS = 12 * 1000;
const LONG_THINK_COOLDOWN_MS = 30 * 60 * 1000;
const LOSS_QUOTE_COOLDOWN_MS = 5 * 60 * 1000;
const BOX_SPAM_WINDOW_MS = 2500;
const BOX_SPAM_THRESHOLD = 40;
const BOX_SPAM_COOLDOWN_MS = 0;
const HINT_FAIL_THRESHOLD = 3;
const HINT_COOLDOWN_MS = 10 * 60 * 1000;
const TRUE_FALSE_POST_OK_COOLDOWN_MS = 1000;
const UI_WARMUP_DELAY_MS = 250;
const SCREEN_LAYOUT_TRANSITION = LinearTransition.duration(420);
const BOTTOM_BUTTONS_MIN_HEIGHT = 50;
const BOTTOM_BUTTONS_DOCK_BOTTOM_OFFSET = 56;
const BOTTOM_BUTTONS_KEYBOARD_DURATION_MS = 320;

function pickRandomBatch<T>(items: T[], size: number): T[] {
  const normalizedSize = Math.max(1, size);
  const pool = [...items];

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, normalizedSize);
}

function dedupeById<T extends { id: number }>(list: T[]): T[] {
  if (list.length <= 1) return list;
  const seen = new Set<number>();
  const next: T[] = [];
  for (const item of list) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    next.push(item);
  }
  return next;
}

// import MediumBoxes from "@/src/components/box/mediumboxes";
export default function Flashcards() {
  // const router = useRouter();
  const styles = useStyles();
  const {
    activeCustomCourseId,
    boxesLayout,
    flashcardsBatchSize,
    boxZeroEnabled,
    autoflowEnabled,
    explanationOnlyOnWrong,
    showExplanationEnabled,
    skipCorrectionEnabled,
    trueFalseButtonsVariant,
    actionButtonsPosition,
    colors,
  } = useSettings();
  const { registerKnownWord } = useLearningStats();
  const { applyStatBurst, getStatsSnapshot } = useNavbarStats();
  const { triggerQuote } = useQuote();
  const isFocused = useIsFocused();
  const [shouldCelebrate, setShouldCelebrate] = useState(false);
  const resetCelebrate = useCallback(() => setShouldCelebrate(false), []);
  useAutoResetFlag(shouldCelebrate, resetCelebrate);
  const correctStreakRef = useRef(0);
  const wrongStreakRef = useRef(0);
  const questionStartRef = useRef<number | null>(null);
  const perCardFailRef = useRef<Record<number, number>>({});
  const boxSpamRef = useRef<{
    box: keyof BoxesState | null;
    ts: number;
    count: number;
  }>({ box: null, ts: 0, count: 0 });
  const { IntroOverlay, unlockGate } = useScreenIntro({
    messages: FLASHCARDS_INTRO_MESSAGES,
    storageKey: "@flashcards_intro_seen_v1",
    triggerStrategy: "post_onboarding",
  });

  const handleStatsBurst = useCallback(
    (boxKey: keyof BoxesState, meta: CorrectAnswerMeta) => {
      if (boxKey === "boxFive") {
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
        if (baseBurst.promotionsDelta > 0) {
          try {
            const nextStreak = await getGlobalDailyStreakDays();
            if (nextStreak > getStatsSnapshot().streakDays) {
              streakDelta = 1;
            }
          } catch (error) {
            console.warn("[Flashcards] Failed to refresh streak after answer", error);
          }
        }

        if (!hasBaseDelta && streakDelta === 0) {
          return;
        }

        applyStatBurst({
          ...baseBurst,
          streakDelta,
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
    setBatchIndex,
  } = useBoxesPersistenceSnapshot({
    sourceLangId: activeCustomCourseId ?? 0,
    targetLangId: activeCustomCourseId ?? 0,
    level: `custom-${activeCustomCourseId ?? 0}`,
    storageNamespace: "customBoxes",
    autosave: activeCustomCourseId !== null,
    saveDelayMs: 1000,
  });

  const [customCourse, setCustomCourse] = useState<CustomCourseRecord | null>(
    null,
  );
  const [customCards, setCustomCards] = useState<WordWithTranslations[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isUiReady, setIsUiReady] = useState(false);
  const [loadedCourseId, setLoadedCourseId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isActionCooldownActive, setIsActionCooldownActive] = useState(false);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
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
  const uiWarmupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingOverlayOpacity = useRef(new Animated.Value(1)).current;
  const lastActionCooldownCardIdRef = useRef<number | null>(null);
  const totalCards = customCards.length;
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
    onCorrectAnswer: handleStatsBurst,
    boxZeroEnabled,
    skipDemotionCorrection: skipCorrection,
  });
  const correctionLocked =
    correction != null && correction.mode !== "intro";
  const selectedItemId = selectedItem?.id ?? null;
  const [displayResultState, setDisplayResultState] = useState<{
    cardId: number | null;
    result: boolean | null;
  }>({
    cardId: null,
    result: null,
  });
  const lastObservedResultRef = useRef<boolean | null>(null);
  const lastTrueFalseTapRef = useRef<{
    cardId: number | null;
    ts: number;
    answer: boolean | null;
  } | null>(null);
  const selectedTrueFalseAnswer =
    selectedTrueFalseUiState.cardId === selectedItemId
      ? selectedTrueFalseUiState.answer
      : null;

  useEffect(() => {
    const didResultChange = lastObservedResultRef.current !== result;
    lastObservedResultRef.current = result;

    if (!didResultChange && result !== null) {
      return;
    }
    if (result === null) {
      setDisplayResultState((current) =>
        current.cardId === null && current.result === null
          ? current
          : { cardId: null, result: null },
      );
      return;
    }
    if (selectedItemId != null) {
      setDisplayResultState({
        cardId: selectedItemId,
        result,
      });
    }
  }, [result, selectedItemId]);

  const displayResult =
    displayResultState.cardId != null &&
    displayResultState.cardId === selectedItemId
      ? displayResultState.result
      : null;

  const resultPending = result !== null;
  const isKnowDontKnow = selectedItem?.type === "know_dont_know";
  const initialExplanationState = getExplanationState({
    selectedItem,
    result: displayResult,
    showExplanationEnabled,
    explanationOnlyOnWrong,
  });
  const waitingForOk =
    !correction && !isBetweenCards && initialExplanationState.isExplanationPending;
  const boxSelectionLocked =
    correctionLocked || waitingForOk || resultPending || isBetweenCards;

  const handleSelectBox = useCallback(
    (boxName: keyof BoxesState) => {
      if (boxSelectionLocked) {
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

      if (boxSpamRef.current.count >= BOX_SPAM_THRESHOLD) {
        triggerQuote({
          trigger: `quote_box_spam_${boxName}`,
          category: "box_spam",
          cooldownMs: BOX_SPAM_COOLDOWN_MS,
          respectGlobalCooldown: false, // zawsze pokaż, nawet gdy inny cytat był niedawno
        });
        boxSpamRef.current.count = 0;
      }

      baseHandleSelectBox(boxName);
    },
    [baseHandleSelectBox, boxSelectionLocked, triggerQuote],
  );

  useEffect(() => {
    if (displayResult === null) return;
    if (__DEV__) {
      const tap = lastTrueFalseTapRef.current;
      const isCurrentTap = tap?.cardId != null && tap.cardId === selectedItemId;
      console.log("[Flashcards][TF] displayResult", {
        cardId: selectedItemId,
        result: displayResult,
        elapsedFromTapMs:
          isCurrentTap && tap ? Date.now() - tap.ts : null,
        tappedAnswer:
          isCurrentTap && tap
            ? tap.answer === null
              ? null
              : tap.answer
                ? "true"
                : "false"
            : null,
      });
    }
    playFeedbackSound(displayResult);
    const now = Date.now();
    const elapsed = questionStartRef.current
      ? now - questionStartRef.current
      : null;

    if (displayResult === true) {
      const hadComeback = wrongStreakRef.current >= 3;
      wrongStreakRef.current = 0;
      correctStreakRef.current += 1;

      if (selectedItem?.id != null) {
        perCardFailRef.current[selectedItem.id] = 0;
      }

      if (correctStreakRef.current >= STREAK_TARGET) {
        triggerQuote({
          trigger: "quote_streak",
          category: "streak",
          cooldownMs: STREAK_COOLDOWN_MS,
        });
      }

      if (hadComeback) {
        triggerQuote({
          trigger: "quote_comeback",
          category: "comeback",
          cooldownMs: COMEBACK_COOLDOWN_MS,
          probability: 0.5, // ~50% rzadziej
        });
      }

      const isFast = elapsed !== null && elapsed < 3000;

      if (isFast) {
        triggerQuote({
          trigger: "quote_win_fast",
          category: "win_fast",
          cooldownMs: 2 * 60 * 1000,
          probability: 0.6,
        });
      } else {
        // Standard win
        triggerQuote({
          trigger: "quote_win_standard",
          category: "win_standard",
          cooldownMs: 3 * 60 * 1000,
          probability: 0.15, // zmniejsz szansę o ~50%
        });
      }

      if (elapsed !== null && elapsed > LONG_THINK_MS) {
        triggerQuote({
          trigger: "quote_long_think",
          category: "long_think",
          cooldownMs: LONG_THINK_COOLDOWN_MS,
          probability: 0.5,
        });
      }
    } else {
      correctStreakRef.current = 0;
      wrongStreakRef.current += 1;

      const cardId = selectedItem?.id;
      if (cardId != null) {
        const nextFailCount = (perCardFailRef.current[cardId] ?? 0) + 1;
        perCardFailRef.current[cardId] = nextFailCount;
        if (nextFailCount >= HINT_FAIL_THRESHOLD) {
          triggerQuote({
            trigger: `quote_hint_${cardId}`,
            category: "hint",
            cooldownMs: HINT_COOLDOWN_MS,
          });
          perCardFailRef.current[cardId] = 0;
        }
      }

      triggerQuote({
        trigger: "quote_loss_random",
        category: "loss",
        probability: 0.1, // ~50% rzadziej
        cooldownMs: LOSS_QUOTE_COOLDOWN_MS,
      });
    }
  }, [displayResult, selectedItem, triggerQuote]);

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

  useEffect(() => {
    if (!peekBox) return;
    const hasCards = (boxes[peekBox] ?? []).length > 0;
    if (!hasCards) {
      setPeekBox(null);
    }
  }, [boxes, peekBox]);

  const trackedIds = useMemo(() => {
    const ids = new Set<number>();
    for (const list of Object.values(boxes)) {
      for (const item of list) ids.add(item.id);
    }
    for (const item of learned) ids.add(item.id);
    return ids;
  }, [boxes, learned]);
  const allCardsDistributed = totalCards > 0 && trackedIds.size >= totalCards;
  const totalCardsInBoxes = useMemo(() => {
    return (
      boxes.boxZero.length +
      boxes.boxOne.length +
      boxes.boxTwo.length +
      boxes.boxThree.length +
      boxes.boxFour.length +
      boxes.boxFive.length
    );
  }, [boxes]);

  useEffect(() => {
    if (activeCustomCourseId == null) return;
    if (!isReady) return;
    if (customCards.length === 0) return;
    if (totalCardsInBoxes > 0 || usedWordIds.length > 0) return;

    let cancelled = false;

    void getCustomReviewedFlashcardIds(activeCustomCourseId)
      .then((reviewedIds) => {
        if (cancelled || reviewedIds.length === 0) {
          return;
        }
        addUsedWordIds(reviewedIds);
      })
      .catch((error) => {
        console.warn(
          `[Flashcards] Failed to seed reviewed ids for course ${activeCustomCourseId}`,
          error
        );
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeCustomCourseId,
    addUsedWordIds,
    customCards.length,
    isReady,
    totalCardsInBoxes,
    usedWordIds.length,
  ]);

  const downloadData = useCallback(async (): Promise<void> => {
    if (!customCards.length) return;

    const remaining = customCards.filter((card) => !trackedIds.has(card.id));
    if (remaining.length === 0) return;

    const batchSize = flashcardsBatchSize ?? DEFAULT_FLASHCARDS_BATCH_SIZE;
    const nextBatch = pickRandomBatch(remaining, batchSize);
    let actuallyAdded: WordWithTranslations[] = [];

    setBoxes((prev) => {
      const targetKey = boxZeroEnabled ? "boxZero" : "boxOne";
      const existingIds = new Set(prev[targetKey].map((card) => card.id));
      actuallyAdded = nextBatch.filter((card) => !existingIds.has(card.id));
      if (actuallyAdded.length === 0) {
        return prev;
      }
      return {
        ...prev,
        [targetKey]: [...prev[targetKey], ...actuallyAdded],
      };
    });
    if (actuallyAdded.length === 0) return;
    addUsedWordIds(actuallyAdded.map((card) => card.id));
    setBatchIndex((prev) => prev + 1);
  }, [
    addUsedWordIds,
    boxZeroEnabled,
    customCards,
    flashcardsBatchSize,
    setBatchIndex,
    trackedIds,
    setBoxes,
  ]);

  const introBoxLimitReached = boxZeroEnabled
    ? boxes.boxZero.length >= 30
    : boxes.boxOne.length >= 30;

  useEffect(() => {
    if (activeBox) {
      unlockGate("box_selected");
    }
  }, [activeBox, unlockGate]);

  // Allow autoflow to switch boxes even when a card is shown,
  // otherwise it never jumps to a clogged box until the current box is emptied.
  const canAutoflowSwitch = !boxSelectionLocked && !resultPending;

  useEffect(() => {
    if (selectedItem && displayResult === null) {
      questionStartRef.current = Date.now();
    }
  }, [displayResult, selectedItem]);

  useFlashcardsAutoflow({
    enabled: autoflowEnabled && isFocused,
    boxes,
    activeBox,
    handleSelectBox: baseHandleSelectBox,
    canSwitch: canAutoflowSwitch,
    boxZeroEnabled,
    isReady: isReady,
    downloadMore: downloadData,
    introBoxLimitReached,
    totalFlashcardsInCourse: totalCards,
  });

  useEffect(() => {
    if (boxZeroEnabled) return;
    if (!boxes.boxZero.length) return;

    const wordsToReset = boxes.boxZero;
    setBoxes((prev) => ({
      ...prev,
      boxZero: [],
    }));
    removeUsedWordIds(wordsToReset.map((word) => word.id));
  }, [boxZeroEnabled, boxes.boxZero, removeUsedWordIds, setBoxes]);

  useEffect(() => {
    if (!isFocused) return;

    let isMounted = true;

    if (activeCustomCourseId == null) {
      setCustomCourse(null);
      setCustomCards([]);
      setLoadError(null);
      setLoadedCourseId(null);
      setIsLoadingData(false);
      return () => {
        isMounted = false;
      };
    }

    const shouldShowLoader =
      loadedCourseId !== activeCustomCourseId || customCards.length === 0;
    setIsLoadingData(shouldShowLoader);
    setLoadError(null);

    void Promise.all([
      getCustomCourseById(activeCustomCourseId),
      getCustomFlashcards(activeCustomCourseId),
    ])
      .then(([courseRow, flashcardRows]) => {
        if (!isMounted) return;
        if (!courseRow) {
          setCustomCourse(null);
          setCustomCards([]);
          setLoadError("Wybrany kurs nie istnieje.");
          return;
        }
        setCustomCourse(courseRow);
        const mapped = flashcardRows.map(mapCustomCardToWord);
        // console.log('After mapping flashcards:', mapped);
        setCustomCards(mapped);
        setLoadedCourseId(activeCustomCourseId);
      })
      .catch((error) => {
        console.error("Failed to load custom flashcards", error);
        if (!isMounted) return;
        setCustomCourse(null);
        setCustomCards([]);
        setLoadError("Nie udało się wczytać fiszek.");
      })
      .finally(() => {
        if (isMounted) setIsLoadingData(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeCustomCourseId, isFocused, customCards.length, loadedCourseId]);

  useEffect(() => {
    if (!isReady) return;
    if (isLoadingData || customCards.length === 0) return;

    const allowedIds = new Set(customCards.map((card) => card.id));

    setBoxes((prev) => {
      let mutated = false;
      const sanitize = (list: WordWithTranslations[]) => {
        const filtered = list.filter((item) => allowedIds.has(item.id));
        const deduped = dedupeById(filtered);
        if (deduped.length !== list.length) mutated = true;
        return deduped;
      };

      const next: BoxesState = {
        boxZero: sanitize(prev.boxZero),
        boxOne: sanitize(prev.boxOne),
        boxTwo: sanitize(prev.boxTwo),
        boxThree: sanitize(prev.boxThree),
        boxFour: sanitize(prev.boxFour),
        boxFive: sanitize(prev.boxFive),
      };
      return mutated ? next : prev;
    });

    setLearned((current) => {
      const filtered = current.filter((card) => allowedIds.has(card.id));
      const deduped = dedupeById(filtered);
      return deduped.length === current.length ? current : deduped;
    });
  }, [customCards, isReady, isLoadingData, learned, setBoxes, setLearned]);

  useEffect(() => {
    if (!isReady) return;
    if (isLoadingData) return;
    if (activeCustomCourseId == null) return;
    if (totalCardsInBoxes > 0) return;
    if (allCardsDistributed) return;
    if (!customCards.length) return;

    void downloadData();
  }, [
    isReady,
    isLoadingData,
    activeCustomCourseId,
    totalCardsInBoxes,
    allCardsDistributed,
    customCards,
    downloadData,
  ]);

  useEffect(() => {
    if (
      selectedItem &&
      !customCards.some((card) => card.id === selectedItem.id)
    ) {
      clearSelection();
    }
  }, [clearSelection, customCards, selectedItem]);

  const patchCardHints = useCallback(
    (cardId: number, hintFront: string | null, hintBack: string | null) => {
      const patcher = (item: WordWithTranslations) =>
        item.id === cardId ? { ...item, hintFront, hintBack } : item;

      setCustomCards((prev) => prev.map(patcher));
      setBoxes((prev) => ({
        boxZero: prev.boxZero.map(patcher),
        boxOne: prev.boxOne.map(patcher),
        boxTwo: prev.boxTwo.map(patcher),
        boxThree: prev.boxThree.map(patcher),
        boxFour: prev.boxFour.map(patcher),
        boxFive: prev.boxFive.map(patcher),
      }));
      setLearned((prev) => prev.map(patcher));
      updateSelectedItem((current) => patcher(current));
    },
    [setBoxes, setCustomCards, setLearned, updateSelectedItem],
  );

  const handleHintUpdate = useCallback(
    async (
      cardId: number,
      hintFront: string | null,
      hintBack: string | null,
    ) => {
      if (activeCustomCourseId == null) return;
      patchCardHints(cardId, hintFront, hintBack);
      try {
        await updateCustomFlashcardHints(cardId, { hintFront, hintBack });
      } catch (error) {
        console.error("Failed to update flashcard hint", { cardId, error });
      }
    },
    [activeCustomCourseId, patchCardHints],
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
  const shouldKeepLoadingOverlayVisible =
    activeCustomCourseId != null &&
    !loadError &&
    (isLoadingData ||
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
  const shouldShowBoxes =
    activeCustomCourseId != null &&
    isReady &&
    !isLoadingData &&
    !loadError &&
    customCards.length > 0;
  const introModeActive = boxZeroEnabled && activeBox === "boxZero";
  const handleTrueFalseAnswer = useCallback(
    (value: boolean) => {
      const tapTs = Date.now();
      lastTrueFalseTapRef.current = {
        cardId: selectedItemId,
        ts: tapTs,
        answer: value,
      };
      if (__DEV__) {
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
      confirm(choice, choice);
    },
    [confirm, displayResult, isActionCooldownActive, isBetweenCards, selectedItemId, setAnswer],
  );
  const handleTrueFalseOk = useCallback(() => {
    if (isActionCooldownActive) return;
    acknowledgeExplanation();
  }, [acknowledgeExplanation, isActionCooldownActive]);
  const isIntroMode = Boolean(introModeActive && correction?.mode === "intro");
  const showCorrectionInputs = Boolean(
    correction && (displayResult === false || isIntroMode),
  );
  const {
    isExplanationVisible,
    isExplanationPending,
  } = getExplanationState({
    selectedItem,
    result: displayResult,
    showCorrectionInputs,
    showExplanationEnabled,
    explanationOnlyOnWrong,
  });
  const shouldUseTrueFalseActionBar =
    courseHasOnlyTrueFalse ||
    selectedItem?.type === "true_false" ||
    isKnowDontKnow;
  const shouldShowTrueFalseActions =
    shouldUseTrueFalseActionBar && shouldShowBoxes && !correction;
  const trueFalseActionsMode =
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
  const handleCardActionsConfirm = isExplanationVisible
    ? handleTrueFalseOk
    : () => confirm();
  const cardActionsDownloadDisabled =
    downloadDisabled ||
    isExplanationVisible ||
    isActionCooldownActive ||
    isImmediateActionLockActive;
  const cardActionsConfirmDisabled =
    isActionCooldownActive || isImmediateActionLockActive;
  const cardActionsConfirmLabel = isExplanationVisible ? "OK" : "ZATWIERDŹ";
  const addButtonDisabled = downloadDisabled;
  const shouldShowFloatingAdd =
    shouldShowBoxes &&
    (courseHasOnlyTrueFalse ||
      selectedItem?.type === "true_false" ||
      isKnowDontKnow);
  const isCarouselLayout = boxesLayout !== "classic";
  const carouselMinScale = 0.42;
  const {
    scale: boxesScale,
    scaledHeight: boxesScaledHeight,
    scaleOffsetY,
    onViewportLayout: onBoxesViewportLayout,
    onContentLayout: onBoxesContentLayout,
    needsScrollFallback: boxesNeedScrollFallback,
  } = useAutoScaleToFit({ minScale: isCarouselLayout ? carouselMinScale : 0.72 });
  const shouldHideHintsForActiveBox =
    activeBox === "boxFour" || activeBox === "boxFive";
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
  const effectiveTrueFalseButtonsVariant = isKnowDontKnow
    ? "know_dont_know"
    : selectedItem?.answerOnly
      ? "know_dont_know"
      : courseHasOnlyKnowDontKnow
        ? "know_dont_know"
        : trueFalseButtonsVariant;
  const areButtonsOnTop = actionButtonsPosition === "top";
  const { keyboardVisible, bottomOffset: bottomButtonsOffset } =
    useKeyboardBottomOffset({
      enabled: !areButtonsOnTop,
      gap: 8,
      targetBottomInWindow: bottomButtonsBottomInWindow,
      keyboardTopCorrection: 44,
      androidDurationMs: BOTTOM_BUTTONS_KEYBOARD_DURATION_MS,
    });
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
  }, [selectedItemId]);

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
    resetInteractionState();
  }, [activeCustomCourseId, resetInteractionState]);

  useEffect(() => {
    return () => {
      if (uiWarmupTimerRef.current) {
        clearTimeout(uiWarmupTimerRef.current);
      }
      if (actionCooldownTimerRef.current) {
        clearTimeout(actionCooldownTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (areButtonsOnTop || !shouldShowBoxes) return;
    measureBottomButtons();
  }, [
    areButtonsOnTop,
    measureBottomButtons,
    selectedItem?.id,
    shouldShowBoxes,
    showCardActions,
    shouldShowTrueFalseActions,
  ]);

  useEffect(() => {
    if (areButtonsOnTop || !shouldShowBoxes || !keyboardVisible) return;
    const timers = [0, 120, 280, 520].map((delay) =>
      setTimeout(() => {
        measureBottomButtons();
      }, delay),
    );
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [
    areButtonsOnTop,
    keyboardVisible,
    measureBottomButtons,
    selectedItem?.id,
    shouldShowBoxes,
  ]);

  let cardSection: ReactNode;
  if (activeCustomCourseId == null) {
    cardSection = (
      <View style={{ paddingHorizontal: 32 }}>
        <Text allowFontScaling>
          Wybierz własny kurs w panelu kursów, aby rozpocząć naukę.
        </Text>
      </View>
    );
  } else if (loadError) {
    cardSection = (
      <View style={{ paddingHorizontal: 32 }}>
        <Text allowFontScaling>{loadError}</Text>
      </View>
    );
  } else if (!customCards.length) {
    cardSection = (
      <View style={{ paddingHorizontal: 32 }}>
        <Text allowFontScaling>
          Dodaj fiszki do tego kursu, aby móc z nich korzystać.
        </Text>
      </View>
    );
  } else {
    cardSection = (
      <Card
        selectedItem={selectedItem}
        setAnswer={setAnswer}
        answer={answer}
        result={displayResult}
        confirm={confirm}
        reversed={reversed}
        setResult={setResult}
        correction={correction}
        wrongInputChange={wrongInputChange}
        setCorrectionRewers={setCorrectionRewers}
        introMode={introModeActive}
        onHintUpdate={handleHintUpdate}
        isFocused={isCardFocusEnabled}
        isBetweenCards={isBetweenCards}
        disableLayoutAnimation={
          shouldKeepLoadingOverlayVisible || showLoadingOverlay
        }
        hideHints={shouldHideHintsForActiveBox}
        showExplanationEnabled={showExplanationEnabled}
        explanationOnlyOnWrong={explanationOnlyOnWrong}
      />
    );
  }

  const renderButtons = (position: "top" | "bottom") => (
    <FlashcardsButtons
      position={position}
      showTrueFalseActions={shouldShowTrueFalseActions}
      trueFalseActionsDisabled={trueFalseActionsDisabled}
      onTrueFalseAnswer={handleTrueFalseAnswer}
      trueFalseActionsMode={trueFalseActionsMode}
      onTrueFalseOk={handleTrueFalseOk}
      trueFalseButtonsVariant={effectiveTrueFalseButtonsVariant}
      selectedTrueFalseAnswer={selectedTrueFalseAnswer}
      showCardActions={showCardActions}
      onCardActionsConfirm={handleCardActionsConfirm}
      onDownload={downloadData}
      downloadDisabled={cardActionsDownloadDisabled}
      confirmDisabled={cardActionsConfirmDisabled}
      confirmLabel={cardActionsConfirmLabel}
    />
  );

  const boxesContent =
    boxesLayout === "classic" ? (
      <Boxes
        boxes={boxes}
        activeBox={activeBox}
        handleSelectBox={handleSelectBox}
        hideBoxZero={!boxZeroEnabled}
        onBoxLongPress={handleBoxLongPress}
        disabled={boxSelectionLocked}
      />
    ) : (
      <BoxesCarousel
        boxes={boxes}
        activeBox={activeBox}
        handleSelectBox={handleSelectBox}
        hideBoxZero={!boxZeroEnabled}
        onBoxLongPress={handleBoxLongPress}
        disabled={boxSelectionLocked}
      />
    );
  const boxesScaleOffsetY = scaleOffsetY;
  const shouldAnimateScreenLayout =
    !shouldKeepLoadingOverlayVisible && !showLoadingOverlay;
  const screenSectionLayout = shouldAnimateScreenLayout
    ? SCREEN_LAYOUT_TRANSITION
    : undefined;
  const shouldRenderBottomButtons = !areButtonsOnTop && shouldShowBoxes;
  const bottomButtonsReservedSpace = shouldRenderBottomButtons
    ? Math.max(bottomButtonsHeight, BOTTOM_BUTTONS_MIN_HEIGHT) +
      BOTTOM_BUTTONS_DOCK_BOTTOM_OFFSET
    : 0;

  return (
    <View style={styles.container}>
      <IntroOverlay />
      <Confetti generateConfetti={shouldCelebrate} />

      <View
        style={[
          styles.content,
          shouldRenderBottomButtons
            ? { paddingBottom: bottomButtonsReservedSpace }
            : null,
        ]}
        pointerEvents={shouldRenderLoadingOverlay ? "none" : "auto"}
      >
        <Reanimated.View
          layout={screenSectionLayout}
          style={styles.cardSectionWrapper}
        >
          {cardSection}
        </Reanimated.View>

        {areButtonsOnTop ? (
          <Reanimated.View
            layout={screenSectionLayout}
            style={styles.topButtonsWrapper}
          >
            {renderButtons("top")}
          </Reanimated.View>
        ) : null}

        {shouldShowBoxes && (
          <Reanimated.View
            layout={screenSectionLayout}
            style={[
              styles.boxesWrapper,
              !areButtonsOnTop && styles.boxesWrapperWithBottomButtons,
            ]}
          >
            {shouldShowFloatingAdd && (
              <Pressable
                style={styles.addButton}
                onPress={downloadData}
                disabled={addButtonDisabled}
                accessibilityLabel="Dodaj nowe fiszki do pudełek"
              >
                <Ionicons name="add" size={26} color="#0F172A" />
              </Pressable>
            )}

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

          </Reanimated.View>
        )}

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
        activeCustomCourseId={activeCustomCourseId}
        activeCourseName={customCourse?.name ?? null}
        onClose={closePeek}
      />
    </View>
  );
}
