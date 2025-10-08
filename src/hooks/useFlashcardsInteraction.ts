import { useCallback, useEffect, useMemo, useState } from "react";
import { boxOrder } from "./useBoxesPersistenceSnapshot";
import type { BoxesState, WordWithTranslations } from "@/src/types/boxes";

type SpellcheckFn = (input: string, expected: string) => boolean;

type CorrectionState = {
  awers: string;
  rewers: string;
  input1: string;
  input2: string;
};

export type UseFlashcardsInteractionParams = {
  boxes: BoxesState;
  setBoxes: React.Dispatch<React.SetStateAction<BoxesState>>;
  checkSpelling: SpellcheckFn;
  addUsedWordIds: (ids: number[] | number) => void;
  registerLearningEvent: () => void;
  reversedBoxes?: ReadonlyArray<keyof BoxesState>;
  onWordPromotedOut?: (word: WordWithTranslations) => void;
  onCorrectAnswer?: (box: keyof BoxesState) => void;
};

export function useFlashcardsInteraction({
  boxes,
  setBoxes,
  checkSpelling,
  addUsedWordIds,
  registerLearningEvent,
  reversedBoxes = ["boxTwo", "boxFour"],
  onWordPromotedOut,
  onCorrectAnswer,
}: UseFlashcardsInteractionParams) {
  const [activeBox, setActiveBox] = useState<keyof BoxesState | null>(null);
  const [selectedItem, setSelectedItem] = useState<WordWithTranslations | null>(null);
  const [queueNext, setQueueNext] = useState(false);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<boolean | null>(null);
  const [correction, setCorrection] = useState<CorrectionState | null>(null);
  const [learned, setLearned] = useState<WordWithTranslations[]>([]);

  const reversed = useMemo(() => {
    if (!activeBox) return false;
    return reversedBoxes.includes(activeBox);
  }, [activeBox, reversedBoxes]);

  const selectRandomWord = useCallback(
    (box: keyof BoxesState) => {
      const list = boxes[box];
      if (!list || list.length === 0) {
        setSelectedItem(null);
        return;
      }
      if (list.length === 1) {
        setSelectedItem(list[0]);
        return;
      }
      let idx = Math.floor(Math.random() * list.length);
      if (selectedItem && list[idx].id === selectedItem.id) {
        idx = (idx + 1) % list.length;
      }
      setSelectedItem(list[idx]);
    },
    [boxes, selectedItem]
  );

  const handleSelectBox = useCallback(
    (box: keyof BoxesState) => {
      setActiveBox(box);
      selectRandomWord(box);
    },
    [selectRandomWord]
  );

  const moveElement = useCallback(
    (id: number, promote = false) => {
      if (!activeBox) return;
      if (activeBox === "boxOne" && promote === false) {
        selectRandomWord(activeBox);
        return;
      }

      setBoxes((prev) => {
        const from = activeBox;
        const source = prev[from];
        const element = source.find((x) => x.id === id);
        if (!element) return prev;

        const order = boxOrder;
        const fromIdx = order.indexOf(from);
        let target: keyof BoxesState | null;
        if (promote) {
          const isLast = fromIdx >= order.length - 1;
          target = isLast ? null : order[fromIdx + 1];
        } else {
          target = "boxOne";
        }

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
        return nextState;
      });
    },
    [activeBox, addUsedWordIds, onWordPromotedOut, selectRandomWord, setBoxes]
  );

  const checkAnswer = useCallback(() => {
    if (!selectedItem) return false;
    if (reversed) {
      return checkSpelling(answer, selectedItem.text);
    }
    return selectedItem.translations.some((t) => checkSpelling(answer, t));
  }, [answer, checkSpelling, reversed, selectedItem]);

  const confirm = useCallback(() => {
    if (!selectedItem) return;

    const ok = checkAnswer();
    if (ok) {
      setResult(true);
      if (activeBox) {
        onCorrectAnswer?.(activeBox);
      }
      if (activeBox === "boxFive") {
        registerLearningEvent();
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
      });
    }
  }, [
    activeBox,
    checkAnswer,
    moveElement,
    onCorrectAnswer,
    registerLearningEvent,
    selectedItem,
  ]);

  const wrongInputChange = useCallback((which: 1 | 2, value: string) => {
    setCorrection((c) =>
      c ? { ...c, [which === 1 ? "input1" : "input2"]: value } : c
    );
  }, []);

  useEffect(() => {
    if (
      correction &&
      correction.input1.trim() === correction.awers &&
      correction.input2.trim() === correction.rewers
    ) {
      if (selectedItem) {
        moveElement(selectedItem.id, false);
      }
      setResult(null);
      setCorrection(null);
      setQueueNext(true);
    }
  }, [correction, moveElement, selectedItem]);

  useEffect(() => {
    if (queueNext && activeBox) {
      selectRandomWord(activeBox);
      setResult(null);
      setQueueNext(false);
    }
  }, [activeBox, boxes, queueNext, selectRandomWord]);

  const resetInteractionState = useCallback(() => {
    setActiveBox(null);
    setSelectedItem(null);
    setAnswer("");
    setResult(null);
    setCorrection(null);
    setQueueNext(false);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItem(null);
  }, []);

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
    learned,
    setLearned,
    moveElement,
    resetInteractionState,
    clearSelection,
  };
}
