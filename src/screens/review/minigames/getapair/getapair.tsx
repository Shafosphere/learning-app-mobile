import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import MyButton from "@/src/components/button/button";
import { useStyles } from "./getapair-styles";

type GetAPairParams = {
  pairs?: string | string[];
};

type PairEntry = {
  id: number;
  term: string;
  translation: string;
  isCorrect: boolean;
};

type EvaluationMode = "allWrong" | "allCorrect" | "selected";

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
    mode: EvaluationMode;
  } | null>(null);

  const pairs = useMemo<PairEntry[]>(() => {
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
  }, [params.pairs]);

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

  const evaluateSelection = (mode: EvaluationMode) => {
    if (!hasValidData) {
      return;
    }

    let success = false;

    if (mode === "allWrong") {
      success = incorrectCount === totalPairs;
    } else if (mode === "allCorrect") {
      success = incorrectCount === 0;
    } else {
      const selectedSet = new Set(selectedIds);
      success =
        selectedSet.size > 0 &&
        selectedSet.size === incorrectIds.size &&
        Array.from(selectedSet).every((id) => incorrectIds.has(id));
    }

    const message = success
      ? "Brawo! Twoja ocena jest poprawna."
      : `To nie to. ${summaryLabel}`;

    setResult({
      success,
      message,
      mode,
    });
  };

  if (!hasValidData) {
    return (
      <View style={styles.container}>
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
      </View>
    );
  }

  const showSelectedAction = selectedIds.length > 0;
  const showEvaluation = result !== null;

  return (
    <View style={styles.container}>
      <View style={styles.promptContainer}>
        <Text style={styles.caption}>Znajdź błędne pary</Text>
        <Text style={styles.promptText}>
          Kliknij na pary, które są niepoprawne, albo oceń cały zestaw.
        </Text>
        <Text style={styles.helperText}>
          Dostępne odpowiedzi: wszystkie źle, wszystkie dobrze lub tylko te,
          które zaznaczysz.
        </Text>
      </View>
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
      <View style={styles.actionsContainer}>
        <MyButton
          text="Wszystkie źle"
          onPress={() => evaluateSelection("allWrong")}
          disabled={showEvaluation}
          width={220}
        />
        <MyButton
          text="Wszystkie dobrze"
          onPress={() => evaluateSelection("allCorrect")}
          disabled={showEvaluation}
          width={220}
        />
        {showSelectedAction ? (
          <MyButton
            text="Te są złe"
            onPress={() => evaluateSelection("selected")}
            disabled={showEvaluation}
            width={220}
          />
        ) : null}
      </View>
      {result ? (
        <View style={styles.resultContainer}>
          <Text
            style={[
              styles.resultText,
              result.success
                ? styles.resultTextSuccess
                : styles.resultTextError,
            ]}
          >
            {result.message}
          </Text>
          <View style={styles.resultSummary}>
            <Text style={styles.resultSummaryText}>{summaryLabel}</Text>
          </View>
          <MyButton
            text="Wróć do Brain"
            onPress={() => router.replace("/review/brain")}
            width={200}
            accessibilityLabel="Wróć do ekranu Brain"
          />
        </View>
      ) : null}
    </View>
  );
}
