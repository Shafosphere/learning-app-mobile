import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
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
import {
  MEMORY_BOARD_LAYOUTS,
  MEMORY_BOARD_SIZE_LABELS,
  MEMORY_BOARD_SIZE_ORDER,
  MemoryBoardSize,
} from "@/src/constants/memoryGame";
import {
  buildSessionTemplate,
  MIN_SESSION_WORDS,
} from "./session-builder";
import {
  destroySession,
  registerSession,
} from "@/src/screens/review/minigames/sessionStore";
import { getRouteForStep } from "@/src/screens/review/minigames/sessionNavigation";
import {
  ChooseOneRound,
  createChooseOneRound as generateChooseOneRound,
  createGetAPairRound as generateGetAPairRound,
  createInputALetterRound as generateInputALetterRound,
  getLetterIndices,
  GetAPairRound,
  InputALetterRound,
  sanitizeWord,
  SanitizedWord,
} from "./minigame-generators";

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
    memoryBoardSize,
    setMemoryBoardSize,
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

  const handleStartSession = useCallback(() => {
    if (sanitizedWords.length < MIN_SESSION_WORDS) {
      Alert.alert(
        "Za mało fiszek",
        `Potrzebujemy co najmniej ${MIN_SESSION_WORDS} słówek, aby rozpocząć sesję gier.`
      );
      return;
    }

    const buildResult = buildSessionTemplate({
      sanitizedWords,
      levelTranslations,
    });

    if (!buildResult.ok) {
      Alert.alert("Brak danych", buildResult.message);
      return;
    }

    const { sessionId, firstStep } = registerSession(buildResult.template);

    if (!firstStep) {
      destroySession(sessionId);
      Alert.alert(
        "Nie udało się rozpocząć",
        "Wystąpił błąd podczas przygotowywania sesji gier. Spróbuj ponownie."
      );
      return;
    }

    const route = getRouteForStep(firstStep);
    const nextHref = `${route}?sessionId=${encodeURIComponent(
      sessionId
    )}&stepId=${encodeURIComponent(firstStep.id)}`;
    router.push(nextHref as never);
  }, [
    levelTranslations,
    router,
    sanitizedWords,
  ]);

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

  const canStartWrongLetter = useMemo(
    () => sanitizedWords.some((word) => word.term.trim().length >= 2),
    [sanitizedWords]
  );

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
        console.warn("Failed to load level translations for get a pair", err);
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

    return generateChooseOneRound(sanitizedWords);
  }, [canStartChooseOne, sanitizedWords]);

  // Get a Pair round generator
  const createGetAPairRound = useCallback((): GetAPairRound | null => {
    if (!canStartGetAPair) {
      return null;
    }

    return generateGetAPairRound(sanitizedWords, levelTranslations);
  }, [canStartGetAPair, levelTranslations, sanitizedWords]);

  // Input a Letter round generator
  const createInputALetterRound = useCallback((): InputALetterRound | null => {
    if (!canStartInputALetter) {
      return null;
    }

    return generateInputALetterRound(sanitizedWords);
  }, [canStartInputALetter, sanitizedWords]);

  const handleMemoryBoardSelect = useCallback(
    (size: MemoryBoardSize) => {
      if (size !== memoryBoardSize) {
        void setMemoryBoardSize(size);
      }
    },
    [memoryBoardSize, setMemoryBoardSize]
  );

  const handleStartMemoryGame = useCallback(() => {
    router.push("/review/minigames/memorygame");
  }, [router]);

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

  const handleOpenTable = useCallback(() => {
    if (sanitizedWords.length === 0) {
      return;
    }

    const payload = sanitizedWords.map((word) => ({
      id: word.id,
      term: word.term,
      translations: word.translations,
    }));

    router.push({
      pathname: "/review/table",
      params: {
        words: encodeURIComponent(JSON.stringify(payload)),
      },
    });
  }, [router, sanitizedWords]);

  const handleStartWrongLetter = useCallback(() => {
    if (!canStartWrongLetter) {
      Alert.alert(
        "Brak danych",
        "Potrzebujemy co najmniej jednego słowa z dwiema literami, aby uruchomić tę grę."
      );
      return;
    }

    const eligible = sanitizedWords.filter(
      (word) => word.term.trim().length >= 2
    );
    const pool = eligible.length > 0 ? eligible : sanitizedWords;
    const randomIndex = Math.floor(Math.random() * pool.length);
    const selected = pool[randomIndex];

    if (!selected) {
      Alert.alert(
        "Brak danych",
        "Nie udało się pobrać słowa do gry. Odśwież fiszki i spróbuj ponownie."
      );
      return;
    }

    router.push({
      pathname: "/review/minigames/wrongletter",
      params: {
        word: selected.term,
      },
    });
  }, [canStartWrongLetter, router, sanitizedWords]);

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
            onPress={handleStartSession}
            disabled={
              !!error ||
              loading ||
              sanitizedWords.length < MIN_SESSION_WORDS
            }
          />
          <View style={styles.memorySection}>
            <Text style={styles.memoryTitle}>Memory game</Text>
            <Text style={styles.memorySubtitle}>
              Wybierz układ planszy i rozpocznij grę.
            </Text>
            <View style={styles.memoryOptions}>
              {MEMORY_BOARD_SIZE_ORDER.map((size) => {
                const isActive = memoryBoardSize === size;
                const layout = MEMORY_BOARD_LAYOUTS[size];
                const cardsCount = layout.columns * layout.rows;
                return (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.memoryOption,
                      isActive && styles.memoryOptionActive,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => handleMemoryBoardSelect(size)}
                  >
                    <Text
                      style={[
                        styles.memoryOptionLabel,
                        isActive && styles.memoryOptionLabelActive,
                      ]}
                    >
                      {MEMORY_BOARD_SIZE_LABELS[size]}
                    </Text>
                    <Text
                      style={[
                        styles.memoryOptionMeta,
                        isActive && styles.memoryOptionMetaActive,
                      ]}
                    >
                      {cardsCount} kart
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <MyButton
              text="Memory game"
              onPress={handleStartMemoryGame}
              disabled={!!error || loading}
              width={120}
            />
          </View>
          <MyButton
            text="Tablica"
            onPress={handleOpenTable}
            disabled={!!error || loading || sanitizedWords.length === 0}
            width={120}
          />
          <MyButton
            text="Choose one"
            onPress={handleStartChooseOne}
            disabled={!!error || loading || !canStartChooseOne}
            width={120}
          />
          <MyButton
            text="Input a letter"
            onPress={handleStartInputALetter}
            disabled={!!error || loading || !canStartInputALetter}
            width={120}
          />
          <MyButton
            text="Get a pair"
            onPress={handleStartGetAPair}
            disabled={!!error || loading || !canStartGetAPair}
            width={120}
          />
          <MyButton
            text="Wrong letter"
            onPress={handleStartWrongLetter}
            disabled={!!error || loading || !canStartWrongLetter}
            width={120}
          />
        </>
      )}
    </View>
  );
}
