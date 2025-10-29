import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSettings } from "@/src/contexts/SettingsContext";
import {
  getDueCustomReviewFlashcards,
  getDueReviewWordsBatch,
  getRandomTranslationsForLevel,
} from "@/src/db/sqlite/db";
import type { CustomReviewFlashcard } from "@/src/db/sqlite/db";
import type { WordWithTranslations } from "@/src/types/boxes";
import MyButton from "@/src/components/button/button";
import { useStyles } from "./brain-styles";

// --- Types -----------------------------------------------------------------

type SanitizedWord = {
  id: number;
  term: string;
  translations: string[];
};

type ChooseOneRound = {
  prompt: string;
  options: string[];
  correctIndex: number;
};

type GetAPairPair = {
  id: number;
  term: string;
  translation: string;
  isCorrect: boolean;
};

type GetAPairRound = {
  pairs: GetAPairPair[];
};

type InputALetterWord = {
  id: number;
  term: string;
  missingIndices: number[];
};

type InputALetterRound = {
  words: InputALetterWord[];
  letters: string[];
};

// --- General helpers -------------------------------------------------------

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

const sanitizeWord = (word: WordWithTranslations): SanitizedWord | null => {
  const term = word.text?.trim() ?? "";
  const translations = word.translations
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (!term || translations.length === 0) {
    return null;
  }

  return {
    id: word.id,
    term,
    translations,
  };
};

const shuffleArray = <T,>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const isAlphabeticCharacter = (value: string): boolean => {
  if (value.length === 0) {
    return false;
  }

  const lower = value.toLocaleLowerCase();
  const upper = value.toLocaleUpperCase();

  return lower !== upper;
};

const getLetterIndices = (term: string): number[] => {
  const characters = Array.from(term);

  return characters
    .map((char, index) => (isAlphabeticCharacter(char) ? index : -1))
    .filter((index) => index !== -1);
};

