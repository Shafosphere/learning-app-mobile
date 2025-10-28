import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";

import { useSettings } from "@/src/contexts/SettingsContext";
import {
  getDueCustomReviewFlashcards,
  getDueReviewWordsBatch,
} from "@/src/db/sqlite/db";
import type { CustomReviewFlashcard } from "@/src/db/sqlite/db";
import type { WordWithTranslations } from "@/src/types/boxes";

import { useStyles } from "./MemoryGameScreen-styles";
import { getMemoryBoardLayout } from "@/src/constants/memoryGame";

const HIGHLIGHT_TIMEOUT_MS = 1500;
const RESULT_DELAY_MS = 500;

type MemoryCardFace = "term" | "translation";

type MemoryCardStatus =
  | "hidden"
  | "selected"
  | "matchPending"
  | "matched"
  | "mismatch";

type MemoryCard = {
  id: string;
  pairId: number;
  word: WordWithTranslations;
  face: MemoryCardFace;
  content: string;
  isFlipped: boolean;
  animation: Animated.Value;
  status: MemoryCardStatus;
};

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
    flipped: card.flipped,
  };
}

const getTermText = (word: WordWithTranslations) =>
  word.text?.trim().length ? word.text.trim() : word.translations[0] ?? "";

const getTranslationText = (word: WordWithTranslations) =>
  word.translations.find((value) => value.trim().length > 0) ?? word.text ?? "";

const createDeckForWords = (
  words: WordWithTranslations[],
  requiredPairs: number
): MemoryCard[] => {
  const chosen = words.slice(0, requiredPairs);
  const duplicated = chosen.flatMap((word) => [
    {
      id: `${word.id}-term`,
      pairId: word.id,
      word,
      face: "term" as const,
      content: getTermText(word) || "—",
      isFlipped: false,
      animation: new Animated.Value(0),
      status: "hidden" as const,
    },
    {
      id: `${word.id}-translation`,
      pairId: word.id,
      word,
      face: "translation" as const,
      content: getTranslationText(word) || "—",
      isFlipped: false,
      animation: new Animated.Value(0),
      status: "hidden" as const,
    },
  ]);

  return duplicated
    .map((card) => ({ ...card, sortKey: Math.random() }))
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ sortKey, ...card }) => card);
};

