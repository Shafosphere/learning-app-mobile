import { useSettings } from "@/src/contexts/SettingsContext";
import { logCustomLearningEvent, logLearningEvent, logWordBoxMove } from "@/src/db/sqlite/db";
import type { BoxesState, WordWithTranslations } from "@/src/types/boxes";
import { stripDiacritics } from "@/src/utils/diacritics";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { boxOrder } from "./useBoxesPersistenceSnapshot";

type SpellcheckFn = (input: string, expected: string) => boolean;

type CorrectionMode = "demote" | "intro";

type CorrectionState = {
  awers: string;
  rewers: string;
  input1: string;
  input2: string;
  mode: CorrectionMode;
};

export type UseFlashcardsInteractionParams = {
  boxes: BoxesState;
  setBoxes: React.Dispatch<React.SetStateAction<BoxesState>>;
  checkSpelling: SpellcheckFn;
  addUsedWordIds: (ids: number[] | number) => void;
  registerKnownWord: (wordId: number) => void;
  reversedBoxes?: readonly (keyof BoxesState)[];
  onWordPromotedOut?: (word: WordWithTranslations) => void;
  onCorrectAnswer?: (box: keyof BoxesState) => void;
  boxZeroEnabled?: boolean;
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
  boxZeroEnabled = true,
}: UseFlashcardsInteractionParams) {
  const [activeBox, setActiveBox] = useState<keyof BoxesState | null>(null);
  const [selectedItem, setSelectedItem] = useState<WordWithTranslations | null>(null);
  const [queueNext, setQueueNext] = useState(false);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<boolean | null>(null);
  const [correction, setCorrection] = useState<CorrectionState | null>(null);
  const [learned, setLearned] = useState<WordWithTranslations[]>([]);
  const [questionShownAt, setQuestionShownAt] = useState<number | null>(null);
  const lastServedIdRef = useRef<number | null>(null);
  const queuesRef = useRef<Record<keyof BoxesState, WordWithTranslations[]>>({
    boxZero: [],
    boxOne: [],
    boxTwo: [],
    boxThree: [],
    boxFour: [],
    boxFive: [],
  });
  const { activeCourse, selectedLevel, activeCustomCourseId, ignoreDiacriticsInSpellcheck } =
    useSettings();

  const reversed = useMemo(() => {
    if (!activeBox || !selectedItem) return false;
    const shouldFlip =
      activeCustomCourseId == null ? true : selectedItem.flipped;
    // Oficjalne kursy (brak activeCustomCourseId) zawsze się odwracają.
    return shouldFlip ? reversedBoxes.includes(activeBox) : false;
  }, [activeBox, activeCustomCourseId, reversedBoxes, selectedItem]);

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
      const allowedIds = new Set(boxItems.map((item) => item.id));
      const existing = queuesRef.current[box] ?? [];
      const trimmed = existing.filter((item) => allowedIds.has(item.id));
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

  const selectNextWord = useCallback(
    (box: keyof BoxesState) => {
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
      lastServedIdRef.current = next.id;
      setSelectedItem(next);
      setQuestionShownAt(Date.now());
    },
    [boxes, boxZeroEnabled, ensureQueueHasItems, syncQueueWithBox]
  );

  const handleSelectBox = useCallback(
    (box: keyof BoxesState) => {
      if (box === "boxZero" && !boxZeroEnabled) {
        setActiveBox(null);
        setSelectedItem(null);
        return;
      }
      setActiveBox(box);
      selectNextWord(box);
    },
    [boxZeroEnabled, selectNextWord]
  );

  const moveElement = useCallback(
    (id: number, promote = false) => {
      if (!activeBox) return;
      if (activeBox === "boxZero" && !promote) {
        selectNextWord(activeBox);
        return;
      }
      if (activeBox === "boxOne" && promote === false && !boxZeroEnabled) {
        selectNextWord(activeBox);
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
      let movedWord: WordWithTranslations | null = null;

      setBoxes((prev) => {
        const source = prev[from];
        const element = source.find((x) => x.id === id);
        if (!element) return prev;

        const nextState: BoxesState = {
          ...prev,
          [from]: source.filter((x) => x.id !== id),
        };

        if (target) {
          nextState[target] = [element, ...prev[target]];
        } else {
          setLearned((list) => [element, ...list]);
          onWordPromotedOut?.(element);
        }

        addUsedWordIds(element.id);
        movedWord = element;

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
          queuesRef.current[target] = exists ? targetQueue : [...targetQueue, element];
        }

        return nextState;
      });

      if (
        movedWord &&
        activeCourse?.sourceLangId != null &&
        activeCourse?.targetLangId != null &&
        selectedLevel
      ) {
        void logWordBoxMove({
          wordId: movedWord.id,
          sourceLangId: activeCourse.sourceLangId,
          targetLangId: activeCourse.targetLangId,
          level: selectedLevel,
          fromBox: from,
          toBox: target,
        });
      }
    },
    [
      activeBox,
      activeCourse?.sourceLangId,
      activeCourse?.targetLangId,
      addUsedWordIds,
      boxZeroEnabled,
      onWordPromotedOut,
      selectNextWord,
      selectedLevel,
      setBoxes,
    ]
  );

  const checkAnswer = useCallback(() => {
    if (!selectedItem) return false;
    if (activeBox === "boxZero") return false;
    if (reversed) {
      return checkSpelling(answer, selectedItem.text);
    }
    return selectedItem.translations.some((t) => checkSpelling(answer, t));
  }, [activeBox, answer, checkSpelling, reversed, selectedItem]);

  const confirm = useCallback(() => {
    if (activeBox === "boxZero") {
      return;
    }
    if (!selectedItem) return;

    const ok = checkAnswer();
    const duration = questionShownAt != null ? Date.now() - questionShownAt : null;
    // Log learning event for analytics (flashcards)
    if (activeCustomCourseId != null) {
      void logCustomLearningEvent({
        flashcardId: selectedItem.id,
        courseId: activeCustomCourseId,
        box: activeBox ?? null,
        result: ok ? 'ok' : 'wrong',
        durationMs: duration ?? undefined,
      });
    } else if (
      activeCourse?.sourceLangId != null &&
      activeCourse?.targetLangId != null &&
      selectedLevel
    ) {
      void logLearningEvent({
        wordId: selectedItem.id,
        sourceLangId: activeCourse.sourceLangId,
        targetLangId: activeCourse.targetLangId,
        level: selectedLevel,
        box: activeBox ?? null,
        result: ok ? 'ok' : 'wrong',
        durationMs: duration ?? undefined,
      });
    }
    if (ok) {
      if (!reversed && activeBox && selectedItem.translations.length > 1) {
        const matched = selectedItem.translations.find((t) =>
          checkSpelling(answer, t)
        );
        if (matched) {
          const reorderedTranslations = [
            matched,
            ...selectedItem.translations.filter((t) => t !== matched),
          ];
          const updatedWord: WordWithTranslations = {
            ...selectedItem,
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
      setResult(true);
      if (activeBox) {
        onCorrectAnswer?.(activeBox);
      }
      if (activeBox === "boxFive") {
        registerKnownWord(selectedItem.id);
      }
      setTimeout(() => {
        setAnswer("");
        moveElement(selectedItem.id, true);
        setResult(null);
        setQueueNext(true);
      }, 1500);
    } else {
      setResult(false);
      setCorrection({
        awers: selectedItem.text,
        rewers: selectedItem.translations[0] ?? "",
        input1: "",
        input2: "",
        mode: "demote",
      });
    }
  }, [
    activeBox,
    checkAnswer,
    moveElement,
    onCorrectAnswer,
    checkSpelling,
    registerKnownWord,
    activeCourse?.sourceLangId,
    activeCourse?.targetLangId,
    activeCustomCourseId,
    selectedLevel,
    selectedItem,
    questionShownAt,
    reversed,
    setBoxes,
  ]);

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
      const trimmed = value.trim();
      if (!ignoreDiacriticsInSpellcheck) {
        return trimmed;
      }
      return stripDiacritics(trimmed);
    },
    [ignoreDiacriticsInSpellcheck]
  );

  const normalizeExpected = useCallback(
    (value: string) => {
      if (!ignoreDiacriticsInSpellcheck) {
        return value;
      }
      return stripDiacritics(value);
    },
    [ignoreDiacriticsInSpellcheck]
  );

  const matchesCorrectionField = useCallback(
    (input: string, expected: string) =>
      normalizeUserInput(input) === normalizeExpected(expected),
    [normalizeExpected, normalizeUserInput]
  );

  useEffect(() => {
    if (
      correction &&
      matchesCorrectionField(correction.input1, correction.awers) &&
      matchesCorrectionField(correction.input2, correction.rewers)
    ) {
      if (selectedItem) {
        const promote = correction.mode === "intro";
        moveElement(selectedItem.id, promote);
      }
      setResult(null);
      setCorrection(null);
      setQueueNext(true);
    }
  }, [correction, matchesCorrectionField, moveElement, selectedItem]);

  useEffect(() => {
    if (queueNext && activeBox) {
      selectNextWord(activeBox);
      setResult(null);
      setQueueNext(false);
    }
  }, [activeBox, boxes, queueNext, selectNextWord]);

  useEffect(() => {
    if (!activeBox) return;
    const list = boxes[activeBox];
    if (!list || list.length === 0) {
      if (selectedItem != null) {
        selectNextWord(activeBox);
      }
      return;
    }

    const currentId = selectedItem?.id ?? null;
    const itemStillAvailable =
      currentId != null && list.some((item) => item.id === currentId);

    if (!itemStillAvailable) {
      selectNextWord(activeBox);
    }
  }, [activeBox, boxes, selectNextWord, selectedItem]);

  const resetInteractionState = useCallback(() => {
    setActiveBox(null);
    setSelectedItem(null);
    setAnswer("");
    setResult(null);
    setCorrection(null);
    setQueueNext(false);
    setQuestionShownAt(null);
    lastServedIdRef.current = null;
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItem(null);
    setQuestionShownAt(null);
    lastServedIdRef.current = null;
  }, []);
  useEffect(() => {
    console.log("[Flashcards] Active box:", activeBox);
  }, [activeBox]);

  useEffect(() => {
    if (!boxZeroEnabled && activeBox === "boxZero") {
      setActiveBox(null);
      setSelectedItem(null);
      setAnswer("");
      setResult(null);
      setCorrection(null);
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

    const expectedAwers = selectedItem.text;
    const expectedRewers = selectedItem.translations[0] ?? "";

    setCorrection((prev) => {
      if (
        prev &&
        prev.mode === "intro" &&
        prev.awers === expectedAwers &&
        prev.rewers === expectedRewers
      ) {
        return prev;
      }
      return {
        awers: expectedAwers,
        rewers: expectedRewers,
        input1: "",
        input2: "",
        mode: "intro",
      };
    });
  }, [
    activeBox,
    answer,
    boxZeroEnabled,
    correction,
    result,
    selectedItem,
    setAnswer,
    setResult,
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
    resetInteractionState,
    clearSelection,
    isBetweenCards: queueNext,
  };
}
