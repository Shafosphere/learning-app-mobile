import { useSettings } from "@/src/contexts/SettingsContext";
import { logCustomLearningEvent } from "@/src/db/sqlite/db";
import type { BoxesState, WordWithTranslations } from "@/src/types/boxes";
import { stripDiacritics } from "@/src/utils/diacritics";
import { getExplanationState } from "@/src/utils/explanationState";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { boxOrder } from "./useBoxesPersistenceSnapshot";

type SpellcheckFn = (input: string, expected: string) => boolean;

type CorrectionMode = "demote" | "intro";

type CorrectionState = {
  cardId: number;
  awers: string;
  rewers: string;
  input1: string;
  input2: string;
  answerOnly?: boolean;
  mode: CorrectionMode;
  promptText: string;
  promptImageUri: string | null;
  reversed: boolean;
  word: WordWithTranslations;
};

type RegisterKnownWordResult = {
  wasNewMastered: boolean;
  nextKnownWordsCount: number;
};

export type CorrectAnswerMeta = {
  word: WordWithTranslations;
  wasNewMastered: boolean;
  logLearningEventPromise: Promise<void>;
  isPromotion: boolean;
  isTerminalSuccess: boolean;
  fromBox: keyof BoxesState;
  durationMs: number;
};

export type WrongAnswerMeta = {
  word: WordWithTranslations;
  fromBox: keyof BoxesState;
  durationMs: number;
};

type UseFlashcardsInteractionParams = {
  boxes: BoxesState;
  setBoxes: React.Dispatch<React.SetStateAction<BoxesState>>;
  checkSpelling: SpellcheckFn;
  addUsedWordIds: (ids: number[] | number) => void;
  registerKnownWord: (wordId: number) => RegisterKnownWordResult;
  reversedBoxes?: readonly (keyof BoxesState)[];
  onWordPromotedOut?: (word: WordWithTranslations) => void;
  onCorrectAnswer?: (box: keyof BoxesState, meta: CorrectAnswerMeta) => void;
  onWrongAnswer?: (box: keyof BoxesState, meta: WrongAnswerMeta) => void;
  boxZeroEnabled?: boolean;
  skipDemotionCorrection?: boolean;
};

