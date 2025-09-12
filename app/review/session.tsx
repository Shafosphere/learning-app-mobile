import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
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

export default function ReviewSession() {
  const styles = useStyles();
  const router = useRouter();
  const { activeProfile, selectedLevel } = useSettings();
  const checkSpelling = useSpellchecking();

  const [current, setCurrent] = useState<WordWithTranslations | null>(null);
  const [answer, setAnswer] = useState("");
  const [showCorrection, setShowCorrection] = useState(false);
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
      setShowCorrection(false);
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
      setLoading(true);
      advanceReview(current.id, srcId, tgtId)
        .catch(() => {})
        .finally(() => {
          setLoading(false);
          void loadNext();
        });
    } else {
      setShowCorrection(true);
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
          <Pressable
            onPress={() => router.back()}
            style={[styles.baseBtn, styles.keepBtn]}
          >
            <Text style={styles.btnText}>WRÓĆ</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {showCorrection && (
            <Text style={styles.correctionText}>
              Poprawna odpowiedź: {current.translations[0] ?? ""}
            </Text>
          )}
          <View style={styles.promptBar}>
            <Text style={styles.promptText}>{current.text}</Text>
          </View>
          <TextInput
            style={styles.answerInput}
            placeholder="Twoja odpowiedź"
            value={answer}
            onChangeText={setAnswer}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={onSubmit}
          />
          <View style={styles.buttonRow}>
            <Pressable
              onPress={onReset}
              style={[styles.baseBtn, styles.resetBtn]}
            >
              <Text style={styles.btnText}>ZRESETUJ</Text>
            </Pressable>
            <Pressable
              onPress={onSubmit}
              style={[styles.baseBtn, styles.submitBtn]}
            >
              <Text style={styles.btnText}>SUBMIT</Text>
            </Pressable>
            <Pressable
              onPress={onKeep}
              style={[styles.baseBtn, styles.keepBtn]}
            >
              <Text style={styles.btnText}>ZACHOWAJ</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}
