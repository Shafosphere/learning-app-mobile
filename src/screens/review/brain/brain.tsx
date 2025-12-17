import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { Ionicons } from "@expo/vector-icons";
import { BRAIN_INTRO_MESSAGES } from "@/src/constants/introMessages";
import { useSettings } from "@/src/contexts/SettingsContext";
import { getDueCustomReviewFlashcards } from "@/src/db/sqlite/db";
import type { CustomReviewFlashcard } from "@/src/db/sqlite/repositories/reviews";
import { useScreenIntro } from "@/src/hooks/useScreenIntro";
import {
  sanitizeWord,
  type SanitizedWord,
} from "@/src/screens/review/brain/minigame-generators";
import {
  buildSessionTemplate,
  MIN_SESSION_WORDS,
} from "@/src/screens/review/brain/session-builder";
import {
  destroySession,
  registerSession,
  type SessionWordContext,
} from "@/src/screens/review/minigames/sessionStore";
import { getRouteForStep } from "@/src/screens/review/minigames/sessionNavigation";
import type { WordWithTranslations } from "@/src/types/boxes";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
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
  const { activeCustomCourseId, colors } = useSettings();
  const router = useRouter();
  const [words, setWords] = useState<WordWithTranslations[]>([]);
  const [wordContexts, setWordContexts] = useState<
    Record<number, SessionWordContext>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [levelTranslations, setLevelTranslations] = useState<string[]>([]);
  const { IntroOverlay } = useScreenIntro({
    messages: BRAIN_INTRO_MESSAGES,
    storageKey: "@review_brain_intro_seen_v1",
    triggerStrategy: "post_onboarding",
  });

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
      wordContexts,
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
  }, [levelTranslations, router, sanitizedWords, wordContexts]);

  // --- Data fetching -------------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    const fetchWords = async () => {
      if (activeCustomCourseId == null) {
        if (isMounted) {
          setWords([]);
          setWordContexts({});
          setError("Wybierz kurs do powtórek.");
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const now = Date.now();
        const contexts: Record<number, SessionWordContext> = {};
        const rows = await getDueCustomReviewFlashcards(
          activeCustomCourseId,
          50,
          now
        );
        const result = rows.map((row) => {
          contexts[row.id] = {
            kind: "custom",
            courseId: row.courseId,
          };
          return mapCustomReviewToWord(row);
        });

        if (isMounted) {
          setWords(result);
          setWordContexts(contexts);
        }
      } catch (err) {
        console.error("Failed to load review words for brain screen", err);
        if (isMounted) {
          setWords([]);
          setWordContexts({});
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
    activeCustomCourseId,
  ]);

  // Supplementary translations pulled per CEFR level for Get a Pair
  useEffect(() => {
    const translations = sanitizedWords
      .flatMap((word) => word.translations)
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    const unique = Array.from(new Set(translations));
    setLevelTranslations(unique);
  }, [sanitizedWords]);

  const handleOpenAnimationDemo = useCallback(() => {
    const payload = sanitizedWords.slice(0, 15).map((word) => ({
      id: word.id,
      term: word.term,
      translations: word.translations,
    }));

    if (payload.length === 0) {
      Alert.alert(
        "Brak danych",
        "Najpierw pobierz fiszki, aby zobaczyć karuzelę animacji."
      );
      return;
    }

    router.push({
      pathname: "/review/animation",
      params: {
        words: encodeURIComponent(JSON.stringify(payload)),
      },
    });
  }, [router, sanitizedWords]);

  return (
    <View style={styles.container}>
      <IntroOverlay />
      {loading ? (
        <ActivityIndicator color={colors.my_green} />
      ) : (
        <>
          {/* <MyButton
            text="Start"
            onPress={handleStartSession}
            disabled={
              !!error || loading || sanitizedWords.length < MIN_SESSION_WORDS
            }
          />
          <MyButton text="tradycyjne" onPress={handleOpenAnimationDemo} /> */}

          <Pressable
            style={[styles.button, styles.topbutton]}
            onPress={handleStartSession}
          >
            <FontAwesome5
              disabled={
                !!error || loading || sanitizedWords.length < MIN_SESSION_WORDS
              }
              name="gamepad"
              size={100}
              color={colors.headline}
            />
            <Text style={styles.header}>MINI GRY</Text>
          </Pressable>

          <Pressable
            style={[styles.button, styles.botbutton]}
            onPress={handleOpenAnimationDemo}
          >
            <Text style={styles.header}>KARUZELA</Text>
            <Ionicons name="flash" size={100} color={colors.headline} />
          </Pressable>
        </>
      )}
    </View>
  );
}