export function useFlashcardsInteraction({
  boxes,
  setBoxes,
  checkSpelling,
  addUsedWordIds,
  registerKnownWord,
  reversedBoxes = ["boxTwo", "boxFour"],
  onWordPromotedOut,
  onCorrectAnswer,
  onWrongAnswer,
  boxZeroEnabled = true,
  skipDemotionCorrection = false,
}: UseFlashcardsInteractionParams) {
  const [activeBox, setActiveBox] = useState<keyof BoxesState | null>(null);
  const [selectedItem, setSelectedItem] = useState<WordWithTranslations | null>(null);
  const [queueNext, setQueueNext] = useState(false);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<boolean | null>(null);
  const [correction, setCorrection] = useState<CorrectionState | null>(null);
  const [learned, setLearned] = useState<WordWithTranslations[]>([]);
  const [questionShownAt, setQuestionShownAt] = useState<number | null>(null);
  const [pendingExplanationMove, setPendingExplanationMove] = useState<{
    cardId: number;
    promote: boolean;
  } | null>(null);
  const lastServedIdRef = useRef<number | null>(null);
  const queuesRef = useRef<Record<keyof BoxesState, WordWithTranslations[]>>({
    boxZero: [],
    boxOne: [],
    boxTwo: [],
    boxThree: [],
    boxFour: [],
    boxFive: [],
  });
  const {
    activeCustomCourseId,
    cancelTodayLearningReminderSchedule,
    explanationOnlyOnWrong,
    ignoreDiacriticsInSpellcheck,
    learningRemindersEnabled,
    refreshLearningReminderSchedule,
    showExplanationEnabled,
  } = useSettings();
  const reminderRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const demotionCorrectionLockRef = useRef<number | null>(null);

  const clearTransitionTimers = useCallback(() => {
    transitionTimersRef.current.forEach((timer) => {
      clearTimeout(timer);
    });
    transitionTimersRef.current.clear();
  }, []);

  const scheduleTransition = useCallback(
    (callback: () => void, delay: number) => {
      const timer = setTimeout(() => {
        transitionTimersRef.current.delete(timer);
        callback();
      }, delay);
      transitionTimersRef.current.add(timer);
      return timer;
    },
    []
  );

  const isAnswerOnlyCard = useCallback((card: WordWithTranslations | null) => {
    if (!card) return false;
    if (card.type === "true_false" || card.type === "know_dont_know") return true;
    if (card.answerOnly) return true;
    const hasTextPrompt = Boolean(card.text?.trim());
    const hasImagePrompt = Boolean(card.imageFront || card.imageBack);
    return !hasTextPrompt && hasImagePrompt;
  }, []);

  const reversed = useMemo(() => {
    if (!activeBox || !selectedItem) return false;
    if (isAnswerOnlyCard(selectedItem)) return false;
    const shouldFlip =
      activeCustomCourseId == null ? true : selectedItem.flipped;
    // Oficjalne kursy (brak activeCustomCourseId) zawsze się odwracają.
    return shouldFlip ? reversedBoxes.includes(activeBox) : false;
  }, [activeBox, activeCustomCourseId, reversedBoxes, selectedItem, isAnswerOnlyCard]);

  const shuffleList = useCallback((items: WordWithTranslations[]) => {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, []);

  const syncQueueWithBox = useCallback(
    (box: keyof BoxesState) => {
      const boxItems = boxes[box] ?? [];
      if (boxItems.length === 0) {
        queuesRef.current[box] = [];
        return;
      }
      const latestById = new Map(boxItems.map((item) => [item.id, item] as const));
      const allowedIds = new Set(boxItems.map((item) => item.id));
      const existing = queuesRef.current[box] ?? [];
      const trimmed = existing
        .filter((item) => allowedIds.has(item.id))
        .map((item) => latestById.get(item.id) ?? item);
      const queuedIds = new Set(trimmed.map((item) => item.id));
      const newItems = boxItems.filter((item) => !queuedIds.has(item.id));
      queuesRef.current[box] = [...trimmed, ...newItems];
    },
    [boxes]
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
        queuesRef.current[box] = shuffleList(list);
      }
    },
    [boxes, shuffleList]
  );

  const getQueueForBox = useCallback(
    (box: keyof BoxesState) => {
      syncQueueWithBox(box);
      ensureQueueHasItems(box);
      return queuesRef.current[box] ?? [];
    },
    [ensureQueueHasItems, syncQueueWithBox]
  );

  const lastSelectionRef = useRef<{ ts: number; box: keyof BoxesState | null }>({
    ts: 0,
    box: null,
  });
  const selectNextWord = useCallback(
    (box: keyof BoxesState, options?: { force?: boolean }) => {
      const now = Date.now();
      const last = lastSelectionRef.current;
      const force = options?.force ?? false;
      if (
        !force &&
        now - last.ts < 80 &&
        last.box === box &&
        selectedItem != null
      ) {
        return;
      }
      lastSelectionRef.current = { ts: now, box };
      if (box === "boxZero" && !boxZeroEnabled) {
        setSelectedItem(null);
        setQuestionShownAt(null);
        lastServedIdRef.current = null;
        return;
      }
      const list = boxes[box];
      if (!list || list.length === 0) {
        setSelectedItem(null);
        setQuestionShownAt(null);
        lastServedIdRef.current = null;
        return;
      }

      syncQueueWithBox(box);
      ensureQueueHasItems(box);
      const queue = queuesRef.current[box] ?? [];
      const [next, ...rest] = queue;
      if (!next) {
        setSelectedItem(null);
        setQuestionShownAt(null);
        lastServedIdRef.current = null;
        return;
      }
      queuesRef.current[box] = rest;
      if (__DEV__) {
        const upcoming = rest[0] ?? null;
        const currentLabel = `id=${next.id} type=${next.type ?? "text"} text="${(next.text ?? "").slice(0, 60)}"`;
        const upcomingLabel = upcoming
          ? `id=${upcoming.id} type=${upcoming.type ?? "text"} text="${(upcoming.text ?? "").slice(0, 60)}"`
          : "none";
        console.log(
          `[Flashcards] queue:${box} current:${currentLabel} upcoming:${upcomingLabel}`
        );
      }
      lastServedIdRef.current = next.id;
      setSelectedItem(next);
      setQuestionShownAt(Date.now());
    },
    [boxes, boxZeroEnabled, ensureQueueHasItems, selectedItem, syncQueueWithBox]
  );

  const handleSelectBox = useCallback(
    (box: keyof BoxesState) => {
      if (demotionCorrectionLockRef.current != null) {
        return;
      }
      if (box === "boxZero" && !boxZeroEnabled) {
        setActiveBox(null);
        setSelectedItem(null);
        return;
      }
      if (__DEV__) {
        const queued = getQueueForBox(box);
        const next = queued[0] ?? null;
        const cardLabel = next
          ? `card:${next.id} "${next.text ?? ""}"`
          : "card:none";
        console.log(`[Flashcards] activate:${box} ${cardLabel}`);
      }
      setActiveBox(box);
      selectNextWord(box);
    },
    [boxZeroEnabled, getQueueForBox, selectNextWord]
  );

  const moveElement = useCallback(
    (id: number, promote = false) => {
      if (!activeBox) return;
      if (activeBox === "boxZero" && !promote) {
        selectNextWord(activeBox, { force: true });
        return;
      }
      if (activeBox === "boxOne" && promote === false && !boxZeroEnabled) {
        selectNextWord(activeBox, { force: true });
        return;
      }

      const from = activeBox;
      const fromIdx = boxOrder.indexOf(from);
      const target: keyof BoxesState | null = promote
        ? fromIdx >= boxOrder.length - 1
          ? null
          : boxOrder[fromIdx + 1]
        : boxZeroEnabled
          ? "boxZero"
          : "boxOne";

      setBoxes((prev) => {
        const source = prev[from];
        const element = source.find((x) => x.id === id);
        if (!element) return prev;

        const nextState: BoxesState = {
          ...prev,
          [from]: source.filter((x) => x.id !== id),
        };

        if (target) {
          nextState[target] = [...prev[target], element];
        } else {
          setLearned((list) => [element, ...list]);
          onWordPromotedOut?.(element);
        }

        addUsedWordIds(element.id);

        // Keep queues in sync with the move: remove from source queue, append to target queue.
        const removeFromQueue = (queueBox: keyof BoxesState) => {
          queuesRef.current[queueBox] = (queuesRef.current[queueBox] ?? []).filter(
            (item) => item.id !== id
          );
        };
        removeFromQueue(from);
        if (target) {
          const targetQueue = queuesRef.current[target] ?? [];
          const exists = targetQueue.some((item) => item.id === element.id);
          if (exists) {
            queuesRef.current[target] = targetQueue;
          } else if (targetQueue.length === 0 && prev[target].length > 0) {
            // If the target queue was exhausted, restore the box's current order first
            // and only then append the newly promoted card at the tail.
            queuesRef.current[target] = [...prev[target], element];
          } else {
            queuesRef.current[target] = [...targetQueue, element];
          }
        }

        return nextState;
      });

      if (promote && learningRemindersEnabled) {
        void cancelTodayLearningReminderSchedule();
      }

    },
    [
      activeBox,
      addUsedWordIds,
      boxZeroEnabled,
      cancelTodayLearningReminderSchedule,
      learningRemindersEnabled,
      onWordPromotedOut,
      selectNextWord,
      setBoxes,
    ]
  );

  const moveTranslationToFront = useCallback(
    (list: string[], preferred?: string) => {
      if (!preferred) return list;
      const index = list.findIndex((value) => value === preferred);
      if (index <= 0) return list;
      const reordered = [preferred, ...list.filter((_, idx) => idx !== index)];
      return reordered;
    },
    []
  );

  const confirm = useCallback(
    (selectedTranslation?: string, answerOverride?: string) => {
      const confirmStartedAt = Date.now();
      if (activeBox === "boxZero") {
        return;
      }
      if (!selectedItem) return;
      const answerToUse = (answerOverride ?? answer).replace(/ +$/, "");
      const isKnowDontKnow = selectedItem.type === "know_dont_know";

      const reorderedTranslations = isKnowDontKnow
        ? selectedItem.translations
        : moveTranslationToFront(selectedItem.translations, selectedTranslation);
      const wordForCheck =
        reorderedTranslations === selectedItem.translations
          ? selectedItem
          : { ...selectedItem, translations: reorderedTranslations };

      if (wordForCheck !== selectedItem && activeBox) {
        setSelectedItem(wordForCheck);
        setBoxes((prev) => {
          const list = prev[activeBox];
          if (!list) return prev;
          const nextList = list.map((item) =>
            item.id === wordForCheck.id ? wordForCheck : item
          );
          return {
            ...prev,
            [activeBox]: nextList,
          };
        });
      }

      const ok = isKnowDontKnow
        ? answerToUse.trim().toLowerCase() === "true"
        : reversed
          ? checkSpelling(answerToUse, wordForCheck.text)
          : wordForCheck.translations.some((t) => checkSpelling(answerToUse, t));
      if (__DEV__) {
        console.log("[Flashcards][confirm] evaluated", {
          cardId: wordForCheck.id,
          type: wordForCheck.type ?? "text",
          activeBox,
          reversed,
          answerLength: answerToUse.length,
          translationsCount: wordForCheck.translations.length,
          ok,
          evalMs: Date.now() - confirmStartedAt,
        });
      }
      const duration = questionShownAt != null ? Date.now() - questionShownAt : null;
      const logLearningEventPromise = logCustomLearningEvent({
        flashcardId: wordForCheck.id,
        courseId: activeCustomCourseId ?? null,
        box: activeBox ?? null,
        result: ok ? "ok" : "wrong",
        durationMs: duration ?? undefined,
      }).catch((error) => {
        console.warn("[Flashcards] Failed to log learning event", error);
      });
      if (learningRemindersEnabled) {
        if (reminderRefreshTimerRef.current != null) {
          clearTimeout(reminderRefreshTimerRef.current);
        }
        reminderRefreshTimerRef.current = setTimeout(() => {
          void refreshLearningReminderSchedule();
        }, 90 * 1000);
      }
      if (ok) {
        if (!reversed && activeBox && wordForCheck.translations.length > 1) {
          const matched = wordForCheck.translations.find((t) =>
            checkSpelling(answerToUse, t)
          );
          if (matched) {
            const matchedIndex = wordForCheck.translations.findIndex(
              (t) => t === matched
            );
            if (matchedIndex > 0) {
              const reorderedTranslations = [
                matched,
                ...wordForCheck.translations.filter((_, idx) => idx !== matchedIndex),
              ];
              const updatedWord: WordWithTranslations = {
                ...wordForCheck,
                translations: reorderedTranslations,
              };
              setSelectedItem(updatedWord);
              setBoxes((prev) => {
                const list = prev[activeBox];
                if (!list) return prev;
                const nextList = list.map((item) =>
                  item.id === updatedWord.id ? updatedWord : item
                );
                return {
                  ...prev,
                  [activeBox]: nextList,
                };
              });
            }
          }
        }
        setResult(true);
        const registerKnownWordResult =
          activeBox === "boxFive"
            ? registerKnownWord(wordForCheck.id)
            : {
                wasNewMastered: false,
                nextKnownWordsCount: 0,
              };
        if (activeBox) {
          onCorrectAnswer?.(activeBox, {
            word: wordForCheck,
            wasNewMastered: registerKnownWordResult.wasNewMastered,
            logLearningEventPromise,
            isPromotion: activeBox !== "boxFive",
            isTerminalSuccess: activeBox === "boxFive",
            fromBox: activeBox,
            durationMs: duration ?? 0,
          });
        }
        const normalize = (s: string) => {
          let v = s.trim().toLowerCase();
          if (ignoreDiacriticsInSpellcheck) {
            v = stripDiacritics(v);
          }
          return v;
        };

        const userAnswer = normalize(answerToUse);
        let isPerfect = false;

        if (reversed) {
          isPerfect = userAnswer === normalize(wordForCheck.text);
        } else {
          isPerfect = wordForCheck.translations.some(
            (t) => userAnswer === normalize(t)
          );
        }

        const delay = isKnowDontKnow ? 1500 : isPerfect ? 1500 : 3000;

        const { isExplanationPending } = getExplanationState({
          selectedItem: wordForCheck,
          result: true,
          showExplanationEnabled,
          explanationOnlyOnWrong,
        });
        if (__DEV__) {
          console.log("[Flashcards][confirm] success-path", {
            cardId: wordForCheck.id,
            resultSetMs: Date.now() - confirmStartedAt,
            isExplanationPending,
          });
        }
        if (isExplanationPending) {
          setPendingExplanationMove({
            cardId: wordForCheck.id,
            promote: true,
          });
          return;
        }
        scheduleTransition(() => {
          setAnswer("");
          moveElement(wordForCheck.id, true);
          setQueueNext(true);
        }, delay);
      } else {
        setResult(false);
        if (activeBox) {
          onWrongAnswer?.(activeBox, {
            word: wordForCheck,
            fromBox: activeBox,
            durationMs: duration ?? 0,
          });
        }
        const { hasExplanation, isExplanationPending } = getExplanationState({
          selectedItem: wordForCheck,
          result: false,
          showExplanationEnabled,
          explanationOnlyOnWrong,
        });
        if (__DEV__) {
          console.log("[Flashcards][confirm] failure-path", {
            cardId: wordForCheck.id,
            resultSetMs: Date.now() - confirmStartedAt,
            hasExplanation,
            isExplanationPending,
            type: wordForCheck.type ?? "text",
          });
        }
        if (isKnowDontKnow) {
          if (isExplanationPending) {
            setPendingExplanationMove({
              cardId: wordForCheck.id,
              promote: false,
            });
            return;
          }
          const delay = 1500;
          scheduleTransition(() => {
            setAnswer("");
            moveElement(wordForCheck.id, false);
            setQueueNext(true);
          }, delay);
          return;
        }
        if (wordForCheck.type === "true_false") {
          if (isExplanationPending) {
            setPendingExplanationMove({
              cardId: wordForCheck.id,
              promote: false,
            });
            return;
          }
          const delay = 1500;
          scheduleTransition(() => {
            setAnswer("");
            moveElement(wordForCheck.id, false);
            setQueueNext(true);
          }, delay);
          return;
        }
        if (skipDemotionCorrection) {
          if (isExplanationPending) {
            setPendingExplanationMove({
              cardId: wordForCheck.id,
              promote: false,
            });
            return;
          }
          const delay = hasExplanation ? 4000 : 1500;
          scheduleTransition(() => {
            setAnswer("");
            moveElement(wordForCheck.id, false);
            setQueueNext(true);
          }, delay);
          return;
        }
        const answerOnly = isAnswerOnlyCard(wordForCheck);
        demotionCorrectionLockRef.current = wordForCheck.id;
        setCorrection({
          cardId: wordForCheck.id,
          awers: wordForCheck.text,
          rewers: wordForCheck.translations[0] ?? "",
          input1: "",
          input2: "",
          answerOnly,
          mode: "demote",
          promptText: reversed
            ? wordForCheck.translations[0] ?? ""
            : wordForCheck.text,
          promptImageUri: reversed
            ? wordForCheck.imageBack ?? null
            : wordForCheck.imageFront ?? null,
          reversed,
          word: wordForCheck,
        });
      }
    },
    [
      activeBox,
      activeCustomCourseId,
      answer,
      checkSpelling,
      skipDemotionCorrection,
      ignoreDiacriticsInSpellcheck,
      moveElement,
      onCorrectAnswer,
      onWrongAnswer,
      questionShownAt,
      registerKnownWord,
      learningRemindersEnabled,
      refreshLearningReminderSchedule,
      reversed,
      scheduleTransition,
      selectedItem,
      setBoxes,
      moveTranslationToFront,
      isAnswerOnlyCard,
      setPendingExplanationMove,
      explanationOnlyOnWrong,
      showExplanationEnabled,
    ]
  );

  useEffect(() => {
    return () => {
      if (reminderRefreshTimerRef.current != null) {
        clearTimeout(reminderRefreshTimerRef.current);
      }
      clearTransitionTimers();
    };
  }, [clearTransitionTimers]);

  const acknowledgeExplanation = useCallback(() => {
    if (!selectedItem) return;
    if (
      pendingExplanationMove &&
      pendingExplanationMove.cardId === selectedItem.id &&
      result !== null
    ) {
      setAnswer("");
      moveElement(selectedItem.id, pendingExplanationMove.promote);
      setPendingExplanationMove(null);
      setQueueNext(true);
      return;
    }
    if (selectedItem.type === "true_false") {
      if (result !== false) return;
      setAnswer("");
      moveElement(selectedItem.id, false);
      setPendingExplanationMove(null);
      setQueueNext(true);
      return;
    }
    if (selectedItem.type === "know_dont_know") {
      if (result == null) return;
      setAnswer("");
      moveElement(selectedItem.id, result);
      setPendingExplanationMove(null);
      setQueueNext(true);
    }
  }, [moveElement, pendingExplanationMove, result, selectedItem]);

  const wrongInputChange = useCallback((which: 1 | 2, value: string) => {
    setCorrection((c) =>
      c ? { ...c, [which === 1 ? "input1" : "input2"]: value } : c
    );
  }, []);

  const setCorrectionRewers = useCallback((value: string) => {
    setCorrection((current) =>
      current ? { ...current, rewers: value } : current
    );
  }, []);

  const normalizeUserInput = useCallback(
    (value: string) => {
      const normalized = value.trim().toLowerCase();
      if (!ignoreDiacriticsInSpellcheck) {
        return normalized;
      }
      return stripDiacritics(normalized);
    },
    [ignoreDiacriticsInSpellcheck]
  );

  const normalizeExpected = useCallback(
    (value: string) => {
      const normalized = value.toLowerCase();
      if (!ignoreDiacriticsInSpellcheck) {
        return normalized;
      }
      return stripDiacritics(normalized);
    },
    [ignoreDiacriticsInSpellcheck]
  );

  const matchesCorrectionField = useCallback(
    (input: string, expected: string) =>
      normalizeUserInput(input) === normalizeExpected(expected),
    [normalizeExpected, normalizeUserInput]
  );

  useEffect(() => {
    demotionCorrectionLockRef.current =
      correction?.mode === "demote" ? correction.cardId : null;
  }, [correction]);

  useEffect(() => {
    if (!correction) {
      return;
    }
    const expectsAwersInput = !correction.answerOnly && reversed;
    const expectsRewersInput = correction.answerOnly || !reversed;
    const awersOk =
      !expectsAwersInput ||
      matchesCorrectionField(correction.input1, correction.awers);
    const rewersOk =
      !expectsRewersInput ||
      matchesCorrectionField(correction.input2, correction.rewers);

    if (awersOk && rewersOk) {
      const correctionWord = correction.word;
      if (correctionWord) {
        const hasExplanation =
          typeof correctionWord.explanation === "string" &&
          correctionWord.explanation.trim().length > 0;
        if (correction.mode === "demote" && hasExplanation) {
          setPendingExplanationMove({
            cardId: correction.cardId,
            promote: false,
          });
          setAnswer("");
          setCorrection(null);
          return;
        }
        const promote = correction.mode === "intro";
        moveElement(correction.cardId, promote);
      }
      // Wyczyść poprzednią odpowiedź zanim pokażemy kolejną fiszkę.
      // Inaczej przez jedną klatkę nowa karta może odziedziczyć stary tekst
      // (widoczny "B" na screenach), co wygląda jak mignięcie błędnej karty.
      setAnswer("");
      setCorrection(null);
      setQueueNext(true);
    }
  }, [
    correction,
    isAnswerOnlyCard,
    matchesCorrectionField,
    moveElement,
    reversed,
    selectedItem,
  ]);

  useEffect(() => {
    if (queueNext && activeBox) {
      // Upewnij się, że pole odpowiedzi jest puste zanim załadujemy nową kartę.
      setAnswer("");
      const currentId = selectedItem?.id ?? null;
      const currentList = boxes[activeBox] ?? [];
      const currentStillBelongsToActiveBox =
        currentId != null && currentList.some((item) => item.id === currentId);
      if (!currentStillBelongsToActiveBox) {
        selectNextWord(activeBox, { force: true });
      }
      setResult(null);
      setQueueNext(false);
    }
  }, [activeBox, boxes, queueNext, selectNextWord, selectedItem]);

  useEffect(() => {
    if (!activeBox) return;
    // Avoid double-selecting a new card when a transition is already queued
    if (queueNext) return;
    if (demotionCorrectionLockRef.current != null) return;

    const list = boxes[activeBox];
    if (!list || list.length === 0) {
      if (selectedItem != null) {
        selectNextWord(activeBox, { force: true });
      }
      return;
    }

    const currentId = selectedItem?.id ?? null;
    const itemStillAvailable =
      currentId != null && list.some((item) => item.id === currentId);

    if (!itemStillAvailable) {
      selectNextWord(activeBox, { force: true });
    }
  }, [activeBox, boxes, queueNext, selectNextWord, selectedItem]);

  const resetInteractionState = useCallback(() => {
    clearTransitionTimers();
    demotionCorrectionLockRef.current = null;
    setActiveBox(null);
    setSelectedItem(null);
    setAnswer("");
    setResult(null);
    setCorrection(null);
    setPendingExplanationMove(null);
    setQueueNext(false);
    setQuestionShownAt(null);
    lastServedIdRef.current = null;
  }, [clearTransitionTimers]);

  const clearSelection = useCallback(() => {
    if (demotionCorrectionLockRef.current != null) {
      return;
    }
    setSelectedItem(null);
    setQuestionShownAt(null);
    lastServedIdRef.current = null;
  }, []);

  const updateSelectedItem = useCallback(
    (updater: (item: WordWithTranslations) => WordWithTranslations) => {
      setSelectedItem((prev) => {
        if (!prev) return prev;
        const next = updater(prev);
        if (
          demotionCorrectionLockRef.current != null &&
          next.id !== demotionCorrectionLockRef.current
        ) {
          return prev;
        }
        return next;
      });
    },
    []
  );
  useEffect(() => {
    if (!boxZeroEnabled && activeBox === "boxZero") {
      setActiveBox(null);
      setSelectedItem(null);
      setAnswer("");
      setResult(null);
      setCorrection(null);
      setPendingExplanationMove(null);
    }
  }, [activeBox, boxZeroEnabled]);

  useEffect(() => {
    if (!boxZeroEnabled) {
      if (correction?.mode === "intro") {
        setCorrection(null);
      }
      return;
    }

    if (activeBox !== "boxZero") {
      if (correction?.mode === "intro") {
        setCorrection(null);
      }
      return;
    }

    if (!selectedItem) {
      if (correction?.mode === "intro") {
        setCorrection(null);
      }
      return;
    }

    if (answer !== "") {
      setAnswer("");
    }

    if (result !== null) {
      setResult(null);
    }

    const firstTranslation = selectedItem.translations[0] ?? "";
    const answerOnly = isAnswerOnlyCard(selectedItem);

    setCorrection((prev) => {
      const isSameIntroCard =
        prev?.mode === "intro" && prev.cardId === selectedItem.id;
      const preferredRewers = isSameIntroCard ? prev.rewers : firstTranslation;
      const nextRewers = selectedItem.translations.includes(preferredRewers)
        ? preferredRewers
        : firstTranslation;

      return {
        cardId: selectedItem.id,
        awers: selectedItem.text,
        rewers: nextRewers,
        input1: isSameIntroCard ? prev.input1 : "",
        input2: isSameIntroCard ? prev.input2 : "",
        answerOnly,
        mode: "intro",
        promptText: selectedItem.text,
        promptImageUri: selectedItem.imageFront ?? null,
        reversed: false,
        word: selectedItem,
      };
    });
  }, [
    activeBox,
    answer,
    boxZeroEnabled,
    correction?.mode,
    result,
    selectedItem,
    setAnswer,
    setResult,
    isAnswerOnlyCard,
  ]);

  return {
    activeBox,
    handleSelectBox,
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
    moveElement,
    acknowledgeExplanation,
    resetInteractionState,
    clearSelection,
    updateSelectedItem,
    isBetweenCards: queueNext,
    getQueueForBox,
  };
}
