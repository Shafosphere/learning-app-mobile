import Card from "@/src/components/card/card";
import { FlashcardsGameView } from "@/src/components/flashcards/FlashcardsGameView";
import { DEFAULT_FLASHCARDS_BATCH_SIZE } from "@/src/config/appConfig";
import { useLearningStats } from "@/src/contexts/LearningStatsContext";
import { useSettings } from "@/src/contexts/SettingsContext";
import type { CustomCourseRecord } from "@/src/db/sqlite/db";
import {
  getCustomCourseById,
  getCustomFlashcards,
  scheduleCustomReview,
  updateCustomFlashcardHints,
} from "@/src/db/sqlite/db";
import { useBoxesPersistenceSnapshot } from "@/src/hooks/useBoxesPersistenceSnapshot";
import { useAutoResetFlag } from "@/src/hooks/useAutoResetFlag";
import { useFlashcardsAutoflow } from "@/src/hooks/useFlashcardsAutoflow";
import { useFlashcardsInteraction } from "@/src/hooks/useFlashcardsInteraction";
import useSpellchecking from "@/src/hooks/useSpellchecking";
import { BoxesState, WordWithTranslations } from "@/src/types/boxes";
import { mapCustomCardToWord } from "@/src/utils/flashcardsMapper";
import { playFeedbackSound } from "@/src/utils/soundPlayer";
import { makeTrueFalseHandler } from "@/src/utils/trueFalseAnswer";
import { useIsFocused } from "@react-navigation/native";
// import { useRouter } from "expo-router";
import { FLASHCARDS_INTRO_MESSAGES } from "@/src/constants/introMessages";
import { useQuote } from "@/src/contexts/QuoteContext";
import { useScreenIntro } from "@/src/hooks/useScreenIntro";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

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
  const {
    activeCustomCourseId,
    boxesLayout,
    flashcardsBatchSize,
    boxZeroEnabled,
    autoflowEnabled,
    skipCorrectionEnabled,
    colors,
  } = useSettings();
  const { registerKnownWord } = useLearningStats();
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

  const {
    boxes,
    setBoxes,
    isReady,
    addUsedWordIds,
    removeUsedWordIds,
    setBatchIndex,
    saveNow,
  } =
    useBoxesPersistenceSnapshot({
      sourceLangId: activeCustomCourseId ?? 0,
      targetLangId: activeCustomCourseId ?? 0,
      level: `custom-${activeCustomCourseId ?? 0}`,
      storageNamespace: "customBoxes",
      autosave: activeCustomCourseId !== null,
      saveDelayMs: 0,
    });

  const [customCourse, setCustomCourse] =
    useState<CustomCourseRecord | null>(null);
  const [customCards, setCustomCards] = useState<WordWithTranslations[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [loadedCourseId, setLoadedCourseId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const totalCards = customCards.length;
  const courseHasOnlyTrueFalse = useMemo(
    () =>
      customCards.length > 0 &&
      customCards.every((card) => card.type === "true_false"),
    [customCards]
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
    onCorrectAnswer: (boxKey) => {
      if (boxKey !== "boxFive") return;
      setShouldCelebrate(false);
      requestAnimationFrame(() => {
        setShouldCelebrate(true);
        triggerQuote({
          trigger: "quote_box_five_win",
          category: "win_mastery",
          probability: 1, // Mastery moment should always feel rewarding?
          cooldownMs: 5 * 60 * 1000,
        });
      });
    },
    boxZeroEnabled,
    skipDemotionCorrection: skipCorrection,
  });
  const correctionLocked = correction?.mode === "demote";

  const handleSelectBox = useCallback(
    (boxName: keyof BoxesState) => {
      if (correctionLocked) {
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
    [baseHandleSelectBox, correctionLocked, triggerQuote]
  );

  useEffect(() => {
    if (result === null) return;
    playFeedbackSound(result);
    const now = Date.now();
    const elapsed = questionStartRef.current
      ? now - questionStartRef.current
      : null;

    if (result === true) {
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
          probability: 0.6
        });
      } else {
        // Standard win
        triggerQuote({
          trigger: "quote_win_standard",
          category: "win_standard",
          cooldownMs: 3 * 60 * 1000,
          probability: 0.15 // zmniejsz szansę o ~50%
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
  }, [result, selectedItem, triggerQuote]);

  const [peekBox, setPeekBox] = useState<keyof BoxesState | null>(null);
  const peekCards = useMemo(
    () => (peekBox ? getQueueForBox(peekBox) : []),
    [getQueueForBox, peekBox]
  );

  const handleBoxLongPress = useCallback(
    (boxName: keyof BoxesState) => {
      const list = boxes[boxName] ?? [];
      if (!list.length) return;
      setPeekBox(boxName);
    },
    [boxes]
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
    await saveNow();
  }, [
    addUsedWordIds,
    boxZeroEnabled,
    customCards,
    flashcardsBatchSize,
    saveNow,
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

  const resultPending = result !== null;
  // Allow autoflow to switch boxes even when a card is shown,
  // otherwise it never jumps to a clogged box until the current box is emptied.
  const canAutoflowSwitch = !correctionLocked && !resultPending;

  useEffect(() => {
    if (selectedItem && result === null) {
      questionStartRef.current = Date.now();
    }
  }, [result, selectedItem]);

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
    if (selectedItem && !customCards.some((card) => card.id === selectedItem.id)) {
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
    [setBoxes, setCustomCards, setLearned, updateSelectedItem]
  );

  const handleHintUpdate = useCallback(
    async (cardId: number, hintFront: string | null, hintBack: string | null) => {
      if (activeCustomCourseId == null) return;
      patchCardHints(cardId, hintFront, hintBack);
      try {
        await updateCustomFlashcardHints(cardId, { hintFront, hintBack });
      } catch (error) {
        console.error("Failed to update flashcard hint", { cardId, error });
      }
    },
    [activeCustomCourseId, patchCardHints]
  );

  const downloadDisabled =
    customCards.length === 0 ||
    allCardsDistributed ||
    isLoadingData ||
    !isReady ||
    (boxZeroEnabled
      ? boxes.boxZero.length >= 40
      : boxes.boxOne.length >= 40);
  const shouldShowBoxes =
    activeCustomCourseId != null &&
    isReady &&
    !isLoadingData &&
    !loadError &&
    customCards.length > 0;
  const introModeActive = boxZeroEnabled && activeBox === "boxZero";
  const handleTrueFalseAnswer = useMemo(
    () =>
      makeTrueFalseHandler({
        setAnswer,
        confirm,
        passChoiceAsSelectedTranslation: true,
      }),
    [confirm, setAnswer]
  );
  const explanationText =
    typeof selectedItem?.explanation === "string"
      ? selectedItem.explanation.trim()
      : "";
  const shouldShowExplanation =
    selectedItem?.type === "true_false" &&
    result === false &&
    explanationText.length > 0;
  const shouldShowTrueFalseActions =
    ((courseHasOnlyTrueFalse || selectedItem?.type === "true_false") ||
      shouldShowExplanation) &&
    shouldShowBoxes &&
    !correction;
  const trueFalseActionsMode = shouldShowExplanation ? "ok" : "answer";
  const trueFalseActionsDisabled = shouldShowExplanation
    ? isBetweenCards
    : result !== null || isBetweenCards;
  const addButtonDisabled = downloadDisabled;
  const shouldShowFloatingAdd =
    shouldShowBoxes && (courseHasOnlyTrueFalse || selectedItem?.type === "true_false");

  useEffect(() => {
    resetInteractionState();
  }, [activeCustomCourseId, resetInteractionState]);

  let cardSection: ReactNode;
  if (activeCustomCourseId == null) {
    cardSection = (
      <View style={{ paddingHorizontal: 32 }}>
        <Text allowFontScaling>
          Wybierz własny kurs w panelu kursów, aby rozpocząć naukę.
        </Text>
      </View>
    );
  } else if (isLoadingData) {
    cardSection = (
      <View style={{ paddingHorizontal: 32, alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.paragraph} />
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
        result={result}
        confirm={confirm}
        reversed={reversed}
        setResult={setResult}
        correction={correction}
        wrongInputChange={wrongInputChange}
        setCorrectionRewers={setCorrectionRewers}
        onDownload={downloadData}
        downloadDisabled={downloadDisabled}
        introMode={introModeActive}
        onHintUpdate={handleHintUpdate}
        hideActions={courseHasOnlyTrueFalse}
        showTrueFalseActions={shouldShowTrueFalseActions}
        trueFalseActionsDisabled={trueFalseActionsDisabled}
        onTrueFalseAnswer={handleTrueFalseAnswer}
        trueFalseActionsMode={trueFalseActionsMode}
        onTrueFalseOk={acknowledgeExplanation}
        isFocused={isFocused}
      />
    );
  }

  return (
    <FlashcardsGameView
      introOverlay={<IntroOverlay />}
      shouldCelebrate={shouldCelebrate}
      boxes={boxes}
      activeBox={activeBox}
      onSelectBox={handleSelectBox}
      onBoxLongPress={handleBoxLongPress}
      boxesLayout={boxesLayout}
      hideBoxZero={!boxZeroEnabled}
      showBoxes={shouldShowBoxes}
      showFloatingAdd={shouldShowFloatingAdd}
      addButtonDisabled={addButtonDisabled}
      onAddButtonPress={downloadData}
      showTrueFalseActions={shouldShowTrueFalseActions}
      trueFalseActionsDisabled={trueFalseActionsDisabled}
      onTrueFalseAnswer={handleTrueFalseAnswer}
      trueFalseActionsMode={trueFalseActionsMode}
      onTrueFalseOk={acknowledgeExplanation}
      peekBox={peekBox}
      peekCards={peekCards}
      activeCustomCourseId={activeCustomCourseId}
      activeCourseName={customCourse?.name ?? null}
      onClosePeek={closePeek}
    >
      {cardSection}
    </FlashcardsGameView>
  );
}
