import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import MyButton from "@/src/components/button/button";
import { useStyles } from "./inputaletter-styles";
import { MinigameLayout } from "../components/MinigameLayout";
import { MinigameHeading } from "../components/MinigameHeading";
import {
  completeSessionStep,
  getSessionStep,
} from "@/src/screens/review/minigames/sessionStore";
import { getRouteForStep } from "@/src/screens/review/minigames/sessionNavigation";
import { playFeedbackSound } from "@/src/utils/soundPlayer";

type InputALetterParams = {
  words?: string | string[];
  letters?: string | string[];
  sessionId?: string | string[];
  stepId?: string | string[];
};

type WireWord = {
  id: number;
  term: string;
  missingIndices: number[];
};

type RoundWord = {
  id: number;
  term: string;
  missingIndices: number[];
};

type SlotState = {
  letter: string | null;
  letterPoolIndex: number | null;
};

type LetterState = {
  letter: string;
  used: boolean;
};

type ActiveSlot = {
  wordIndex: number;
  slotIndex: number;
};

const extractSingleParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const parseWordsParam = (raw: string | undefined): RoundWord[] => {
  if (!raw) {
    return [];
  }

  try {
    const decoded = decodeURIComponent(raw);
    const parsed = JSON.parse(decoded);

    if (!Array.isArray(parsed)) {
      return [];
    }

    const sanitized: RoundWord[] = [];

    parsed.forEach((entry: WireWord, index) => {
      if (!entry || typeof entry !== "object") {
        return;
      }

      const term =
        typeof entry.term === "string" ? entry.term.trim() : "";
      const rawIndices = Array.isArray(entry.missingIndices)
        ? entry.missingIndices.filter(
            (value): value is number =>
              typeof value === "number" && Number.isFinite(value)
          )
        : [];

      const indices = Array.from(
        new Set(
          rawIndices
            .map((value) => Math.max(0, Math.floor(value)))
            .filter((value) => Number.isInteger(value))
        )
      ).sort((a, b) => a - b);

      if (!term || indices.length === 0) {
        return;
      }

      const id =
        typeof entry.id === "number"
          ? entry.id
          : Number.MAX_SAFE_INTEGER - index;

      sanitized.push({
        id,
        term,
        missingIndices: indices,
      });
    });

    return sanitized;
  } catch (error) {
    console.warn("[InputALetter] Failed to parse words param", error);
    return [];
  }
};

const parseLettersParam = (raw: string | undefined): string[] => {
  if (!raw) {
    return [];
  }

  try {
    const decoded = decodeURIComponent(raw);
    const parsed = JSON.parse(decoded);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  } catch (error) {
    console.warn("[InputALetter] Failed to parse letters param", error);
    return [];
  }
};

const buildInitialSlots = (words: RoundWord[]): SlotState[][] =>
  words.map((word) =>
    word.missingIndices.map(() => ({
      letter: null,
      letterPoolIndex: null,
    }))
  );

const buildLetterStates = (letters: string[]): LetterState[] =>
  letters.map((letter) => ({
    letter,
    used: false,
  }));

const findFirstEmptySlot = (slotMatrix: SlotState[][]): ActiveSlot | null => {
  for (let wordIndex = 0; wordIndex < slotMatrix.length; wordIndex += 1) {
    const wordSlots = slotMatrix[wordIndex];

    for (
      let slotIndex = 0;
      slotIndex < wordSlots.length;
      slotIndex += 1
    ) {
      if (wordSlots[slotIndex]?.letter === null) {
        return { wordIndex, slotIndex };
      }
    }
  }

  return null;
};

const countTotalSlots = (words: RoundWord[]): number =>
  words.reduce(
    (accumulator, word) => accumulator + word.missingIndices.length,
    0
  );

