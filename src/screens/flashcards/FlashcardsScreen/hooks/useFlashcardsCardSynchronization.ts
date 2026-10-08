import { useCallback, useEffect } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { BoxesState, WordWithTranslations } from "@/src/types/boxes";
import { subscribeFlashcardReturnedToUnknown } from "@/src/services/returnFlashcardToUnknown";
import { subscribeFlashcardUpdated } from "@/src/services/flashcardUpdated";

type Params = {
  activeCustomCourseId: number | null;
  selectedItemIdRef: MutableRefObject<number | null>;
  setBoxes: Dispatch<SetStateAction<BoxesState>>;
  setLearned: Dispatch<SetStateAction<WordWithTranslations[]>>;
  removeUsedWordIds: (ids: number | number[]) => void;
  markWordForRelearning: (id: number) => void;
  setReviewedCardIds: Dispatch<SetStateAction<number[]>>;
  resetInteractionState: () => void;
  patchCustomCard: (card: WordWithTranslations) => void;
  updateSelectedItem: (
    updater: (current: WordWithTranslations) => WordWithTranslations,
  ) => void;
  clearCardTransientState: () => void;
  patchCustomCardHints: (
    cardId: number,
    hintFront: string | null,
    hintBack: string | null,
  ) => void;
  handlePersistHintUpdate: (
    cardId: number,
    hintFront: string | null,
    hintBack: string | null,
  ) => Promise<void>;
};

export function useFlashcardsCardSynchronization({
  activeCustomCourseId,
  selectedItemIdRef,
  setBoxes,
  setLearned,
  removeUsedWordIds,
  markWordForRelearning,
  setReviewedCardIds,
  resetInteractionState,
  patchCustomCard,
  updateSelectedItem,
  clearCardTransientState,
  patchCustomCardHints,
  handlePersistHintUpdate,
}: Params) {
  useEffect(() => {
    return subscribeFlashcardReturnedToUnknown(({ courseId, flashcardId }) => {
      if (activeCustomCourseId !== courseId) return;

      setBoxes((prev) => ({
        boxZero: prev.boxZero.filter((card) => card.id !== flashcardId),
        boxOne: prev.boxOne.filter((card) => card.id !== flashcardId),
        boxTwo: prev.boxTwo.filter((card) => card.id !== flashcardId),
        boxThree: prev.boxThree.filter((card) => card.id !== flashcardId),
        boxFour: prev.boxFour.filter((card) => card.id !== flashcardId),
        boxFive: prev.boxFive.filter((card) => card.id !== flashcardId),
      }));
      setLearned((prev) => prev.filter((card) => card.id !== flashcardId));
      removeUsedWordIds(flashcardId);
      markWordForRelearning(flashcardId);
      setReviewedCardIds((prev) => prev.filter((id) => id !== flashcardId));

      if (selectedItemIdRef.current === flashcardId) {
        resetInteractionState();
      }
    });
  }, [
    activeCustomCourseId,
    markWordForRelearning,
    removeUsedWordIds,
    resetInteractionState,
    selectedItemIdRef,
    setBoxes,
    setLearned,
    setReviewedCardIds,
  ]);

  useEffect(() => {
    return subscribeFlashcardUpdated(({ courseId, card }) => {
      if (activeCustomCourseId !== courseId) return;
      const patcher = (item: WordWithTranslations) =>
        item.id === card.id ? card : item;
      patchCustomCard(card);
      setBoxes((prev) => ({
        boxZero: prev.boxZero.map(patcher),
        boxOne: prev.boxOne.map(patcher),
        boxTwo: prev.boxTwo.map(patcher),
        boxThree: prev.boxThree.map(patcher),
        boxFour: prev.boxFour.map(patcher),
        boxFive: prev.boxFive.map(patcher),
      }));
      setLearned((prev) => prev.map(patcher));
      updateSelectedItem((current) => (current ? patcher(current) : current));
      clearCardTransientState();
    });
  }, [
    activeCustomCourseId,
    patchCustomCard,
    clearCardTransientState,
    setBoxes,
    setLearned,
    updateSelectedItem,
  ]);

  const patchCardEverywhere = useCallback(
    (cardId: number, hintFront: string | null, hintBack: string | null) => {
      const patcher = (item: WordWithTranslations) =>
        item.id === cardId ? { ...item, hintFront, hintBack } : item;

      patchCustomCardHints(cardId, hintFront, hintBack);
      setBoxes((prev) => ({
        boxZero: prev.boxZero.map(patcher),
        boxOne: prev.boxOne.map(patcher),
        boxTwo: prev.boxTwo.map(patcher),
        boxThree: prev.boxThree.map(patcher),
        boxFour: prev.boxFour.map(patcher),
        boxFive: prev.boxFive.map(patcher),
      }));
      setLearned((prev) => prev.map(patcher));
      updateSelectedItem((current) => (current ? patcher(current) : current));
    },
    [patchCustomCardHints, setBoxes, setLearned, updateSelectedItem],
  );

  const handleHintUpdate = useCallback(
    async (
      cardId: number,
      hintFront: string | null,
      hintBack: string | null,
    ) => {
      if (activeCustomCourseId == null) return;
      patchCardEverywhere(cardId, hintFront, hintBack);
      try {
        await handlePersistHintUpdate(cardId, hintFront, hintBack);
      } catch (error) {
        console.error("Failed to update flashcard hint", { cardId, error });
      }
    },
    [activeCustomCourseId, handlePersistHintUpdate, patchCardEverywhere],
  );

  return { handleHintUpdate };
}
