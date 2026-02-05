import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Card from "@/src/components/card/card";
import type { CardCorrectionType } from "@/src/components/card/card-types";
import { FlashcardsGameView } from "@/src/components/flashcards/FlashcardsGameView";
import { DEFAULT_FLASHCARDS_BATCH_SIZE } from "@/src/config/appConfig";
import {
  advanceCustomReview,
  getDueCustomReviewFlashcards,
  scheduleCustomReview,
} from "@/src/db/sqlite/db";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useAutoResetFlag } from "@/src/hooks/useAutoResetFlag";
import useSpellchecking from "@/src/hooks/useSpellchecking";
import { BoxesState, WordWithTranslations } from "@/src/types/boxes";
import { stripDiacritics } from "@/src/utils/diacritics";
import { mapReviewCardToWord } from "@/src/utils/flashcardsMapper";
import { playFeedbackSound } from "@/src/utils/soundPlayer";
import { makeTrueFalseHandler } from "@/src/utils/trueFalseAnswer";
import { useLocalSearchParams } from "expo-router";

const BOX_SPAM_WINDOW_MS = 2000;
const BOX_SPAM_THRESHOLD = 20;
const LONG_THINK_MS = 12 * 1000;

const NON_INTRO_BOXES: readonly (keyof BoxesState)[] = [
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
  const value = typeof stage === "number" ? stage : 1;
  const clamped = Math.max(0, Math.min(value, 5));
  // Stage 0 (immediate) trafia tutaj do boxOne, bo boxZero jest ukryty na tym ekranie.
  if (clamped <= 1) return "boxOne";
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
      return 1;
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
  const params = useLocalSearchParams<{ courseId?: string }>();
  const { trueFalseButtonsVariant } = useSettings();
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
  const [boxes, setBoxes] = useState<BoxesState>(() => createEmptyBoxes());
  const [activeBox, setActiveBox] = useState<keyof BoxesState | null>("boxOne");
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
  const [isLoading, setIsLoading] = useState(false);
  const scheduledTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queuesRef = useRef<Record<keyof BoxesState, WordWithTranslations[]>>({
    boxZero: [],
    boxOne: [],
    boxTwo: [],
    boxThree: [],
    boxFour: [],
    boxFive: [],
  });

  const clearScheduledTimers = useCallback(() => {
    const timers = scheduledTimersRef.current;
    timers.forEach((timer) => {
      if (timer) clearTimeout(timer);
    });
    timers.clear();
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
  }, []);

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

  const scheduleReturnToBox = useCallback(
    (card: WordWithTranslations, nextStage: number, nextReview: number) => {
      const targetBox = stageToBox(nextStage);
      const delay = Math.max(0, nextReview - Date.now());
      const timers = scheduledTimersRef.current;

      if (timers.has(card.id)) {
        clearTimeout(timers.get(card.id)!);
        timers.delete(card.id);
      }

      const requeue = () => {
        timers.delete(card.id);
        const updatedCard: WordWithTranslations = {
          ...card,
          stage: nextStage,
          nextReview,
        };

        setBoxes((prev) => {
          const existing = prev[targetBox]?.some((item) => item.id === card.id);
          if (existing) return prev;
          const updatedTarget = [...(prev[targetBox] ?? []), updatedCard];
          return {
            ...prev,
            [targetBox]: updatedTarget,
          };
        });
        setActiveBox((current) => current ?? targetBox);
      };

      if (delay <= 0) {
        requeue();
        return;
      }

      const timer = setTimeout(requeue, delay);
      timers.set(card.id, timer);
    },
    [],
  );

  useEffect(() => {
    return () => {
      clearScheduledTimers();
    };
  }, [clearScheduledTimers]);

  useEffect(() => {
    let cancelled = false;
    clearScheduledTimers();

    if (!courseId) {
      setBoxes(createEmptyBoxes());
      setActiveBox(null);
      return;
    }
    setIsLoading(true);
    void getDueCustomReviewFlashcards(courseId, DEFAULT_FLASHCARDS_BATCH_SIZE)
      .then((cards) => {
        if (cancelled) return;
        const mapped = cards.map(mapReviewCardToWord);
        const nextBoxes = distributeByStage(mapped);
        setBoxes(nextBoxes);
        const firstBox = findFirstActiveBox(nextBoxes);
        setActiveBox(firstBox);
        if (firstBox) {
          queuesRef.current = {
            boxZero: [],
            boxOne: [],
            boxTwo: [],
            boxThree: [],
            boxFour: [],
            boxFive: [],
          };
          syncQueueWithBox(firstBox);
          ensureQueueHasItems(firstBox);
          const first = queuesRef.current[firstBox]?.[0] ?? null;
          setSelectedItem(first ?? null);
        } else {
          setSelectedItem(null);
        }
      })
      .catch((err) => {
        console.error("Failed to load review flashcards", err);
        if (cancelled) return;
        setBoxes(createEmptyBoxes());
        setActiveBox(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clearScheduledTimers, courseId]);

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
      (selectedItem?.imageFront || selectedItem?.imageBack)) ||
    selectedItem?.type === "true_false" ||
    selectedItem?.type === "know_dont_know";
  const effectiveReversed = answerOnly ? false : reversed;

  useEffect(() => {
    if (!correction || !activeBox || !courseId) return;
    if (transitionTimerRef.current) return;

    const expectsAwersInput = !answerOnly && effectiveReversed;
    const expectsRewersInput = answerOnly || !effectiveReversed;
    const awersOk =
      !expectsAwersInput || checkSpelling(correction.input1, correction.awers);
    const rewersOk =
      !expectsRewersInput ||
      checkSpelling(correction.input2 ?? "", correction.rewers);

    if (!(awersOk && rewersOk)) return;
    if (!correction.cardId) return;

    const card =
      boxes[activeBox]?.find((item) => item.id === correction.cardId) ??
      boxes[activeBox]?.[0] ??
      null;
    const currentStage = card?.stage ?? boxToStage(activeBox);
    const baseCard: WordWithTranslations | null = card
      ? { ...card, stage: currentStage }
      : selectedItem
        ? { ...selectedItem, stage: currentStage }
        : null;

    void (async () => {
      try {
        const { stage: demotedStage, nextReview } = await scheduleCustomReview(
          correction.cardId!,
          courseId,
          1,
        );
        if (baseCard) {
          scheduleReturnToBox(baseCard, demotedStage, nextReview);
        }
      } catch (error) {
        console.error("Failed to demote after correction", error);
      }
    })();

    setBoxes((prev) => {
      const current = prev[activeBox] ?? [];
      const remaining = current.filter((item) => item.id !== correction.cardId);
      const nextState: BoxesState = {
        ...prev,
        [activeBox]: remaining,
      };
      if (remaining.length === 0) {
        const nextActive = findFirstActiveBox(nextState);
        if (nextActive !== activeBox) {
          setActiveBox(nextActive);
        }
      }
      return nextState;
    });
    setCorrection(null);
    setResult(null);
    setAnswer("");
    setQueueNext(true);
  }, [
    activeBox,
    boxes,
    correction,
    courseId,
    checkSpelling,
    effectiveReversed,
    scheduleReturnToBox,
    selectedItem,
  ]);

  useEffect(() => {
    setResult(null);
    setAnswer("");
    setCorrection(null);
    setQuestionShownAt(selectedItem ? Date.now() : null);
    setLongThink(false);
  }, [selectedItem?.id]);

  useEffect(() => {
    if (!activeBox) return;
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
  }, [activeBox, boxes, queueNext, selectNextWord, selectedItem]);

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

  const handleConfirm = (
    _selectedTranslation?: string,
    answerOverride?: string,
  ) => {
    if (!selectedItem || !activeBox || !courseId) return;
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
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

    if (!ok) {
      if (isKnowDontKnow) {
        const hasExplanation =
          typeof selectedItem.explanation === "string" &&
          selectedItem.explanation.trim().length > 0;
        const delayMs = hasExplanation ? 3500 : 1500;
        void (async () => {
          try {
            const { stage: demotedStage, nextReview } = await scheduleCustomReview(
              selectedItem.id,
              courseId,
              1,
            );
            const baseCard: WordWithTranslations = {
              ...selectedItem,
              stage: currentStage,
            };
            scheduleReturnToBox(baseCard, demotedStage, nextReview);
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
          setBoxes((prev) => {
            const current = prev[activeBox] ?? [];
            const remaining = current.filter((item) => item.id !== selectedItem.id);
            const nextState: BoxesState = {
              ...prev,
              [activeBox]: remaining,
            };

            if (remaining.length === 0) {
              const nextActive = findFirstActiveBox(nextState);
              if (nextActive !== activeBox) {
                setActiveBox(nextActive);
              }
            }

            return nextState;
          });
          reset();
          transitionTimerRef.current = null;
          setQueueNext(true);
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
        mode: "demote",
      });
      return;
    }

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
    const hasExplanation =
      typeof selectedItem.explanation === "string" &&
      selectedItem.explanation.trim().length > 0;
    const delayMs = isKnowDontKnow
      ? hasExplanation ? 3500 : 1500
      : isPerfect ? 1500 : 3000;
    if (activeBox === "boxFive") {
      setShouldCelebrate(false);
      requestAnimationFrame(() => setShouldCelebrate(true));
    }

    void (async () => {
      try {
        const { stage: nextStage, nextReview } = await advanceCustomReview(
          selectedItem.id,
          courseId,
        );
        const baseCard: WordWithTranslations = {
          ...selectedItem,
          stage: currentStage,
        };
        scheduleReturnToBox(baseCard, nextStage, nextReview);
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
      setBoxes((prev) => {
        const current = prev[activeBox] ?? [];
        const remaining = current.filter((item) => item.id !== selectedItem.id);
        const nextState: BoxesState = {
          ...prev,
          [activeBox]: remaining,
        };

        if (remaining.length === 0) {
          const nextActive = findFirstActiveBox(nextState);
          if (nextActive !== activeBox) {
            setActiveBox(nextActive);
          }
        }

        return nextState;
      });
      reset();
      transitionTimerRef.current = null;
      setQueueNext(true);
      setIsBetweenCards(true);
      setTimeout(() => setIsBetweenCards(false), 300);
    }, delayMs);
  };

  const handleTrueFalseAnswer = useMemo(
    () =>
      makeTrueFalseHandler({
        setAnswer,
        confirm: handleConfirm,
      }),
    [handleConfirm, setAnswer],
  );

  const shouldShowTrueFalseActions =
    (selectedItem?.type === "true_false" ||
      selectedItem?.type === "know_dont_know") &&
    !correction;
  const trueFalseActionsDisabled = result !== null || isLoading;
  const effectiveTrueFalseButtonsVariant =
    selectedItem?.type === "know_dont_know" ? "know_dont_know" : trueFalseButtonsVariant;

  return (
    <FlashcardsGameView
      shouldCelebrate={shouldCelebrate}
      boxes={boxes}
      activeBox={activeBox}
      onSelectBox={handleSelectBox}
      onBoxLongPress={handleBoxLongPress}
      boxesLayout={layout}
      hideBoxZero={true}
      showFloatingAdd={false}
      showTrueFalseActions={shouldShowTrueFalseActions}
      trueFalseActionsDisabled={trueFalseActionsDisabled}
      onTrueFalseAnswer={handleTrueFalseAnswer}
      trueFalseButtonsVariant={effectiveTrueFalseButtonsVariant}
      peekBox={peekBox}
      peekCards={peekCards}
      activeCustomCourseId={courseId}
      activeCourseName={null}
      onClosePeek={closePeek}
    >
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
        onDownload={async () => { }}
        downloadDisabled
        introMode={false}
        onHintUpdate={() => undefined}
        hideActions={
          selectedItem?.type === "true_false" ||
          selectedItem?.type === "know_dont_know"
        }
        showTrueFalseActions={shouldShowTrueFalseActions}
        trueFalseActionsDisabled={trueFalseActionsDisabled}
        onTrueFalseAnswer={handleTrueFalseAnswer}
        hideHints
        isFocused={!isLoading}
      />
    </FlashcardsGameView>
  );
}
