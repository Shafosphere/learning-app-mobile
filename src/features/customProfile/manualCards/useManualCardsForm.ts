import { useCallback, useMemo, useState } from "react";

export type ManualCard = {
  id: string;
  front: string;
  answers: string[];
};

export interface UseManualCardsFormOptions {
  initialCards?: ManualCard[];
  enableHistory?: boolean;
  historyLimit?: number;
}

export interface ReplaceManualCardsOptions {
  resetHistory?: boolean;
}

const DEFAULT_HISTORY_LIMIT = 50;

export const createEmptyManualCard = (id?: string): ManualCard => ({
  id: id ?? `card-${Date.now()}`,
  front: "",
  answers: [""],
});

const cloneManualCards = (cards: ManualCard[]): ManualCard[] =>
  cards.map((card) => ({ ...card, answers: [...card.answers] }));

export const ensureCardHasAnswer = (card: ManualCard): ManualCard =>
  card.answers.length === 0 ? { ...card, answers: [""] } : card;

export const ensureCardsNormalized = (cards: ManualCard[]): ManualCard[] =>
  (cards.length > 0 ? cards : [createEmptyManualCard()]).map(ensureCardHasAnswer);

export const normalizeAnswers = (answers: string[]): string[] => {
  const deduped: string[] = [];
  for (const answer of answers) {
    const trimmed = answer.trim();
    if (!trimmed) {
      continue;
    }
    if (!deduped.includes(trimmed)) {
      deduped.push(trimmed);
    }
  }
  return deduped;
};

const areManualCardsEqual = (a: ManualCard[], b: ManualCard[]) => {
  if (a.length !== b.length) {
    return false;
  }
  for (let index = 0; index < a.length; index += 1) {
    const cardA = a[index];
    const cardB = b[index];
    if (cardA.id !== cardB.id || cardA.front !== cardB.front) {
      return false;
    }
    if (cardA.answers.length !== cardB.answers.length) {
      return false;
    }
    for (let answerIndex = 0; answerIndex < cardA.answers.length; answerIndex += 1) {
      if (cardA.answers[answerIndex] !== cardB.answers[answerIndex]) {
        return false;
      }
    }
  }
  return true;
};

export const useManualCardsForm = (
  options: UseManualCardsFormOptions = {}
) => {
  const { initialCards, enableHistory = false, historyLimit = DEFAULT_HISTORY_LIMIT } = options;

  const normalizedInitial = useMemo(
    () => ensureCardsNormalized(initialCards ?? [createEmptyManualCard("card-0")]),
    [initialCards]
  );

  const [manualCards, setManualCards] = useState<ManualCard[]>(() =>
    cloneManualCards(normalizedInitial)
  );
  const [history, setHistory] = useState<ManualCard[][]>([]);

  const applyManualCardsChange = useCallback(
    (updater: (cards: ManualCard[]) => ManualCard[]) => {
      setManualCards((current) => {
        const workingCopy = cloneManualCards(current);
        const updated = ensureCardsNormalized(updater(workingCopy));

        if (enableHistory && !areManualCardsEqual(current, updated)) {
          setHistory((prev) => {
            const nextHistory = [...prev, cloneManualCards(current)];
            if (nextHistory.length > historyLimit) {
              nextHistory.shift();
            }
            return nextHistory;
          });
        }

        return updated;
      });
    },
    [enableHistory, historyLimit]
  );

  const replaceManualCards = useCallback(
    (nextCards: ManualCard[], replaceOptions: ReplaceManualCardsOptions = {}) => {
      const normalized = ensureCardsNormalized(nextCards);
      setManualCards(cloneManualCards(normalized));
      if (enableHistory && replaceOptions.resetHistory !== false) {
        setHistory([]);
      }
    },
    [enableHistory]
  );

  const handleManualCardFrontChange = useCallback(
    (cardId: string, value: string) => {
      applyManualCardsChange((cards) =>
        cards.map((card) =>
          card.id === cardId ? { ...card, front: value } : card
        )
      );
    },
    [applyManualCardsChange]
  );

  const handleManualCardAnswerChange = useCallback(
    (cardId: string, answerIndex: number, value: string) => {
      applyManualCardsChange((cards) =>
        cards.map((card) => {
          if (card.id !== cardId) {
            return card;
          }
          const nextAnswers = [...card.answers];
          nextAnswers[answerIndex] = value;
          return { ...card, answers: nextAnswers };
        })
      );
    },
    [applyManualCardsChange]
  );

  const handleAddAnswer = useCallback(
    (cardId: string) => {
      applyManualCardsChange((cards) =>
        cards.map((card) =>
          card.id === cardId
            ? { ...card, answers: [...card.answers, ""] }
            : card
        )
      );
    },
    [applyManualCardsChange]
  );

  const handleRemoveAnswer = useCallback(
    (cardId: string, answerIndex: number) => {
      applyManualCardsChange((cards) =>
        cards.map((card) => {
          if (card.id !== cardId) {
            return card;
          }
          if (card.answers.length <= 1) {
            return card;
          }
          const nextAnswers = card.answers.filter((_, index) => index !== answerIndex);
          return ensureCardHasAnswer({ ...card, answers: nextAnswers });
        })
      );
    },
    [applyManualCardsChange]
  );

  const handleAddCard = useCallback(() => {
    applyManualCardsChange((cards) => [...cards, createEmptyManualCard()]);
  }, [applyManualCardsChange]);

  const handleRemoveCard = useCallback(
    (cardId: string) => {
      applyManualCardsChange((cards) => {
        if (cards.length <= 1) {
          return cards;
        }
        return cards.filter((card) => card.id !== cardId);
      });
    },
    [applyManualCardsChange]
  );

  const undo = useCallback(() => {
    if (!enableHistory) {
      return;
    }
    setHistory((prev) => {
      if (prev.length === 0) {
        return prev;
      }
      const previousSnapshot = prev[prev.length - 1];
      setManualCards(cloneManualCards(previousSnapshot));
      return prev.slice(0, -1);
    });
  }, [enableHistory]);

  const clearHistory = useCallback(() => {
    if (!enableHistory) {
      return;
    }
    setHistory([]);
  }, [enableHistory]);

  const canUndo = enableHistory && history.length > 0;

  return {
    manualCards,
    replaceManualCards,
    handleManualCardFrontChange,
    handleManualCardAnswerChange,
    handleAddAnswer,
    handleRemoveAnswer,
    handleAddCard,
    handleRemoveCard,
    canUndo,
    undo,
    clearHistory,
  };
};

export type UseManualCardsFormReturn = ReturnType<typeof useManualCardsForm>;
