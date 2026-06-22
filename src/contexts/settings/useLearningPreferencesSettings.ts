import { useCallback, useEffect, useMemo } from "react";

import {
  MemoryBoardSize,
  sanitizeMemoryBoardSize,
} from "@/src/constants/memoryGame";
import { usePersistedState } from "@/src/hooks/usePersistedState";
import type { CEFRLevel } from "@/src/types/language";

import { defaultValue } from "./defaults";

export function useLearningPreferencesSettings() {
  const [selectedLevel, persistSelectedLevel] = usePersistedState<CEFRLevel>(
    "selectedLevel",
    "A1"
  );
  const [boxesLayout, setBoxesLayoutState] = usePersistedState<
    "classic" | "carousel"
  >("boxesLayout", "classic");
  const [actionButtonsPosition, setActionButtonsPositionState] =
    usePersistedState<"top" | "bottom">(
      "flashcards.actionsPosition",
      "bottom"
    );
  const [spellChecking, setSpellChecking] = usePersistedState<boolean>(
    "spellChecking",
    true
  );
  const [ignoreDiacriticsInSpellcheck, setIgnoreDiacriticsInSpellcheck] =
    usePersistedState<boolean>("spellCheckingIgnoreDiacritics", false);
  const [showBoxFaces, setShowBoxFaces] = usePersistedState<boolean>(
    "showBoxFaces",
    true
  );
  const [flashcardsBatchSize, setFlashcardsBatchSize] =
    usePersistedState<number>(
      "flashcardsBatchSize",
      defaultValue.flashcardsBatchSize
    );
  const [flashcardsSuggestionsEnabled, setFlashcardsSuggestionsEnabled] =
    usePersistedState<boolean>("flashcards.inputSuggestionsEnabled", true);
  const [quotesEnabled, setQuotesEnabled] = usePersistedState<boolean>(
    "quotes.enabled",
    true
  );
  const [dailyGoal, setDailyGoal] = usePersistedState<number>("dailyGoal", 20);
  const [rawMemoryBoardSize, setRawMemoryBoardSize] =
    usePersistedState<string>("memory.boardSize", "twoByThree");

  const memoryBoardSize = useMemo<MemoryBoardSize>(
    () => sanitizeMemoryBoardSize(rawMemoryBoardSize),
    [rawMemoryBoardSize]
  );

  useEffect(() => {
    const normalized = sanitizeMemoryBoardSize(rawMemoryBoardSize);
    if (normalized !== rawMemoryBoardSize) {
      void setRawMemoryBoardSize(normalized);
    }
  }, [rawMemoryBoardSize, setRawMemoryBoardSize]);

  const setLevel = useCallback(
    (lvl: CEFRLevel) => {
      void persistSelectedLevel(lvl);
    },
    [persistSelectedLevel]
  );

  const setBoxesLayout = useCallback(
    async (layout: "classic" | "carousel") => {
      await setBoxesLayoutState(layout);
    },
    [setBoxesLayoutState]
  );

  const setActionButtonsPosition = useCallback(
    async (position: "top" | "bottom") => {
      await setActionButtonsPositionState(position);
    },
    [setActionButtonsPositionState]
  );

  const toggleSpellChecking = useCallback(async () => {
    await setSpellChecking(!spellChecking);
  }, [setSpellChecking, spellChecking]);

  const toggleIgnoreDiacriticsInSpellcheck = useCallback(async () => {
    await setIgnoreDiacriticsInSpellcheck(!ignoreDiacriticsInSpellcheck);
  }, [ignoreDiacriticsInSpellcheck, setIgnoreDiacriticsInSpellcheck]);

  const toggleShowBoxFaces = useCallback(async () => {
    await setShowBoxFaces(!showBoxFaces);
  }, [setShowBoxFaces, showBoxFaces]);

  const toggleFlashcardsSuggestions = useCallback(async () => {
    await setFlashcardsSuggestionsEnabled(!flashcardsSuggestionsEnabled);
  }, [flashcardsSuggestionsEnabled, setFlashcardsSuggestionsEnabled]);

  const toggleQuotesEnabled = useCallback(async () => {
    await setQuotesEnabled(!quotesEnabled);
  }, [quotesEnabled, setQuotesEnabled]);

  const setMemoryBoardSize = useCallback(
    async (size: MemoryBoardSize) => {
      await setRawMemoryBoardSize(size);
    },
    [setRawMemoryBoardSize]
  );

  const resetLearningPreferencesSettings = useCallback(async () => {
    await Promise.all([
      setSpellChecking(true),
      setIgnoreDiacriticsInSpellcheck(false),
      setShowBoxFaces(true),
      setBoxesLayoutState("classic"),
      setActionButtonsPositionState("bottom"),
      setFlashcardsBatchSize(defaultValue.flashcardsBatchSize),
      setFlashcardsSuggestionsEnabled(false),
    ]);
  }, [
    setActionButtonsPositionState,
    setBoxesLayoutState,
    setFlashcardsBatchSize,
    setFlashcardsSuggestionsEnabled,
    setIgnoreDiacriticsInSpellcheck,
    setShowBoxFaces,
    setSpellChecking,
  ]);

  return {
    selectedLevel,
    setLevel,
    boxesLayout,
    setBoxesLayout,
    actionButtonsPosition,
    setActionButtonsPosition,
    spellChecking,
    toggleSpellChecking,
    ignoreDiacriticsInSpellcheck,
    toggleIgnoreDiacriticsInSpellcheck,
    showBoxFaces,
    toggleShowBoxFaces,
    flashcardsBatchSize,
    setFlashcardsBatchSize,
    flashcardsSuggestionsEnabled,
    toggleFlashcardsSuggestions,
    quotesEnabled,
    toggleQuotesEnabled,
    dailyGoal,
    setDailyGoal,
    memoryBoardSize,
    setMemoryBoardSize,
    resetLearningPreferencesSettings,
  };
}
