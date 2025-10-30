import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useStyles } from "./chooseone-styles";
import MyButton from "@/src/components/button/button";
import { MinigameLayout } from "../components/MinigameLayout";
import { MinigameHeading } from "../components/MinigameHeading";
import {
  completeSessionStep,
  getSessionStep,
} from "@/src/screens/review/minigames/sessionStore";
import { getRouteForStep } from "@/src/screens/review/minigames/sessionNavigation";

type ChooseOneParams = {
  prompt?: string | string[];
  options?: string | string[];
  correctIndex?: string | string[];
  sessionId?: string | string[];
  stepId?: string | string[];
};

const extractSingleParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default function ChooseOne() {
  const styles = useStyles();
  const params = useLocalSearchParams<ChooseOneParams>();
  const router = useRouter();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hasChecked, setHasChecked] = useState(false);
  const [hasSubmittedResult, setHasSubmittedResult] = useState(false);

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
    return step && step.type === "chooseone" ? step : null;
  }, [sessionId, stepId]);

  const isSessionMode = sessionStep != null;

  const { prompt, options, correctIndex } = useMemo(() => {
    if (sessionStep) {
      return {
        prompt: sessionStep.round.prompt,
        options: sessionStep.round.options,
        correctIndex: sessionStep.round.correctIndex,
      };
    }

    const promptParam = extractSingleParam(params.prompt);
    const optionsParam = extractSingleParam(params.options);
    const correctIndexParam = extractSingleParam(params.correctIndex);

    let parsedOptions: string[] = [];

    if (typeof optionsParam === "string" && optionsParam.length > 0) {
      try {
        const decoded = decodeURIComponent(optionsParam);
        const maybeArray = JSON.parse(decoded);

        if (Array.isArray(maybeArray)) {
          parsedOptions = maybeArray
            .filter((value): value is string => typeof value === "string")
            .map((value) => value.trim())
            .filter((value) => value.length > 0);
        }
      } catch (error) {
        console.warn(
          "[ChooseOne] Failed to parse options from params",
          error
        );
      }
    }

    const parsedIndex =
      typeof correctIndexParam === "string"
        ? Number.parseInt(correctIndexParam, 10)
        : Number.NaN;

    return {
      prompt: typeof promptParam === "string" ? promptParam : undefined,
      options: parsedOptions,
      correctIndex: Number.isNaN(parsedIndex) ? -1 : parsedIndex,
    };
  }, [params.correctIndex, params.options, params.prompt, sessionStep]);

  const hasValidData =
    typeof prompt === "string" &&
    prompt.trim().length > 0 &&
    Array.isArray(options) &&
    options.length === 3 &&
    correctIndex >= 0 &&
    correctIndex < options.length;

  useEffect(() => {
    setSelectedIndex(null);
    setHasChecked(false);
    setHasSubmittedResult(false);
  }, [sessionStep?.id, prompt]);

  const handleSelect = useCallback(
    (index: number) => {
      if (hasChecked) {
        return;
      }
      setSelectedIndex(index);
    },
    [hasChecked]
  );

  const handleCheck = useCallback(() => {
    if (selectedIndex === null || hasChecked) {
      return;
    }
    setHasChecked(true);
  }, [hasChecked, selectedIndex]);

  const handleContinue = useCallback(() => {
    if (!isSessionMode || !sessionStep || !sessionId) {
      router.replace("/review/brain");
      return;
    }

    if (!hasChecked || hasSubmittedResult) {
      return;
    }

    const isCorrect =
      selectedIndex !== null && selectedIndex === correctIndex;

    setHasSubmittedResult(true);

    const nextStep = completeSessionStep(sessionId, sessionStep.id, [
      {
        wordId: sessionStep.wordId,
        status: isCorrect ? ("correct" as const) : ("incorrect" as const),
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
    correctIndex,
    hasChecked,
    hasSubmittedResult,
    isSessionMode,
    router,
    selectedIndex,
    sessionId,
    sessionStep,
  ]);

  if (!hasValidData) {
    return (
      <MinigameLayout contentStyle={styles.container}>
        <MinigameHeading title="Wybierz poprawne tłumaczenie" />
        <View style={styles.promptContainer}>
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
          width={180}
          accessibilityLabel="Wróć do poprzedniego ekranu"
        />
      </MinigameLayout>
    );
  }

  const isSelectionCorrect =
    hasChecked && selectedIndex !== null && selectedIndex === correctIndex;
  const correctAnswerLabel = options[correctIndex];
  const showResult = hasChecked && selectedIndex !== null;

  return (
    <MinigameLayout
      contentStyle={styles.container}
      footerContent={
        <View style={styles.actionsContainer}>
          <MyButton
            text="Sprawdź"
            color="my_green"
            onPress={handleCheck}
            disabled={selectedIndex === null || hasChecked}
            width={120}
            accessibilityLabel="Sprawdź zaznaczoną odpowiedź"
          />
          {isSessionMode ? (
            <MyButton
              text="Dalej"
              color="my_green"
              onPress={handleContinue}
              disabled={!hasChecked || hasSubmittedResult}
              width={120}
              accessibilityLabel="Przejdź do kolejnej minigry"
            />
          ) : null}
        </View>
      }
    >
      <MinigameHeading title="Wybierz poprawne tłumaczenie" />
      <View style={styles.promptContainer}>
        <Text style={styles.promptText}>{prompt}</Text>
      </View>
      <View style={styles.optionsContainer}>
        {options.map((option, index) => (
          <Pressable
            key={`${option}-${index}`}
            onPress={() => handleSelect(index)}
            disabled={hasChecked}
            accessibilityRole="button"
            accessibilityLabel={`Odpowiedź ${index + 1}`}
            accessibilityState={{
              disabled: hasChecked,
              selected: selectedIndex === index,
            }}
            style={({ pressed }) => [
              styles.optionButton,
              pressed && styles.optionButtonPressed,
              selectedIndex === index &&
                !hasChecked &&
                styles.optionButtonSelected,
              showResult &&
                index === correctIndex &&
                styles.optionButtonCorrect,
              showResult &&
                selectedIndex === index &&
                index !== correctIndex &&
                styles.optionButtonIncorrect,
            ]}
          >
            <Text style={styles.optionText}>{option}</Text>
          </Pressable>
        ))}
      </View>
    </MinigameLayout>
  );
}
