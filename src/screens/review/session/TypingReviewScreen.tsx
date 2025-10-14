import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSettings } from "@/src/contexts/SettingsContext";
import useSpellchecking from "@/src/hooks/useSpellchecking";
import {
  advanceCustomReview,
  advanceReview,
  getDueCustomReviewFlashcards,
  getDueReviewWordsBatch,
  removeCustomReview,
  removeReview,
} from "@/src/db/sqlite/db";
import type { CustomReviewFlashcard } from "@/src/db/sqlite/db";
import type { WordWithTranslations } from "@/src/types/boxes";
import { useStyles } from "./TypingReviewScreen-styles";
import { removeWordIdFromUsedWordIds } from "@/src/hooks/useBoxesPersistenceSnapshot";
import MyButton from "@/src/components/button/button";
import RotaryStack, {
  RotaryStackHandle,
} from "@/src/components/carousel/RotaryStack";

function mapCustomReviewToWord(
  card: CustomReviewFlashcard
): WordWithTranslations {
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
  };
}

export default function TypingReviewScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { activeProfile, selectedLevel, activeCustomProfileId } = useSettings();
  const checkSpelling = useSpellchecking();
  const carouselRef = useRef<RotaryStackHandle>(null);

  const [current, setCurrent] = useState<WordWithTranslations | null>(null);
  const [answer, setAnswer] = useState("");
  const [promptState, setPromptState] = useState<
    "neutral" | "correct" | "wrong"
  >("neutral");
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [carouselItems, setCarouselItems] = useState<string[]>([]);
  const [spinBusy, setSpinBusy] = useState(false);

  const isCustomMode = activeCustomProfileId != null;
  const srcId = activeProfile?.sourceLangId ?? null;
  const tgtId = activeProfile?.targetLangId ?? null;
  const hasBuiltInProfile =
    srcId != null && tgtId != null && selectedLevel != null;
  const canRunReview = isCustomMode || hasBuiltInProfile;
  const carouselWordsRef = useRef<WordWithTranslations[]>([]);
  const sessionTimeRef = useRef<number>(Date.now());
  const [lockedAfterWrong, setLockedAfterWrong] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);

  const formatWordText = (value?: string | null) =>
    value && value.trim().length > 0 ? value : "";

  const dedupeWords = (list: WordWithTranslations[]) => {
    const seen = new Set<number>();
    return list.filter((item) => {
      if (seen.has(item.id)) {
        return false;
      }
      seen.add(item.id);
      return true;
    });
  };

  async function fetchDueWords(
    limit: number,
    nowMs: number
  ): Promise<WordWithTranslations[]> {
    if (isCustomMode && activeCustomProfileId != null) {
      const rows = await getDueCustomReviewFlashcards(
        activeCustomProfileId,
        limit,
        nowMs
      );
      return rows.map(mapCustomReviewToWord);
    }

    if (!isCustomMode && srcId && tgtId && selectedLevel) {
      return getDueReviewWordsBatch(srcId, tgtId, selectedLevel, limit, nowMs);
    }

    return [];
  }

  async function loadNext() {
    if (!canRunReview) {
      setCurrent(null);
      setCarouselItems([]);
      carouselWordsRef.current = [];
      setSessionEnded(false);
      setAnswer("");
      setPromptState("neutral");
      setCorrectAnswer(null);
      setLockedAfterWrong(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const nowCursor = sessionTimeRef.current;
      const hadWordsBefore = carouselWordsRef.current.length > 0;
      const batch = await fetchDueWords(5, nowCursor);
      const uniqueBatch = dedupeWords(batch);
      carouselWordsRef.current = uniqueBatch;
      setCarouselItems(uniqueBatch.map((item) => formatWordText(item.text)));
      const next = uniqueBatch[0] ?? null;
      setCurrent(next);
      setSessionEnded(uniqueBatch.length === 0 && hadWordsBefore);
    } finally {
      setAnswer("");
      setPromptState("neutral");
      setCorrectAnswer(null);
      setLoading(false);
      setLockedAfterWrong(false);
    }
  }

  useEffect(() => {
    sessionTimeRef.current = Date.now();
    void loadNext();
  }, [srcId, tgtId, selectedLevel, activeCustomProfileId, isCustomMode]);

  function onSubmit() {
    if (!current || !canRunReview) return;
    const ok = current.translations.some((t) => checkSpelling(answer, t));
    if (ok) {
      setPromptState("correct");
      setLoading(true);
      const advancePromise =
        isCustomMode && activeCustomProfileId != null
          ? advanceCustomReview(current.id, activeCustomProfileId)
          : srcId && tgtId
          ? advanceReview(current.id, srcId, tgtId)
          : Promise.resolve();
      advancePromise
        .catch(() => {})
        .finally(() => {
          setLoading(false);
        });
      setTimeout(() => {
        void loadNext();
      }, 2000);
    } else {
      setPromptState("wrong");
      setCorrectAnswer(current.translations[0] ?? "");
    }
  }

  async function onKeep() {
    if (!current || !canRunReview) return;
    if (spinBusy) return;
    setSpinBusy(true);
    setLockedAfterWrong(false);
    setPromptState("neutral");
    setCorrectAnswer(null);

    const advancePromise =
      isCustomMode && activeCustomProfileId != null
        ? advanceCustomReview(current.id, activeCustomProfileId)
        : srcId && tgtId
        ? advanceReview(current.id, srcId, tgtId)
        : Promise.resolve();
    advancePromise.catch(() => {});

    try {
      const nextWord = await fetchNextCarouselWord();
      const rotated = nextWord
        ? spinCarousel({ injectionWord: nextWord })
        : spinCarousel();
      if (rotated) {
        setAnswer("");
      }
    } finally {
      setSpinBusy(false);
    }
  }

  async function onReset() {
    if (!current || !canRunReview) return;
    if (spinBusy) return;
    setSpinBusy(true);
    try {
      if (isCustomMode && activeCustomProfileId != null) {
        await removeCustomReview(current.id, activeCustomProfileId);
      } else if (srcId && tgtId && selectedLevel) {
        await removeReview(current.id, srcId, tgtId);
        await removeWordIdFromUsedWordIds({
          sourceLangId: srcId,
          targetLangId: tgtId,
          level: selectedLevel,
          wordId: current.id,
        });
      }
      const nextWord = await fetchNextCarouselWord();
      const rotated = spinCarousel({
        injectionWord: nextWord ?? undefined,
        dropCurrent: true,
      });
      if (rotated) {
        setSessionEnded(false);
      }
      setAnswer("");
      setPromptState("neutral");
      setCorrectAnswer(null);
      setLockedAfterWrong(false);
    } finally {
      setSpinBusy(false);
    }
  }

  async function fetchNextCarouselWord(): Promise<WordWithTranslations | null> {
    if (!canRunReview) return null;
    const batch = await fetchDueWords(5, sessionTimeRef.current);
    if (batch.length === 0) {
      return null;
    }
    const uniqueBatch = dedupeWords(batch);
    const exclude = new Set(carouselWordsRef.current.map((item) => item.id));
    const fresh = uniqueBatch.find((item) => !exclude.has(item.id));
    return fresh ?? null;
  }

  function spinCarousel(options?: {
    injectionWord?: WordWithTranslations | null;
    dropCurrent?: boolean;
  }): boolean {
    const carousel = carouselRef.current;
    if (!carousel) return false;

    const { injectionWord = null, dropCurrent = false } = options ?? {};
    const queue = carouselWordsRef.current;
    if (queue.length === 0) {
      setSessionEnded(true);
      setCurrent(null);
      setCarouselItems([]);
      setPromptState("neutral");
      setCorrectAnswer(null);
      setLockedAfterWrong(false);
      return false;
    }

    let nextQueue = dropCurrent ? queue.slice(1) : [...queue];

    if (!dropCurrent && nextQueue.length > 1) {
      nextQueue = [...nextQueue.slice(1), nextQueue[0]];
    }

    if (injectionWord) {
      nextQueue = nextQueue.filter((item) => item.id !== injectionWord.id);
      if (nextQueue.length >= 3) {
        nextQueue[2] = injectionWord;
      } else {
        nextQueue.push(injectionWord);
      }
    }

    if (nextQueue.length === 0) {
      carouselWordsRef.current = [];
      setCurrent(null);
      setCarouselItems([]);
      setSessionEnded(true);
      setPromptState("neutral");
      setCorrectAnswer(null);
      setLockedAfterWrong(false);
      return false;
    }

    carouselWordsRef.current = nextQueue;
    const nextCurrent = nextQueue[0] ?? null;
    setCurrent(nextCurrent);
    setSessionEnded(false);

    const hiddenTopWord = nextQueue.length >= 3 ? nextQueue[2] : null;

    const injectText = formatWordText(hiddenTopWord?.text);
    carousel.spin({ injectText });
    return true;
  }

  async function handleSpin() {
    const carousel = carouselRef.current;
    if (!carousel || carousel.isAnimating() || spinBusy) return;
    if (!current || !canRunReview) return;
    if (lockedAfterWrong) return;

    setSpinBusy(true);
    const ok = current.translations.some((t) => checkSpelling(answer, t));
    if (!ok) {
      setPromptState("wrong");
      setCorrectAnswer(current.translations[0] ?? "");
      setLockedAfterWrong(true);
      setSpinBusy(false);
      return;
    }

    setPromptState("correct");
    setCorrectAnswer(null);
    setLockedAfterWrong(false);

    const advancePromise =
      isCustomMode && activeCustomProfileId != null
        ? advanceCustomReview(current.id, activeCustomProfileId)
        : srcId && tgtId
        ? advanceReview(current.id, srcId, tgtId)
        : Promise.resolve();
    advancePromise.catch(() => {});

    try {
      const nextWord = await fetchNextCarouselWord();
      const rotated = spinCarousel({
        injectionWord: nextWord ?? undefined,
        dropCurrent: true,
      });
      if (rotated) {
        setAnswer("");
        setPromptState("neutral");
      }
    } finally {
      setSpinBusy(false);
    }
  }

  const reviewContextMessage = isCustomMode
    ? "Wybierz profil własnych fiszek."
    : "Wybierz profil i poziom w ustawieniach.";

  return (
    <View style={styles.container}>
      {!canRunReview ? (
        <Text style={styles.emptyText}>{reviewContextMessage}</Text>
      ) : loading ? (
        <ActivityIndicator />
      ) : sessionEnded ? (
        <View style={{ alignItems: "center", gap: 12 }}>
          <Text style={styles.emptyText}>Powtórka zakończona.</Text>
          <MyButton
            text="WRÓĆ"
            color="my_yellow"
            onPress={() => router.back()}
            width={100}
          />
        </View>
      ) : !current ? (
        <View style={{ alignItems: "center", gap: 12 }}>
          <Text style={styles.emptyText}>Brak słówek do powtórki.</Text>
          <MyButton
            text="WRÓĆ"
            color="my_yellow"
            onPress={() => router.back()}
            width={100}
          />
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.emptyspace}></View>
          {/* Temporary carousel demo */}
          <View>
            <RotaryStack
              ref={carouselRef}
              items={
                carouselItems.length > 0 ? carouselItems : [current?.text ?? ""]
              }
              height={70}
            />
          </View>
          <TextInput
            style={styles.answerInput}
            placeholder="Przetłumacz"
            value={answer}
            onChangeText={setAnswer}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={onSubmit}
          />
          <View style={styles.buttonRow}>
            {promptState === "wrong" && (
              <MyButton
                text="ZRESETUJ"
                color="my_red"
                onPress={() => {
                  void onReset();
                }}
                disabled={spinBusy || sessionEnded}
                width={140}
              />
            )}

            <View style={{ gap: 10 }}>
              <MyButton
                text="submit"
                color="my_green"
                onPress={() => {
                  void handleSpin();
                }}
                disabled={spinBusy || lockedAfterWrong || sessionEnded}
                width={140}
              />
              {promptState === "wrong" && (
                <MyButton
                  text="ZACHOWAJ"
                  color="my_yellow"
                  onPress={() => {
                    void onKeep();
                  }}
                  disabled={spinBusy || sessionEnded}
                  width={140}
                />
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
