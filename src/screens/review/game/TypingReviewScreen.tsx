import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { TextInput, View } from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";

import MyButton from "@/src/components/button/button";

import RotaryStack, {
  RotaryStackHandle,
  RotaryStackItem,
} from "@/src/components/carousel/RotaryStack";

import useSpellchecking from "@/src/hooks/useSpellchecking";

import { useSettings } from "@/src/contexts/SettingsContext";
import { advanceCustomReview } from "@/src/db/sqlite/db";

import { useStyles } from "./TypingReviewScreen-styles";

type AnimationParams = {
  words?: string | string[];
};

type AnimationWord = {
  id: number;
  term: string;
  translations: string[];
};

type AnimationResult = {
  word: AnimationWord;
  status: "correct" | "incorrect";
  answer: string;
};

type Direction = "termToTranslation" | "translationToTerm";

type QueueEntry = {
  word: AnimationWord;
  promptItem: RotaryStackItem;
  expectedAnswers: string[];
  direction: Direction;
  availablePrompts?: string[];
  currentPromptIndex?: number;
};

const DEMO_WORDS: AnimationWord[] = [
  { id: 1, term: "ALFA", translations: ["ALFA"] },
  { id: 2, term: "BRAVO", translations: ["BRAVO"] },
  { id: 3, term: "CHARLIE", translations: ["CHARLIE"] },
  { id: 4, term: "DELTA", translations: ["DELTA"] },
  { id: 5, term: "ECHO", translations: ["ECHO"] },
  { id: 6, term: "FOXTROT", translations: ["FOXTROT"] },
];

const extractParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const createQueueEntry = (word: AnimationWord): QueueEntry => {
  const flipDirection = Math.random() < 0.5;
  if (!flipDirection) {
    return {
      word,
      promptItem: {
        text: word.term,
        showMultiAnswerHint: false,
      },
      expectedAnswers: word.translations,
      direction: "termToTranslation",
    };
  }

  const translationPrompt =
    word.translations[Math.floor(Math.random() * word.translations.length)] ??
    word.translations[0];
  const initialIndex = word.translations.findIndex(
    (value) => value === translationPrompt
  );
  const safeIndex = initialIndex >= 0 ? initialIndex : 0;

  return {
    word,
    promptItem: {
      text: translationPrompt,
      showMultiAnswerHint: word.translations.length > 1,
    },
    expectedAnswers: [word.term],
    direction: "translationToTerm",
    availablePrompts: word.translations,
    currentPromptIndex: safeIndex,
  };
};

