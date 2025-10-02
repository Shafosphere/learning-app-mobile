import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSettings } from "@/src/contexts/SettingsContext";
import useSpellchecking from "@/src/hooks/useSpellchecking";
import {
  advanceReview,
  getDueReviewWordsBatch,
  removeReview,
} from "@/src/components/db/db";
import type { WordWithTranslations } from "@/src/types/boxes";
import { useSessionStyles } from "./sessionStyles";
import { removeWordIdFromUsedWordIds } from "@/src/hooks/useBoxesPersistenceSnapshot";
import MyButton from "@/src/components/button/button";
import RotaryStack, {
  RotaryStackHandle,
} from "@/src/components/carousel/RotaryStack";

export default function ReviewSessionScreen() {
  const styles = useSessionStyles();
  const router = useRouter();
  const { activeProfile, selectedLevel } = useSettings();
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

  const srcId = activeProfile?.sourceLangId ?? null;
  const tgtId = activeProfile?.targetLangId ?? null;
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

  async function loadNext() {
    if (!srcId || !tgtId) {
      setCurrent(null);
      setCarouselItems([]);
      carouselWordsRef.current = [];
      setSessionEnded(false);
      return;
    }
    setLoading(true);
    try {
      const nowCursor = sessionTimeRef.current;
      const hadWordsBefore = carouselWordsRef.current.length > 0;
      const batch = await getDueReviewWordsBatch(
        srcId,
        tgtId,
        selectedLevel,
        5,
        nowCursor
      );
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
  }, [srcId, tgtId, selectedLevel]);

  function onSubmit() {
    if (!current || !srcId || !tgtId) return;
    const ok = current.translations.some((t) => checkSpelling(answer, t));
    if (ok) {
      setPromptState("correct");
      setLoading(true);
      advanceReview(current.id, srcId, tgtId)
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
    if (!current || !srcId || !tgtId) return;
    if (spinBusy) return;
    setSpinBusy(true);
    setLockedAfterWrong(false);
    setPromptState("neutral");
    setCorrectAnswer(null);

    advanceReview(current.id, srcId, tgtId).catch(() => {});

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
    if (!current || !srcId || !tgtId) return;
    if (spinBusy) return;
    setSpinBusy(true);
    try {
      await removeReview(current.id, srcId, tgtId);
      await removeWordIdFromUsedWordIds({
        sourceLangId: srcId,
        targetLangId: tgtId,
        level: selectedLevel,
        wordId: current.id,
      });
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
    if (!srcId || !tgtId) return null;
    const batch = await getDueReviewWordsBatch(
      srcId,
      tgtId,
      selectedLevel,
      5,
      sessionTimeRef.current
    );
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
    if (!srcId || !tgtId || !current) return;
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

    advanceReview(current.id, srcId, tgtId).catch(() => {});

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

  const hasProfile = !!srcId && !!tgtId;

  return (
    <View style={styles.container}>
      {!hasProfile ? (
        <Text style={styles.emptyText}>Wybierz profil w ustawieniach.</Text>
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
