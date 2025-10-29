import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useStyles } from "./chooseone-styles";
import MyButton from "@/src/components/button/button";

type ChooseOneParams = {
  prompt?: string | string[];
  options?: string | string[];
  correctIndex?: string | string[];
};

const extractSingleParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default function ChooseOne() {
  const styles = useStyles();
  const params = useLocalSearchParams<ChooseOneParams>();
  const router = useRouter();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const { prompt, options, correctIndex } = useMemo(() => {
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
  }, [params.correctIndex, params.options, params.prompt]);

  const hasValidData =
    typeof prompt === "string" &&
    prompt.trim().length > 0 &&
    Array.isArray(options) &&
    options.length === 3 &&
    correctIndex >= 0 &&
    correctIndex < options.length;

  const handleSelect = (index: number) => {
    if (selectedIndex !== null) {
      return;
    }
    setSelectedIndex(index);
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

  const isSelectionCorrect =
    selectedIndex !== null && selectedIndex === correctIndex;
  const correctAnswerLabel = options[correctIndex];

  return (
    <View style={styles.container}>
      <View style={styles.promptContainer}>
        <Text style={styles.caption}>Wybierz poprawne tłumaczenie</Text>
        <Text style={styles.promptText}>{prompt}</Text>
      </View>
      <View style={styles.optionsContainer}>
        {options.map((option, index) => (
          <Pressable
            key={`${option}-${index}`}
            onPress={() => handleSelect(index)}
            disabled={selectedIndex !== null}
            accessibilityRole="button"
            accessibilityLabel={`Odpowiedź ${index + 1}`}
            accessibilityState={{
              disabled: selectedIndex !== null,
              selected: selectedIndex === index,
            }}
            style={({ pressed }) => [
              styles.optionButton,
              pressed && styles.optionButtonPressed,
              selectedIndex !== null &&
                index === correctIndex &&
                styles.optionButtonCorrect,
              selectedIndex !== null &&
                selectedIndex === index &&
                index !== correctIndex &&
                styles.optionButtonIncorrect,
            ]}
          >
            <Text style={styles.optionText}>{option}</Text>
          </Pressable>
        ))}
      </View>
      {selectedIndex !== null ? (
        <View style={styles.resultContainer}>
          <Text
            style={[
              styles.resultText,
              isSelectionCorrect
                ? styles.resultTextSuccess
                : styles.resultTextError,
            ]}
          >
            {isSelectionCorrect
              ? "Brawo! To poprawna odpowiedź."
              : `To nie to. Poprawna odpowiedź to: ${correctAnswerLabel}`}
          </Text>
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