export default function BrainScreen() {
  const styles = useStyles();
  const {
    activeCourse,
    activeCustomCourseId,
    selectedLevel,
    colors,
  } = useSettings();
  const router = useRouter();
  const [words, setWords] = useState<WordWithTranslations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [levelTranslations, setLevelTranslations] = useState<string[]>([]);

  // --- Derived data shared by minigames ------------------------------------
  const sanitizedWords = useMemo(
    () =>
      words
        .map(sanitizeWord)
        .filter((value): value is SanitizedWord => value !== null),
    [words]
  );

  // --- Choose One minigame setup -------------------------------------------
  const canStartChooseOne = useMemo(() => {
    if (sanitizedWords.length < 3) {
      return false;
    }

    const uniqueTranslations = new Set(
      sanitizedWords.flatMap((entry) => entry.translations)
    );

    return uniqueTranslations.size >= 3;
  }, [sanitizedWords]);

  // --- Get a Pair minigame setup -------------------------------------------
  const canStartGetAPair = useMemo(
    () => sanitizedWords.length >= 3,
    [sanitizedWords]
  );

  const canStartInputALetter = useMemo(() => {
    const eligible = sanitizedWords.filter(
      (word) => getLetterIndices(word.term).length > 0
    );

    return eligible.length >= 3;
  }, [sanitizedWords]);

  // --- Data fetching -------------------------------------------------------
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

  // Supplementary translations pulled per CEFR level for Get a Pair
  useEffect(() => {
    let isMounted = true;

    const loadLevelTranslations = async () => {
      if (
        !activeCourse?.sourceLangId ||
        !activeCourse?.targetLangId ||
        !selectedLevel ||
        sanitizedWords.length === 0
      ) {
        if (isMounted) {
          setLevelTranslations([]);
        }
        return;
      }

      try {
        const translations = await getRandomTranslationsForLevel(
          activeCourse.sourceLangId,
          activeCourse.targetLangId,
          selectedLevel,
          150,
          sanitizedWords.map((word) => word.id)
        );

        if (isMounted) {
          const unique = Array.from(
            new Set(
              translations
                .map((value) => value.trim())
                .filter((value) => value.length > 0)
            )
          );
          setLevelTranslations(unique);
        }
      } catch (err) {
        console.warn(
          "Failed to load level translations for get a pair",
          err
        );
        if (isMounted) {
          setLevelTranslations([]);
        }
      }
    };

    loadLevelTranslations();

    return () => {
      isMounted = false;
    };
  }, [
    activeCourse?.sourceLangId,
    activeCourse?.targetLangId,
    selectedLevel,
    sanitizedWords,
  ]);

  // Choose One round generator
  const createChooseOneRound = useCallback((): ChooseOneRound | null => {
    if (!canStartChooseOne) {
      return null;
    }

    const pickRandomIndex = (max: number) => Math.floor(Math.random() * max);
    const targetIndex = pickRandomIndex(sanitizedWords.length);
    const target = sanitizedWords[targetIndex];

    if (!target) {
      return null;
    }

    const correctTranslation =
      target.translations[pickRandomIndex(target.translations.length)];

    const otherTranslations = sanitizedWords
      .filter((entry) => entry.id !== target.id)
      .flatMap((entry) => entry.translations)
      .filter((value) => value !== correctTranslation);

    const uniqueDistractors = shuffleArray(
      Array.from(new Set(otherTranslations))
    );

    if (uniqueDistractors.length < 2) {
      return null;
    }

    const distractors = uniqueDistractors.slice(0, 2);
    const options = shuffleArray([...distractors, correctTranslation]);
    const correctIndex = options.indexOf(correctTranslation);

    if (correctIndex === -1) {
      return null;
    }

    return {
      prompt: target.term,
      options,
      correctIndex,
    };
  }, [canStartChooseOne, sanitizedWords]);

  // Get a Pair round generator
  const createGetAPairRound = useCallback((): GetAPairRound | null => {
    if (!canStartGetAPair) {
      return null;
    }

    const selectedWords = shuffleArray(sanitizedWords).slice(0, 3);

    if (selectedWords.length < 3) {
      return null;
    }

    const normalize = (value: string) => value.trim();

    const getUniqueTranslations = (values: string[]): string[] =>
      Array.from(
        new Set(
          values
            .map(normalize)
            .filter((entry) => entry.length > 0)
        )
      );

    const getWrongCandidates = (word: SanitizedWord): string[] => {
      const ownTranslations = new Set(
        getUniqueTranslations(word.translations)
      );

      const otherTranslations = sanitizedWords
        .filter((entry) => entry.id !== word.id)
        .flatMap((entry) => entry.translations);

      const combined = [
        ...otherTranslations,
        ...levelTranslations,
      ];

      return getUniqueTranslations(combined).filter(
        (translation) => !ownTranslations.has(translation)
      );
    };

    const assignUniqueCorrectTranslations = (): Map<number, string> | null => {
      const attempts = 10;

      for (let attempt = 0; attempt < attempts; attempt += 1) {
        const order = shuffleArray([...selectedWords]);
        const used = new Set<string>();
        const assignments = new Map<number, string>();

        const backtrack = (index: number): boolean => {
          if (index >= order.length) {
            return true;
          }

          const word = order[index];
          const options = shuffleArray(getUniqueTranslations(word.translations));

          for (const option of options) {
            if (used.has(option)) {
              continue;
            }

            used.add(option);
            assignments.set(word.id, option);

            if (backtrack(index + 1)) {
              return true;
            }

            used.delete(option);
            assignments.delete(word.id);
          }

          return false;
        };

        if (backtrack(0)) {
          return assignments;
        }
      }

      return null;
    };

    const buildSubsets = <T,>(items: T[], size: number): T[][] => {
      if (size === 0) {
        return [[]];
      }
      if (size > items.length) {
        return [];
      }

      const result: T[][] = [];

      const helper = (start: number, path: T[]) => {
        if (path.length === size) {
          result.push([...path]);
          return;
        }

        for (let i = start; i < items.length; i += 1) {
          path.push(items[i]);
          helper(i + 1, path);
          path.pop();
        }
      };

      helper(0, []);
      return result;
    };

    const assignments = assignUniqueCorrectTranslations();

    if (!assignments || assignments.size !== selectedWords.length) {
      return null;
    }

    const candidatesForIncorrect = selectedWords.filter(
      (word) => getWrongCandidates(word).length > 0
    );

    const possibleCounts =
      candidatesForIncorrect.length === 0
        ? [0]
        : Array.from(
            { length: candidatesForIncorrect.length + 1 },
            (_, index) => index
          );

    const countsToTry = shuffleArray(possibleCounts);

    for (const count of countsToTry) {
      const subsets = buildSubsets(candidatesForIncorrect, count);
      const subsetsToTry = shuffleArray(subsets);

      for (const subset of subsetsToTry) {
        const incorrectIds = new Set(subset.map((word) => word.id));
        const pairs: GetAPairPair[] = [];
        const usedTranslations = new Set<string>();
        let failed = false;

        // Assign correct pairs first to reserve their translations
        for (const word of selectedWords) {
          if (incorrectIds.has(word.id)) {
            continue;
          }

          const translation = assignments.get(word.id);
          if (!translation || usedTranslations.has(translation)) {
            failed = true;
            break;
          }

          usedTranslations.add(translation);
          pairs.push({
            id: word.id,
            term: word.term,
            translation,
            isCorrect: true,
          });
        }

        if (failed) {
          continue;
        }

        for (const word of subset) {
          const wrongCandidates = shuffleArray(
            getWrongCandidates(word).filter(
              (translation) => !usedTranslations.has(translation)
            )
          );

          const chosenWrong = wrongCandidates[0];

          if (!chosenWrong) {
            failed = true;
            break;
          }

          usedTranslations.add(chosenWrong);
          pairs.push({
            id: word.id,
            term: word.term,
            translation: chosenWrong,
            isCorrect: false,
          });
        }

        if (failed) {
          continue;
        }

        if (pairs.length === selectedWords.length) {
          return { pairs: shuffleArray(pairs) };
        }
      }
    }

    return null;
  }, [canStartGetAPair, sanitizedWords, levelTranslations]);

  // Input a Letter round generator
  const createInputALetterRound = useCallback((): InputALetterRound | null => {
    if (!canStartInputALetter) {
      return null;
    }

    const eligibleWords = sanitizedWords.filter(
      (word) => getLetterIndices(word.term).length > 0
    );

    if (eligibleWords.length < 3) {
      return null;
    }

    const selected = shuffleArray(eligibleWords).slice(0, 3);
    const words: InputALetterWord[] = [];
    const letters: string[] = [];

    for (const word of selected) {
      const characters = Array.from(word.term);
      const indices = getLetterIndices(word.term);

      if (indices.length === 0) {
        continue;
      }

      const missingCount =
        indices.length >= 6 ? 3 : indices.length >= 4 ? 2 : 1;

      const chosen = shuffleArray(indices)
        .slice(0, missingCount)
        .sort((a, b) => a - b);

      if (chosen.length === 0) {
        continue;
      }

      chosen.forEach((index) => {
        const letter = characters[index];
        if (letter) {
          letters.push(letter);
        }
      });

      words.push({
        id: word.id,
        term: word.term,
        missingIndices: chosen,
      });
    }

    if (words.length < 3 || letters.length === 0) {
      return null;
    }

    return {
      words,
      letters: shuffleArray(letters),
    };
  }, [canStartInputALetter, sanitizedWords]);

  // Choose One navigation handler
  const handleStartChooseOne = useCallback(() => {
    const round = createChooseOneRound();

    if (!round) {
      Alert.alert(
        "Brak danych",
        "Potrzebujemy co najmniej trzech różnych tłumaczeń, aby uruchomić tę grę. Spróbuj ponownie po odświeżeniu fiszek."
      );
      return;
    }

    router.push({
      pathname: "/review/minigames/chooseone",
      params: {
        prompt: round.prompt,
        options: encodeURIComponent(JSON.stringify(round.options)),
        correctIndex: String(round.correctIndex),
      },
    });
  }, [createChooseOneRound, router]);

  // Get a Pair navigation handler
  const handleStartGetAPair = useCallback(() => {
    const round = createGetAPairRound();

    if (!round) {
      Alert.alert(
        "Brak danych",
        "Potrzebujemy co najmniej trzech słówek z unikatowymi tłumaczeniami na tym poziomie. Spróbuj ponownie po odświeżeniu fiszek."
      );
      return;
    }

    router.push({
      pathname: "/review/minigames/getapair",
      params: {
        pairs: encodeURIComponent(JSON.stringify(round.pairs)),
      },
    });
  }, [createGetAPairRound, router]);

  // Input a Letter navigation handler
  const handleStartInputALetter = useCallback(() => {
    const round = createInputALetterRound();

    if (!round) {
      Alert.alert(
        "Brak danych",
        "Potrzebujemy trzech słówek z co najmniej jedną literą do ukrycia. Spróbuj ponownie po odświeżeniu fiszek."
      );
      return;
    }

    router.push({
      pathname: "/review/minigames/inputaletter",
      params: {
        words: encodeURIComponent(JSON.stringify(round.words)),
        letters: encodeURIComponent(JSON.stringify(round.letters)),
      },
    });
  }, [createInputALetterRound, router]);

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
          <MyButton
            text="Choose one"
            onPress={handleStartChooseOne}
            disabled={!!error || loading || !canStartChooseOne}
            width={180}
          />
          <MyButton
            text="Input a letter"
            onPress={handleStartInputALetter}
            disabled={!!error || loading || !canStartInputALetter}
            width={180}
          />
          <MyButton
            text="Get a pair"
            onPress={handleStartGetAPair}
            disabled={!!error || loading || !canStartGetAPair}
            width={180}
          />
        </>
      )}
    </View>
  );
}
