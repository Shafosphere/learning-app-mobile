import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import MyButton from "@/src/components/button/button";
import { useStyles } from "./getapair-styles";
import { MinigameLayout } from "../components/MinigameLayout";
import { MinigameHeading } from "../components/MinigameHeading";
import {
  completeSessionStep,
  getSessionStep,
} from "@/src/screens/review/minigames/sessionStore";
import { getRouteForStep } from "@/src/screens/review/minigames/sessionNavigation";

type GetAPairParams = {
  pairs?: string | string[];
  sessionId?: string | string[];
  stepId?: string | string[];
};

type PairEntry = {
  id: number;
  term: string;
  translation: string;
  isCorrect: boolean;
};

const extractSingleParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const getSummaryLabel = (incorrectCount: number, total: number) => {
  if (incorrectCount === 0) {
    return "W tym zestawie wszystkie pary są poprawne.";
  }

  if (incorrectCount === total) {
    return "W tym zestawie wszystkie pary są błędne.";
  }

  if (incorrectCount === 1) {
    return "Dokładnie jedna para jest błędna.";
  }

  if (incorrectCount === 2) {
    return "Dokładnie dwie pary są błędne.";
  }

  return `Błędnych par jest ${incorrectCount}.`;
};

export default function GetaPair() {
  const styles = useStyles();
  const params = useLocalSearchParams<GetAPairParams>();
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [hasSubmittedResult, setHasSubmittedResult] = useState(false);
  const [lastEvaluation, setLastEvaluation] = useState<
    { wordId: number; isCorrect: boolean }[] | null
  >(null);

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
    return step && step.type === "getapair" ? step : null;
  }, [sessionId, stepId]);

  const isSessionMode = sessionStep != null;

  const pairs = useMemo<PairEntry[]>(() => {
    if (sessionStep) {
      return sessionStep.round.pairs;
    }

    const encodedPairs = extractSingleParam(params.pairs);

    if (typeof encodedPairs !== "string" || encodedPairs.length === 0) {
      return [];
    }

    try {
      const decoded = decodeURIComponent(encodedPairs);
      const maybeArray = JSON.parse(decoded);

      if (!Array.isArray(maybeArray)) {
        return [];
      }

      return maybeArray
        .map((entry) => {
          if (
            typeof entry !== "object" ||
            entry === null ||
            typeof (entry as { term?: unknown }).term !== "string" ||
            typeof (entry as { translation?: unknown }).translation !==
              "string" ||
            typeof (entry as { id?: unknown }).id !== "number" ||
            typeof (entry as { isCorrect?: unknown }).isCorrect !== "boolean"
          ) {
            return null;
          }

          const id = (entry as { id: number }).id;
          const term = (entry as { term: string }).term.trim();
          const translation = (entry as { translation: string }).translation.trim();
          const isCorrect = (entry as { isCorrect: boolean }).isCorrect;

          if (!term || !translation || Number.isNaN(id)) {
            return null;
          }

          return {
            id,
            term,
            translation,
            isCorrect,
          };
        })
        .filter((value): value is PairEntry => value !== null)
        .slice(0, 3);
    } catch (error) {
      console.warn("[GetAPair] Failed to parse pairs from params", error);
      return [];
    }
  }, [params.pairs, sessionStep]);

  const hasValidData = pairs.length === 3;

  const incorrectIds = useMemo(
    () => new Set(pairs.filter((pair) => !pair.isCorrect).map((pair) => pair.id)),
    [pairs]
  );

  const incorrectCount = incorrectIds.size;
  const totalPairs = pairs.length;
  const summaryLabel = useMemo(
    () => getSummaryLabel(incorrectCount, totalPairs),
    [incorrectCount, totalPairs]
  );

  useEffect(() => {
    setSelectedIds([]);
    setResult(null);
    setHasSubmittedResult(false);
    setLastEvaluation(null);
  }, [pairs, sessionStep?.id]);

  const handleTogglePair = (pairId: number) => {
    if (result) {
      return;
    }

    setSelectedIds((prev) =>
      prev.includes(pairId)
        ? prev.filter((id) => id !== pairId)
        : [...prev, pairId]
    );
  };

  const buildEvaluation = useCallback(
    (selectedSet: Set<number>) =>
      pairs.map((pair) => {
        const shouldSelect = !pair.isCorrect;
        const isSelected = selectedSet.has(pair.id);

        return {
          wordId: pair.id,
          isCorrect: shouldSelect === isSelected,
        };
      }),
    [pairs]
  );

  const evaluateSelection = () => {
    if (!hasValidData) {
      return;
    }

    const selectedSet = new Set(selectedIds);
    const evaluation = buildEvaluation(selectedSet);

    const success =
      selectedSet.size > 0 &&
      selectedSet.size === incorrectIds.size &&
      evaluation.every((entry) => entry.isCorrect);

    const message = success
      ? "Brawo! Twoja ocena jest poprawna."
      : `To nie to. ${summaryLabel}`;

    setResult({
      success,
      message,
    });
    setLastEvaluation(evaluation);
  };

  const handleRetry = () => {
    setResult(null);
    setSelectedIds([]);
    setHasSubmittedResult(false);
    setLastEvaluation(null);
  };

  const handleContinue = useCallback(() => {
    if (!isSessionMode || !sessionStep || !sessionId) {
      router.replace("/review/brain");
      return;
    }

    if (!result || hasSubmittedResult) {
      return;
    }

    const evaluation =
      lastEvaluation ?? buildEvaluation(new Set(selectedIds));

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
    buildEvaluation,
    hasSubmittedResult,
    isSessionMode,
    lastEvaluation,
    result,
    router,
    selectedIds,
    sessionId,
    sessionStep,
  ]);

  if (!hasValidData) {
    return (
      <MinigameLayout contentStyle={styles.container}>
        <MinigameHeading title="Znajdź błędne pary" />
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

  const showEvaluation = result !== null;

  return (
    <MinigameLayout
      contentStyle={styles.container}
      footerContent={
        <View style={styles.actionsContainer}>
          <MyButton
            text="Sprawdź"
            onPress={evaluateSelection}
            disabled={showEvaluation || selectedIds.length === 0}
            width={120}
            color="my_green"
          />
          {isSessionMode ? (
            <MyButton
              text="Dalej"
              onPress={handleContinue}
              disabled={!showEvaluation || hasSubmittedResult}
              width={120}
              color="my_green"
              accessibilityLabel="Przejdź do kolejnej minigry"
            />
          ) : null}
        </View>
      }
    >
      <MinigameHeading title="Znajdź błędne pary" />
      <View style={styles.pairsContainer}>
        {pairs.map((pair) => {
          const isSelected = selectedIds.includes(pair.id);
          const isIncorrect = incorrectIds.has(pair.id);

          return (
            <Pressable
              key={pair.id}
              onPress={() => handleTogglePair(pair.id)}
              disabled={showEvaluation}
              accessibilityRole="button"
              accessibilityState={{
                disabled: showEvaluation,
                selected: isSelected,
              }}
              accessibilityLabel={`Para: ${pair.term} - ${pair.translation}`}
              style={({ pressed }) => [
                styles.pairButton,
                pressed && styles.pairButtonPressed,
                isSelected && styles.pairButtonSelected,
                showEvaluation &&
                  (isIncorrect
                    ? styles.pairButtonIncorrect
                    : styles.pairButtonCorrect),
              ]}
            >
              <View style={styles.pairContent}>
                <Text
                  style={[
                    styles.termText,
                    isSelected && styles.pairTextSelected,
                  ]}
                >
                  {pair.term}
                </Text>
                <Text
                  style={[
                    styles.translationText,
                    isSelected && styles.pairTextSelected,
                  ]}
                >
                  {pair.translation}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </MinigameLayout>
  );
}
