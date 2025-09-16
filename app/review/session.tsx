import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSettings } from "@/src/contexts/SettingsContext";
import useSpellchecking from "@/src/hooks/useSpellchecking";
import {
  advanceReview,
  getRandomDueReviewWord,
  removeReview,
  scheduleReview,
} from "@/src/components/db/db";
import type { WordWithTranslations } from "@/src/types/boxes";
import { useStyles } from "@/src/screens/review/styles_review";
import { removeWordIdFromUsedWordIds } from "@/src/hooks/useBoxesPersistenceSnapshot";
import MyButton from "@/src/components/button/button";
import RotaryStack, {
  RotaryStackHandle,
} from "@/src/components/carousel/RotaryStack";

export default function ReviewSession() {
  const styles = useStyles();
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

  const srcId = activeProfile?.sourceLangId ?? null;
  const tgtId = activeProfile?.targetLangId ?? null;

  async function loadNext() {
    if (!srcId || !tgtId) {
      setCurrent(null);
      return;
    }
    setLoading(true);
    try {
      const next = await getRandomDueReviewWord(srcId, tgtId, selectedLevel);
      setCurrent(next);
    } finally {
      setAnswer("");
      setPromptState("neutral");
      setCorrectAnswer(null);
      setLoading(false);
    }
  }

  useEffect(() => {
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

  function onKeep() {
    if (!current || !srcId || !tgtId) return;
    setLoading(true);
    advanceReview(current.id, srcId, tgtId)
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        void loadNext();
      });
  }

  async function onReset() {
    if (!current || !srcId || !tgtId) return;
    setLoading(true);
    try {
      await removeReview(current.id, srcId, tgtId);
      await removeWordIdFromUsedWordIds({
        sourceLangId: srcId,
        targetLangId: tgtId,
        level: selectedLevel,
        wordId: current.id,
      });
    } finally {
      setLoading(false);
      void loadNext();
    }
  }

  const hasProfile = !!srcId && !!tgtId;

  return (
    <View style={styles.container}>
      {!hasProfile ? (
        <Text style={styles.emptyText}>Wybierz profil w ustawieniach.</Text>
      ) : loading ? (
        <ActivityIndicator />
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
              items={[
                current?.text ?? "—",
                "kolejny 1",
                "kolejny 2",
                "kolejny 3",
                "kolejny 4",
              ]}
              height={70}
            />
          </View>
          {/* <View
            style={[
              styles.promptBar,
              promptState === "correct" && styles.promptBarCorrect,
              promptState === "wrong" && styles.promptBarWrong,
            ]}
          >
            <Text
              style={[
                styles.promptText,
                promptState === "correct" && styles.promptTextCorrect,
                promptState === "wrong" && styles.promptTextWrong,
              ]}
            >
              {current.text}
            </Text>
            {promptState === "wrong" && (
              <Text style={[styles.promptText, styles.promptTextWrong]}>
                Poprawna odpowiedź: {correctAnswer ?? ""}
              </Text>
            )}
          </View> */}
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
            <MyButton
              text="ZRESETUJ"
              color="my_red"
              onPress={onReset}
              width={140}
            />

            <View style={{ gap: 10 }}>
              <MyButton
                text="SUBMIT"
                color="my_green"
                onPress={onSubmit}
                width={140}
              />
              <MyButton
                text="ZACHOWAJ"
                color="my_yellow"
                onPress={onKeep}
                width={140}
              />
              <MyButton
                text="KRĘĆ"
                color="my_green"
                onPress={() => carouselRef.current?.spin()}
                width={140}
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