export default function InputALetter() {
  const styles = useStyles();
  const params = useLocalSearchParams<InputALetterParams>();
  const router = useRouter();

  const sessionIdParam = extractSingleParam(params.sessionId);
  const stepIdParam = extractSingleParam(params.stepId);

  const sessionId =
    typeof sessionIdParam === "string" && sessionIdParam.length > 0
      ? sessionIdParam
      : null;
  const stepId =
    typeof stepIdParam === "string" && stepIdParam.length > 0
      ? stepIdParam
      : null;

  const sessionStep = useMemo(() => {
    if (!sessionId || !stepId) {
      return null;
    }

    const step = getSessionStep(sessionId, stepId);
    if (!step) {
      console.warn("[InputALetter] Session step not found", {
        sessionId,
        stepId,
      });
    } else if (step.type !== "inputaletter") {
      console.warn("[InputALetter] Session step has unexpected type", {
        sessionId,
        stepId,
        type: step.type,
      });
    }
    return step && step.type === "inputaletter" ? step : null;
  }, [sessionId, stepId]);

  const isSessionMode = sessionStep != null;

  const { words, letters } = useMemo(() => {
    if (sessionStep) {
      console.log("[InputALetter] Loaded session round data", {
        sessionId,
        stepId,
        words: sessionStep.round.words.map((word) => ({
          id: word.id,
          term: word.term,
          missingIndices: word.missingIndices,
        })),
        letters: sessionStep.round.letters,
      });
      return {
        words: sessionStep.round.words,
        letters: sessionStep.round.letters,
      };
    }

    const wordsParam = extractSingleParam(params.words);
    const lettersParam = extractSingleParam(params.letters);

    return {
      words: parseWordsParam(
        typeof wordsParam === "string" ? wordsParam : undefined
      ),
      letters: parseLettersParam(
        typeof lettersParam === "string" ? lettersParam : undefined
      ),
    };
  }, [params.letters, params.words, sessionId, sessionStep, stepId]);

  const [slots, setSlots] = useState<SlotState[][]>(() =>
    buildInitialSlots(words)
  );
  const [letterStates, setLetterStates] = useState<LetterState[]>(() =>
    buildLetterStates(letters)
  );
  const [activeSlot, setActiveSlot] = useState<ActiveSlot | null>(() => null);
  const [checked, setChecked] = useState(false);
  const [hasSubmittedResult, setHasSubmittedResult] = useState(false);
  const [lastEvaluation, setLastEvaluation] = useState<
    { wordId: number; isCorrect: boolean }[] | null
  >(null);

  const resetState = useCallback(() => {
    const initialSlots = buildInitialSlots(words);
    setSlots(initialSlots);
    setLetterStates(buildLetterStates(letters));
    setActiveSlot(null);
    setChecked(false);
    setHasSubmittedResult(false);
    setLastEvaluation(null);
  }, [letters, words]);

  useEffect(() => {
    resetState();
  }, [resetState]);

  const totalSlots = useMemo(() => countTotalSlots(words), [words]);

  const filledSlots = useMemo(
    () =>
      slots.reduce(
        (accumulator, wordSlots) =>
          accumulator +
          wordSlots.reduce(
            (count, slot) => count + (slot.letter ? 1 : 0),
            0
          ),
        0
      ),
    [slots]
  );

  const evaluateWords = useCallback(() => {
    return words.map((word, wordIndex) => {
      const characters = Array.from(word.term);
      const isCorrect = word.missingIndices.every((missingIndex, slotIndex) => {
        const expected = characters[missingIndex] ?? "";
        const provided = slots[wordIndex]?.[slotIndex]?.letter ?? "";
        return expected === provided;
      });

      return {
        wordId: word.id,
        isCorrect,
      };
    });
  }, [slots, words]);

  const hasValidData =
    words.length === 3 && totalSlots > 0 && letters.length >= totalSlots;

  useEffect(() => {
    console.log("[InputALetter] Round state snapshot", {
      sessionId,
      stepId,
      wordsCount: words.length,
      totalSlots,
      lettersCount: letters.length,
      isSessionMode,
    });
    if (!hasValidData) {
      console.warn("[InputALetter] Invalid round data detected", {
        sessionId,
        stepId,
        words,
        letters,
        totalSlots,
      });
    }
  }, [
    hasValidData,
    isSessionMode,
    letters,
    letters.length,
    sessionId,
    stepId,
    totalSlots,
    words,
    words.length,
  ]);

  const allSlotsFilled = totalSlots > 0 && filledSlots >= totalSlots;

  const handleSelectSlot = useCallback(
    (wordIndex: number, slotIndex: number) => {
      const currentSlot = slots[wordIndex]?.[slotIndex];

      if (currentSlot?.letter && currentSlot.letterPoolIndex != null) {
        const poolIndex = currentSlot.letterPoolIndex;

        setLetterStates((prev) =>
          prev.map((entry, index) =>
            index === poolIndex ? { ...entry, used: false } : entry
          )
        );

        setSlots((prev) =>
          prev.map((wordSlots, wIdx) =>
            wIdx === wordIndex
              ? wordSlots.map((slot, sIdx) =>
                  sIdx === slotIndex
                    ? { letter: null, letterPoolIndex: null }
                    : slot
                )
              : wordSlots
          )
        );
      }

      setActiveSlot({ wordIndex, slotIndex });
      setChecked(false);
      setHasSubmittedResult(false);
      setLastEvaluation(null);
    },
    [slots]
  );

  const findNextEmptySlot = useCallback(
    (matrix: SlotState[][]): ActiveSlot | null => findFirstEmptySlot(matrix),
    []
  );

  const handleSelectLetter = useCallback(
    (letterIndex: number) => {
      const letterEntry = letterStates[letterIndex];

      if (!letterEntry || letterEntry.used) {
        return;
      }

      let targetSlot = activeSlot;

      if (!targetSlot) {
        targetSlot = findNextEmptySlot(slots);
        if (!targetSlot) {
          return;
        }
      }

      const currentSlot = slots[targetSlot.wordIndex]?.[targetSlot.slotIndex];

      if (!currentSlot) {
        return;
      }

      let updatedLetterStates = letterStates.map((entry, index) =>
        index === letterIndex ? { ...entry, used: true } : entry
      );

      if (
        currentSlot.letter &&
        currentSlot.letterPoolIndex != null &&
        updatedLetterStates[currentSlot.letterPoolIndex]
      ) {
        updatedLetterStates = updatedLetterStates.map((entry, index) =>
          index === currentSlot.letterPoolIndex
            ? { ...entry, used: false }
            : entry
        );
      }

      const updatedSlots = slots.map((wordSlots, wIdx) =>
        wIdx === targetSlot.wordIndex
          ? wordSlots.map((slot, sIdx) =>
              sIdx === targetSlot.slotIndex
                ? {
                    letter: letterEntry.letter,
                    letterPoolIndex: letterIndex,
                  }
                : slot
            )
          : wordSlots
      );

      setLetterStates(updatedLetterStates);
      setSlots(updatedSlots);
      setChecked(false);
      setHasSubmittedResult(false);
      setLastEvaluation(null);

      const nextSlot = findNextEmptySlot(updatedSlots);
      setActiveSlot(nextSlot);
    },
    [activeSlot, findNextEmptySlot, letterStates, slots]
  );

  const handleCheck = useCallback(() => {
    if (!hasValidData) {
      return;
    }

    if (!allSlotsFilled) {
      Alert.alert(
        "Uzupełnij słówka",
        "Wszystkie luki muszą być wypełnione, zanim sprawdzimy odpowiedzi."
      );
      return;
    }

    const evaluation = evaluateWords();
    const allCorrect = evaluation.every((entry) => entry.isCorrect);
    playFeedbackSound(allCorrect);
    setLastEvaluation(evaluation);
    setChecked(true);
  }, [allSlotsFilled, evaluateWords, hasValidData]);

  const handleContinue = useCallback(() => {
    if (!isSessionMode || !sessionStep || !sessionId) {
      router.replace("/review/brain");
      return;
    }

    if (!checked || hasSubmittedResult) {
      return;
    }

    const evaluation = lastEvaluation ?? evaluateWords();

    setHasSubmittedResult(true);

    const updates = evaluation.map((entry) => ({
      wordId: entry.wordId,
      status: entry.isCorrect ? ("correct" as const) : ("incorrect" as const),
    }));

    const nextStep = completeSessionStep(sessionId, sessionStep.id, updates);

    if (nextStep) {
      const route = getRouteForStep(nextStep);
      const nextHref = `${route}?sessionId=${encodeURIComponent(
        sessionId
      )}&stepId=${encodeURIComponent(nextStep.id)}`;
      router.replace(nextHref as never);
    } else {
      router.replace("/review/brain");
    }
  }, [
    checked,
    evaluateWords,
    hasSubmittedResult,
    isSessionMode,
    lastEvaluation,
    router,
    sessionId,
    sessionStep,
  ]);

  if (!hasValidData) {
    return (
      <MinigameLayout contentStyle={styles.container}>
        <MinigameHeading title="Uzupełnij brakujące litery" />
        <View style={styles.fallbackContainer}>
          <Text style={styles.promptText}>
            Nie udało się wczytać danych dla tej minigry.
          </Text>
          <Text style={styles.helperText}>
            Wróć i spróbuj ponownie uruchomić grę z ekranu Brain.
          </Text>
        </View>
        <MyButton
          text="Wróć"
          onPress={() => router.back()}
          width={200}
          accessibilityLabel="Wróć do poprzedniego ekranu"
        />
      </MinigameLayout>
    );
  }

  const shouldShowCheckButton = !isSessionMode || !checked;
  const shouldShowContinueButton = isSessionMode && checked;
  const evaluationResult = lastEvaluation;
  const isAwaitingInput = !allSlotsFilled;
  const isCheckButtonDisabled = isAwaitingInput || checked;
  const allCorrectResult =
    evaluationResult?.every((entry) => entry.isCorrect) ?? false;
  const checkButtonColor = isAwaitingInput
    ? "border"
    : evaluationResult
    ? allCorrectResult
      ? "my_green"
      : "my_red"
    : "my_green";

  const footerActions: NonNullable<
    React.ComponentProps<typeof MinigameLayout>["footerActions"]
  > = [];

  if (shouldShowCheckButton) {
    footerActions.push({
      key: "check",
      text: "Sprawdź",
      onPress: handleCheck,
      width: 120,
      accessibilityLabel: "Sprawdź poprawność wpisanych liter",
      color: checkButtonColor,
      disabled: isCheckButtonDisabled,
    });
  }

  if (shouldShowContinueButton) {
    footerActions.push({
      key: "continue",
      text: "Dalej",
      onPress: handleContinue,
      width: 120,
      accessibilityLabel: "Przejdź do kolejnej minigry",
      color: allCorrectResult ? "my_green" : "my_red",
      disabled: hasSubmittedResult,
    });
  }

  return (
    <MinigameLayout contentStyle={styles.container} footerActions={footerActions}>
      <MinigameHeading title="Uzupełnij brakujące litery" />
      <View style={styles.wordsContainer}>
        {words.map((word, wordIndex) => {
          const characters = Array.from(word.term);

          return (
            <View
              key={`${word.id}-${word.term}`}
              style={styles.wordCard}
            >
              <View style={styles.wordRow}>
                {characters.map((char, charIndex) => {
                  const slotPosition = word.missingIndices.indexOf(charIndex);

                  if (slotPosition === -1) {
                    return (
                      <View
                        key={`${word.id}-${charIndex}-static`}
                        style={styles.staticLetterBox}
                      >
                        <Text style={styles.staticLetterText}>{char}</Text>
                      </View>
                    );
                  }

                  const slotState =
                    slots[wordIndex]?.[slotPosition] ?? null;
                  const isFilled = !!slotState?.letter;
                  const isActive =
                    activeSlot?.wordIndex === wordIndex &&
                    activeSlot.slotIndex === slotPosition;
                  const expected = characters[charIndex] ?? "";
                  const isCorrect =
                    isFilled && slotState?.letter === expected;
                  const isIncorrect =
                    isFilled && slotState?.letter !== expected;

                  return (
                    <Pressable
                      key={`${word.id}-${charIndex}-slot`}
                      onPress={() =>
                        handleSelectSlot(wordIndex, slotPosition)
                      }
                      style={({ pressed }) => [
                        styles.missingLetterBox,
                        isFilled && styles.missingLetterBoxFilled,
                        isActive && styles.missingLetterBoxActive,
                        checked &&
                          isCorrect &&
                          styles.missingLetterBoxCorrect,
                        checked &&
                          isIncorrect &&
                          styles.missingLetterBoxIncorrect,
                        pressed && styles.missingLetterBoxPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Wybierz lukę w słowie"
                    >
                      <Text
                        style={[
                          styles.missingLetterText,
                          isFilled && styles.missingLetterTextFilled,
                          checked &&
                            isCorrect &&
                            styles.missingLetterTextCorrect,
                          checked &&
                            isIncorrect &&
                            styles.missingLetterTextIncorrect,
                        ]}
                      >
                        {slotState?.letter ?? "_"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
      <View style={styles.lettersContainer}>
        {letterStates.map((entry, index) => (
          <Pressable
            key={`${entry.letter}-${index}`}
            onPress={() => handleSelectLetter(index)}
            disabled={entry.used}
            style={({ pressed }) => [
              styles.letterButton,
              entry.used && styles.letterButtonUsed,
              pressed && !entry.used && styles.letterButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Litera ${entry.letter}`}
            accessibilityState={{ disabled: entry.used }}
          >
            <Text
              style={[
                styles.letterButtonText,
                entry.used && styles.letterButtonTextUsed,
              ]}
            >
              {entry.letter}
            </Text>
          </Pressable>
        ))}
      </View>
    </MinigameLayout>
  );
}