export default function AnimationScreen() {
  const styles = useStyles();
  const params = useLocalSearchParams<AnimationParams>();
  const router = useRouter();
  const checkSpelling = useSpellchecking();
  const { activeCustomCourseId } = useSettings();
  const carouselRef = useRef<RotaryStackHandle>(null);
  const inputRef = useRef<TextInput>(null);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [persistingResults, setPersistingResults] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueRef = useRef<QueueEntry[]>([]);
  const [finished, setFinished] = useState(false);
  const [carouselItems, setCarouselItems] = useState<RotaryStackItem[]>(
    DEMO_WORDS.map((word) => ({ text: word.term }))
  );
  const [results, setResults] = useState<AnimationResult[]>([]);
  const [currentDirection, setCurrentDirection] = useState<Direction | null>(
    null
  );
  const providedWords = useMemo(() => {
    const raw = extractParam(params.words);

    if (typeof raw !== "string" || raw.length === 0) {
      return [];
    }

    try {
      const decoded = decodeURIComponent(raw);
      const parsed = JSON.parse(decoded);

      if (!Array.isArray(parsed)) {
        return [];
      }

      let fallbackId = 100000;
      const sanitized: AnimationWord[] = [];

      parsed.forEach((entry) => {
        if (typeof entry !== "object" || entry === null) {
          return;
        }

        const term =
          typeof (entry as { term?: unknown }).term === "string"
            ? (entry as { term: string }).term.trim()
            : "";

        const translationsRaw = Array.isArray(
          (entry as { translations?: unknown }).translations
        )
          ? (entry as { translations: unknown[] }).translations
          : [];

        const translations = translationsRaw
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter((value) => value.length > 0);

        if (term.length === 0 || translations.length === 0) {
          return;
        }

        const idValue =
          typeof (entry as { id?: unknown }).id === "number"
            ? (entry as { id: number }).id
            : Number.NaN;

        const id = Number.isFinite(idValue) ? idValue : fallbackId;
        if (!Number.isFinite(idValue)) {
          fallbackId += 1;
        }

        sanitized.push({
          id,
          term,
          translations,
        });
      });

      return sanitized.slice(0, 15);
    } catch (err) {
      console.warn("[AnimationScreen] Failed to parse incoming words", err);
      return [];
    }
  }, [params.words]);

  const isDemoMode = providedWords.length === 0;

  const persistResults = useCallback(
    async (entries: AnimationResult[]) => {
      if (isDemoMode || entries.length === 0) {
        return;
      }

      const correctEntries = entries.filter(
        (entry) => entry.status === "correct"
      );

      if (correctEntries.length === 0) {
        return;
      }

      if (activeCustomCourseId != null) {
        await Promise.allSettled(
          correctEntries.map((entry) =>
            advanceCustomReview(entry.word.id, activeCustomCourseId).catch(
              (error) => {
                console.warn(
                  "[TypingReviewScreen] Failed to advance custom review word",
                  entry.word.id,
                  error
                );
              }
            )
          )
        );
        return;
      }

      console.warn(
        "[TypingReviewScreen] Missing review context, skipping persistence."
      );
    },
    [
      activeCustomCourseId,
      isDemoMode,
    ]
  );

  useEffect(() => {
    if (providedWords.length === 0) {
      console.log("[AnimationScreen] No words provided, using demo data.");
    } else {
      console.log(
        "[AnimationScreen] Received words:",
        providedWords.map((word) => word.term)
      );
    }
  }, [providedWords]);

  useEffect(() => {
    const queueSource = providedWords.length > 0 ? providedWords : DEMO_WORDS;
    const randomizedQueue = queueSource.map(createQueueEntry);

    queueRef.current = randomizedQueue;
    setFinished(randomizedQueue.length === 0);
    setResults([]);
    setAnswer("");
    setCarouselItems(randomizedQueue.map((entry) => entry.promptItem));
    setCurrentDirection(randomizedQueue[0]?.direction ?? null);
  }, [providedWords]);

  useEffect(() => {
    inputRef.current?.focus();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleFinish = useCallback(async () => {
    if (!finished || results.length === 0 || persistingResults) {
      return;
    }

    setPersistingResults(true);

    const payload = results.map((entry) => ({
      id: entry.word.id,
      term: entry.word.term,
      translations: entry.word.translations,
      status: entry.status,
    }));

    try {
      await persistResults(results);
    } finally {
      setPersistingResults(false);
    }

    router.replace({
      pathname: "/review/table",
      params: {
        words: encodeURIComponent(JSON.stringify(payload)),
      },
    });
  }, [finished, persistResults, persistingResults, results, router]);

  const handleSpin = useCallback(() => {
    const carousel = carouselRef.current;
    const queue = queueRef.current;

    if (
      !carousel ||
      busy ||
      carousel.isAnimating() ||
      queue.length === 0 ||
      finished
    ) {
      return;
    }

    const [currentWord, ...rest] = queue;
    const normalizedAnswer = answer.trim();
    const isCorrect = currentWord.expectedAnswers.some((value) =>
      checkSpelling(normalizedAnswer, value)
    );

    setResults((prev) => [
      ...prev,
      {
        word: currentWord.word,
        status: isCorrect ? "correct" : "incorrect",
        answer: normalizedAnswer,
      },
    ]);

    console.log("[AnimationScreen] Środkowe słowo:", currentWord.promptItem.text);

    setAnswer("");
    inputRef.current?.focus();
    queueRef.current = rest;
    if (rest.length === 0) {
      setFinished(true);
      setCurrentDirection(null);
    } else {
      setCurrentDirection(rest[0]?.direction ?? null);
    }

    const hiddenItem = rest.length >= 3 ? rest[2]?.promptItem ?? null : null;

    setBusy(true);
    carousel.spin({
      injectItem: hiddenItem ?? null,
    });

    inputRef.current?.focus();

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      setBusy(false);
      timerRef.current = null;
    }, 800);
  }, [answer, busy, checkSpelling, finished]);

  const handleCyclePrompt = useCallback(() => {
    const queue = queueRef.current;
    if (queue.length === 0) {
      return null;
    }

    const [currentEntry, ...rest] = queue;

    if (
      currentEntry.direction !== "translationToTerm" ||
      !currentEntry.availablePrompts ||
      currentEntry.availablePrompts.length <= 1
    ) {
      return null;
    }

    const prompts = currentEntry.availablePrompts;
    const currentIndex = currentEntry.currentPromptIndex ?? 0;
    const nextIndex = (currentIndex + 1) % prompts.length;
    const nextText = prompts[nextIndex];

    const updatedEntry: QueueEntry = {
      ...currentEntry,
      promptItem: {
        text: nextText,
        showMultiAnswerHint: true,
      },
      currentPromptIndex: nextIndex,
    };

    queueRef.current = [updatedEntry, ...rest];

    return updatedEntry.promptItem;
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.emptyspace} />

        {/* <Text style={styles.emptyText}>
          {providedWords.length > 0
            ? `Słówka z Brain: ${providedWords.length}`
            : "Tryb demo (brak słówek z Brain)"}
        </Text> */}

        <RotaryStack
          ref={carouselRef}
          items={carouselItems}
          height={70}
          onMiddleIconPress={handleCyclePrompt}
        />

        <TextInput
          style={styles.answerInput}
          placeholder={
            currentDirection === "translationToTerm"
              ? "Wpisz słówko po angielsku"
              : "Wpisz tłumaczenie"
          }
          value={answer}
          onChangeText={setAnswer}
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={finished ? handleFinish : handleSpin}
          ref={inputRef}
        />

        <View style={styles.buttonRow}>
          <MyButton
            text={finished ? "KONIEC" : "submit"}
            color="my_green"
            onPress={finished ? handleFinish : handleSpin}
            disabled={
              busy ||
              persistingResults ||
              (finished && results.length === 0)
            }
            width={140}
          />
        </View>
      </View>
    </View>
  );
}