export default function MemoryGameScreen() {
  const {
    activeCourse,
    selectedLevel,
    activeCustomCourseId,
    colors,
    memoryBoardSize,
  } = useSettings();
  const styles = useStyles();

  const boardLayout = getMemoryBoardLayout(memoryBoardSize);
  const totalCards = boardLayout.columns * boardLayout.rows;
  const requiredPairs = totalCards / 2;
  const defaultFrontColor = colors.my_green;
  const defaultBackColor = colors.secondBackground;

  const [deck, setDeck] = useState<MemoryCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [_selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isResolving, setIsResolving] = useState(false);
  const resolveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultDelayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const deckRef = useRef<MemoryCard[]>([]);
  const selectedIdsRef = useRef<string[]>([]);

  const clearResolveTimeout = () => {
    if (resolveTimeoutRef.current) {
      clearTimeout(resolveTimeoutRef.current);
      resolveTimeoutRef.current = null;
    }
  };

  const clearResultDelayTimeout = () => {
    if (resultDelayTimeoutRef.current) {
      clearTimeout(resultDelayTimeoutRef.current);
      resultDelayTimeoutRef.current = null;
    }
  };

  const resetGameState = (nextDeck: MemoryCard[] = []) => {
    setDeck(nextDeck);
    setSelectedIds([]);
    selectedIdsRef.current = [];
    setIsResolving(false);
    clearResolveTimeout();
    clearResultDelayTimeout();
  };

  useEffect(() => {
    deckRef.current = deck;
  }, [deck]);

  useEffect(() => {
    return () => {
      clearResolveTimeout();
      clearResultDelayTimeout();
    };
  }, []);

  const evaluateSelection = (firstId: string, secondId: string) => {
    const firstCard = deckRef.current.find((card) => card.id === firstId);
    const secondCard = deckRef.current.find((card) => card.id === secondId);

    if (!firstCard || !secondCard) {
      selectedIdsRef.current = [];
      setSelectedIds([]);
      setIsResolving(false);
      return;
    }

    const isMatch =
      firstCard.pairId === secondCard.pairId && firstCard.id !== secondCard.id;

    const scheduleMatchResolution = () => {
      setDeck((prev) =>
        prev.map((card) => {
          if (card.id === firstId || card.id === secondId) {
            return { ...card, status: "matchPending" };
          }
          return card;
        })
      );

      clearResolveTimeout();
      resolveTimeoutRef.current = setTimeout(() => {
        setDeck((prev) =>
          prev.map((card) => {
            if (card.id === firstId || card.id === secondId) {
              if (card.isFlipped) {
                Animated.timing(card.animation, {
                  toValue: 0,
                  duration: 600,
                  useNativeDriver: false,
                }).start();
              }
              return { ...card, isFlipped: false, status: "matched" };
            }
            return card;
          })
        );
        selectedIdsRef.current = [];
        setSelectedIds([]);
        setIsResolving(false);
        resolveTimeoutRef.current = null;
      }, HIGHLIGHT_TIMEOUT_MS);
    };

    const scheduleMismatchResolution = () => {
      setDeck((prev) =>
        prev.map((card) => {
          if (card.id === firstId || card.id === secondId) {
            return { ...card, status: "mismatch" };
          }
          return card;
        })
      );

      clearResolveTimeout();
      resolveTimeoutRef.current = setTimeout(() => {
        setDeck((prev) =>
          prev.map((card) => {
            if (card.id === firstId || card.id === secondId) {
              if (card.isFlipped) {
                Animated.timing(card.animation, {
                  toValue: 0,
                  duration: 600,
                  useNativeDriver: false,
                }).start();
              }
              return { ...card, isFlipped: false, status: "hidden" };
            }
            return card;
          })
        );
        selectedIdsRef.current = [];
        setSelectedIds([]);
        setIsResolving(false);
        resolveTimeoutRef.current = null;
      }, HIGHLIGHT_TIMEOUT_MS);
    };

    clearResultDelayTimeout();
    if (isMatch) {
      resultDelayTimeoutRef.current = setTimeout(() => {
        scheduleMatchResolution();
        resultDelayTimeoutRef.current = null;
      }, RESULT_DELAY_MS);
    } else {
      scheduleMismatchResolution();
    }
  };

  const isCustomMode = activeCustomCourseId != null;
  const srcId = activeCourse?.sourceLangId ?? null;
  const tgtId = activeCourse?.targetLangId ?? null;

  useEffect(() => {
    let mounted = true;

    const loadWords = async () => {
      if (!isCustomMode && (!srcId || !tgtId || !selectedLevel)) {
        if (mounted) resetGameState([]);
        return;
      }

      if (isCustomMode && activeCustomCourseId == null) {
        if (mounted) resetGameState([]);
        return;
      }

      setLoading(true);
      try {
        const now = Date.now();
        let words: WordWithTranslations[] = [];

        if (isCustomMode && activeCustomCourseId != null) {
          const rows = await getDueCustomReviewFlashcards(
            activeCustomCourseId,
            requiredPairs,
            now
          );
          words = rows.map(mapCustomReviewToWord);
        } else if (srcId && tgtId && selectedLevel) {
          words = await getDueReviewWordsBatch(
            srcId,
            tgtId,
            selectedLevel,
            requiredPairs,
            now
          );
        }

        if (mounted) {
          const nextDeck = createDeckForWords(words, requiredPairs);
          resetGameState(nextDeck);
        }
      } catch {
        if (mounted) resetGameState([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadWords();

    return () => {
      mounted = false;
    };
  }, [
    activeCustomCourseId,
    isCustomMode,
    memoryBoardSize,
    requiredPairs,
    selectedLevel,
    srcId,
    tgtId,
  ]);

  const handleCardPress = (id: string) => {
    if (loading || isResolving) return;
    if (selectedIdsRef.current.includes(id)) return;

    const targetCard = deckRef.current.find((card) => card.id === id);
    if (
      !targetCard ||
      targetCard.isFlipped ||
      targetCard.status === "matchPending" ||
      targetCard.status === "matched"
    ) {
      return;
    }

    Animated.timing(targetCard.animation, {
      toValue: 180,
      duration: 600,
      useNativeDriver: false,
    }).start();

    const isSecondSelection = selectedIdsRef.current.length === 1;
    const firstSelectedId = selectedIdsRef.current[0];
    const firstSelectedCard = isSecondSelection
      ? deckRef.current.find((card) => card.id === firstSelectedId)
      : null;
    const willBeMatch =
      isSecondSelection &&
      firstSelectedCard != null &&
      firstSelectedCard.pairId === targetCard.pairId &&
      firstSelectedCard.id !== targetCard.id;

    setDeck((prev) =>
      prev.map((card) => {
        if (card.id !== id) return card;
        const nextStatus = isSecondSelection
          ? willBeMatch
            ? "selected"
            : "mismatch"
          : "selected";
        return { ...card, isFlipped: true, status: nextStatus };
      })
    );

    setSelectedIds((prev) => {
      const next = [...prev, id];
      selectedIdsRef.current = next;
      if (next.length === 2) {
        setIsResolving(true);
        evaluateSelection(next[0], next[1]);
      }
      return next;
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Memory Game</Text>
      {!isCustomMode && selectedLevel ? (
        <Text style={styles.subtitle}>Poziom: {selectedLevel}</Text>
      ) : null}

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#70a1ff" />
        </View>
      ) : deck.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Brak słówek do gry</Text>
        </View>
      ) : (
        <FlatList
          data={deck}
          keyExtractor={(item) => item.id}
          numColumns={boardLayout.columns}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          scrollEnabled={false}
          renderItem={({ item }) => {
            const frontAnimatedStyle = {
              transform: [
                { perspective: 1000 },
                {
                  rotateY: item.animation.interpolate({
                    inputRange: [0, 90, 180],
                    outputRange: ["180deg", "270deg", "360deg"],
                  }),
                },
              ],
            };

            const backAnimatedStyle = {
              transform: [
                { perspective: 1000 },
                {
                  rotateY: item.animation.interpolate({
                    inputRange: [0, 90, 180],
                    outputRange: ["0deg", "90deg", "180deg"],
                  }),
                },
              ],
            };

            const highlightColor =
              item.status === "selected"
                ? colors.my_yellow
                : item.status === "matchPending" || item.status === "matched"
                ? colors.my_green
                : item.status === "mismatch"
                ? colors.my_red
                : null;

            const frontBackgroundColor = highlightColor ?? defaultFrontColor;
            const backBackgroundColor =
              item.status === "matched" || item.status === "matchPending"
                ? colors.my_green
                : item.status === "selected"
                ? colors.my_yellow
                : item.status === "mismatch"
                ? colors.my_red
                : defaultBackColor;

            const frontTextColor =
              item.status === "selected"
                ? colors.headline
                : colors.secondBackground;

            const isCardDisabled =
              loading ||
              isResolving ||
              item.status === "matched" ||
              item.status === "matchPending" ||
              item.isFlipped;

            return (
              <Pressable
                style={styles.card}
                onPress={() => handleCardPress(item.id)}
                disabled={isCardDisabled}
              >
                <View style={styles.cardInner}>
                  <Animated.View
                    style={[
                      styles.cardFace,
                      { backgroundColor: frontBackgroundColor },
                      frontAnimatedStyle,
                    ]}
                  >
                    <Text
                      style={[styles.cardFrontLabel, { color: frontTextColor }]}
                    >
                      {item.content}
                    </Text>
                  </Animated.View>

                  <Animated.View
                    style={[
                      styles.cardFace,
                      { backgroundColor: backBackgroundColor },
                      backAnimatedStyle,
                    ]}
                  >
                  </Animated.View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
