import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useStyles } from "./wrongletter-styles";
import { MinigameLayout } from "../components/MinigameLayout";
import { MinigameHeading } from "../components/MinigameHeading";
import { playFeedbackSound } from "@/src/utils/soundPlayer";
import {
  buildWrongLetterRoundFromTerm,
  type WrongLetterRound,
} from "@/src/screens/review/brain/minigame-generators";
import {
  completeSessionStep,
  getSessionStep,
} from "@/src/screens/review/minigames/sessionStore";
import { getRouteForStep } from "@/src/screens/review/minigames/sessionNavigation";

type WrongLetterParams = {
  word?: string | string[];
  sessionId?: string | string[];
  stepId?: string | string[];
};

const extractSingleParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default function WrongLetter() {
  const styles = useStyles();
  const router = useRouter();
  const params = useLocalSearchParams<WrongLetterParams>();

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
    return step && step.type === "wrongletter" ? step : null;
  }, [sessionId, stepId]);

  const isSessionMode = sessionStep != null;

  const wordParam = extractSingleParam(params.word);
  const normalizedWord = useMemo(() => {
    if (typeof wordParam === "string") {
      return wordParam.trim();
    }
    return "";
  }, [wordParam]);

  const [round, setRound] = useState<WrongLetterRound | null>(() => {
    if (sessionStep) {
      return sessionStep.round;
    }

    return normalizedWord ? buildWrongLetterRoundFromTerm(normalizedWord) : null;
  });
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hasChecked, setHasChecked] = useState(false);
  const [hasSubmittedResult, setHasSubmittedResult] = useState(false);

  useEffect(() => {
    if (sessionStep) {
      setRound(sessionStep.round);
    } else {
      setRound(
        normalizedWord ? buildWrongLetterRoundFromTerm(normalizedWord) : null
      );
    }
    setSelectedIndex(null);
    setHasChecked(false);
    setHasSubmittedResult(false);
  }, [normalizedWord, sessionStep]);

  const handleLetterPress = useCallback(
    (index: number) => {
      if (!round || hasChecked) {
        return;
      }

      const tile = round.letters[index];

      if (!tile) {
        return;
      }

      setSelectedIndex(index);
    },
    [hasChecked, round]
  );

  const handleCheck = useCallback(() => {
    if (!round || selectedIndex === null || hasChecked) {
      return;
    }

    const tile = round.letters[selectedIndex];

    if (!tile) {
      return;
    }

    playFeedbackSound(tile.isWrong);
    setHasChecked(true);
  }, [hasChecked, round, selectedIndex]);

  const handleContinue = useCallback(() => {
    if (!isSessionMode || !sessionStep || !sessionId || !round) {
      return;
    }

    if (!hasChecked || hasSubmittedResult) {
      return;
    }

    const tile = selectedIndex !== null ? round.letters[selectedIndex] : null;
    const isCorrect = tile?.isWrong ?? false;
    setHasSubmittedResult(true);

    const nextStep = completeSessionStep(sessionId, sessionStep.id, [
      {
        wordId: sessionStep.wordId,
        status: isCorrect ? "correct" : "incorrect",
      },
    ]);

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
    hasChecked,
    hasSubmittedResult,
    isSessionMode,
    round,
    router,
    selectedIndex,
    sessionId,
    sessionStep,
  ]);

  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

  const showResult = hasChecked;
  const selectedTile =
    selectedIndex !== null && round ? round.letters[selectedIndex] : null;
  const isCorrectSelection = Boolean(selectedTile?.isWrong);
  const shouldShowCheckButton = !isSessionMode || !hasChecked;
  const shouldShowContinueButton = isSessionMode && hasChecked;
  const isCheckDisabled = selectedIndex === null || hasChecked;
  const checkButtonColor = selectedIndex === null
    ? "border"
    : showResult
    ? isCorrectSelection
      ? "my_green"
      : "my_red"
    : "my_green";

  const footerActions = useMemo(() => {
    const actions: NonNullable<
      React.ComponentProps<typeof MinigameLayout>["footerActions"]
    > = [];

    if (shouldShowCheckButton) {
      actions.push({
        key: "check",
        text: "Sprawdź",
        onPress: handleCheck,
        disabled: isCheckDisabled,
        color: checkButtonColor,
        width: 120,
      });
    }

    if (shouldShowContinueButton) {
      actions.push({
        key: "continue",
        text: "Dalej",
        onPress: handleContinue,
        disabled: hasSubmittedResult,
        color: isCorrectSelection ? "my_green" : "my_red",
        width: 120,
      });
    }

    if (!isSessionMode) {
      actions.push({
        key: "back",
        text: "Wróć",
        onPress: handleGoBack,
        width: 120,
      });
    }

    return actions;
  }, [
    checkButtonColor,
    handleCheck,
    handleContinue,
    hasSubmittedResult,
    isCheckDisabled,
    isCorrectSelection,
    isSessionMode,
    handleGoBack,
    shouldShowCheckButton,
    shouldShowContinueButton,
  ]);
  const renderedWord = useMemo(() => {
    if (!round) {
      return "";
    }
    return round.letters.map((letter) => letter.char).join("");
  }, [round]);

  return (
    <MinigameLayout contentStyle={styles.container} footerActions={footerActions}>
      <MinigameHeading title="Znajdź błędną literę" />
      {round ? (
        <>
          <Text style={styles.instructions}>{renderedWord}</Text>
          <View style={styles.tilesContainer}>
            {round.letters.map((letter, index) => {
              const isSelected = selectedIndex === index;
              const isCorrectTile = showResult && letter.isWrong;
              const isSelectedCorrect = isCorrectTile && isSelected;
              const isSelectedIncorrect =
                showResult && isSelected && !letter.isWrong;
              const isPendingSelection = isSelected && !showResult;

              return (
                <Pressable
                  key={`${letter.char}-${index}`}
                  style={({ pressed }) => [
                    styles.tile,
                    isPendingSelection && styles.tileSelected,
                    isCorrectTile && styles.tileCorrect,
                    isSelectedIncorrect && styles.tileIncorrect,
                    !showResult && pressed && styles.tilePressed,
                  ]}
                  onPress={() => handleLetterPress(index)}
                  disabled={hasChecked}
                  accessibilityRole="button"
                  accessibilityLabel={`Litera ${letter.char}`}
                >
                  <Text
                    style={[
                      styles.tileText,
                      isPendingSelection && styles.tileTextSelected,
                      isSelectedCorrect && styles.tileTextCorrect,
                      isSelectedIncorrect && styles.tileTextIncorrect,
                    ]}
                  >
                    {letter.char}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : (
        <View style={styles.fallbackContainer}>
          <Text style={styles.promptText}>
            Nie udało się przygotować tej minigry.
          </Text>
          <Text style={styles.helperText}>
            Wróć do ekranu Brain i wybierz inne słowo.
          </Text>
        </View>
      )}
    </MinigameLayout>
  );
}
