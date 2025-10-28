import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Text, View } from "react-native";
import { useSettings } from "@/src/contexts/SettingsContext";
import {
  getDueCustomReviewFlashcards,
  getDueReviewWordsBatch,
} from "@/src/db/sqlite/db";
import type { CustomReviewFlashcard } from "@/src/db/sqlite/db";
import type { WordWithTranslations } from "@/src/types/boxes";
import MyButton from "@/src/components/button/button";
import { useStyles } from "./brain-styles";

const mapCustomReviewToWord = (
  card: CustomReviewFlashcard
): WordWithTranslations => {
  const answers = (card.answers ?? [])
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  const fallback = card.backText?.trim() ?? "";
  const translations =
    answers.length > 0
      ? answers
      : fallback.length > 0
      ? [fallback]
      : [card.frontText];

  return {
    id: card.id,
    text: card.frontText,
    translations,
    flipped: card.flipped,
  };
};

export default function BrainScreen() {
  const styles = useStyles();
  const {
    activeCourse,
    activeCustomCourseId,
    selectedLevel,
    colors,
  } = useSettings();
  const [words, setWords] = useState<WordWithTranslations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchWords = async () => {
      if (!activeCustomCourseId && !activeCourse?.sourceLangId) {
        if (isMounted) {
          setWords([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const now = Date.now();
        let result: WordWithTranslations[] = [];

        if (activeCustomCourseId != null) {
          const rows = await getDueCustomReviewFlashcards(
            activeCustomCourseId,
            50,
            now
          );
          result = rows.map(mapCustomReviewToWord);
        } else {
          const srcId = activeCourse?.sourceLangId ?? null;
          const tgtId = activeCourse?.targetLangId ?? null;
          if (srcId && tgtId && selectedLevel) {
            result = await getDueReviewWordsBatch(
              srcId,
              tgtId,
              selectedLevel,
              50,
              now
            );
          }
        }

        if (isMounted) {
          setWords(result);
        }
      } catch (err) {
        console.error("Failed to load review words for brain screen", err);
        if (isMounted) {
          setWords([]);
          setError("Nie udało się pobrać fiszek.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchWords();

    return () => {
      isMounted = false;
    };
  }, [
    activeCourse?.sourceLangId,
    activeCourse?.targetLangId,
    activeCustomCourseId,
    selectedLevel,
  ]);

  return (
    <View style={styles.container}>
      <Image
        source={require("@/assets/illustrations/box/logo.png")}
        style={styles.logo}
        accessibilityIgnoresInvertColors
      />
      {loading ? (
        <ActivityIndicator color={colors.my_green} />
      ) : (
        <>
          <Text style={styles.counter}>
            {error ?? `Gotowe fiszki: ${words.length}`}
          </Text>
          <MyButton
            text="Start"
            onPress={() => {}}
            disabled={words.length === 0 || !!error}
          />
        </>
      )}
    </View>
  );
}
