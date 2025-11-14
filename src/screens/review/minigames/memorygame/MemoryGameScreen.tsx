import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";
import { useSettings } from "@/src/contexts/SettingsContext";
import {
  getDueCustomReviewFlashcards,
  getDueReviewWordsBatch,
} from "@/src/db/sqlite/db";
import type { CustomReviewFlashcard } from "@/src/db/sqlite/db";
import type { WordWithTranslations } from "@/src/types/boxes";

import { useStyles } from "./MemoryGameScreen-styles";
import { MinigameLayout } from "../components/MinigameLayout";
import {
  completeSessionStep,
  getSessionStep,
} from "@/src/screens/review/minigames/sessionStore";
import { getRouteForStep } from "@/src/screens/review/minigames/sessionNavigation";
import type { SanitizedWord } from "@/src/screens/review/brain/minigame-generators";
import { playFeedbackSound } from "@/src/utils/soundPlayer";

const CARD_FLIP_DURATION_MS = 400;
const RESULT_DELAY_MS = 900;
const INITIAL_PREVIEW_DURATION_MS = 5000;
const ROUND_PREVIEW_DURATION_MS = 3000;
const TWO_PAIR_PREVIEW_DURATION_MS = 2000;
const POST_RESULT_PAUSE_MS = 700;

const boardLayout = {
  columns: 2,
  rows: 4,
} as const;

const HEADING_TITLE = "Memory Game";

type MemoryCardFace = "term" | "translation";

type MemoryCardStatus =
  | "hidden"
  | "preview"
  | "previewClosing"
  | "selected"
  | "matched"
  | "failed";

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

type MemoryPlaceholder = {
  id: string;
  placeholder: true;
};

type MemoryListItem = MemoryCard | MemoryPlaceholder;

type MemoryGameParams = {
  sessionId?: string | string[];
  stepId?: string | string[];
};

const extractSingleParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

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
  const { activeCourse, selectedLevel, activeCustomCourseId, colors } =
    useSettings();
  const params = useLocalSearchParams<MemoryGameParams>();
  const router = useRouter();
  const styles = useStyles();

  const totalSlots = boardLayout.columns * boardLayout.rows;
  const requiredPairs = Math.floor(totalSlots / 2);
  const defaultFrontColor = colors.my_green;
  const defaultBackColor = colors.secondBackground;

  const [deck, setDeck] = useState<MemoryCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const resultDelayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const postResultTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const hasShownTwoPairPreviewRef = useRef(false);
  const deckRef = useRef<MemoryCard[]>([]);
  const selectedIdsRef = useRef<string[]>([]);
  const isMountedRef = useRef(true);
  const [hasSubmittedResult, setHasSubmittedResult] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [isReadyScreenVisible, setIsReadyScreenVisible] = useState(false);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

  const commitDeckUpdate = useCallback(
    (
      updater: MemoryCard[] | ((previous: MemoryCard[]) => MemoryCard[])
    ): MemoryCard[] => {
      let nextDeck = deckRef.current;
      setDeck((previous) => {
        nextDeck = typeof updater === "function" ? updater(previous) : updater;
        deckRef.current = nextDeck;
        return nextDeck;
      });
      return nextDeck;
    },
    []
  );

  const sessionIdParam = extractSingleParam(params.sessionId);
  const stepIdParam = extractSingleParam(params.stepId);

  const sessionId =
    typeof sessionIdParam === "string" && sessionIdParam.length > 0
      ? sessionIdParam
      : null;
  const stepId =
    typeof stepIdParam === "string" && stepIdParam.length > 0
      ? stepIdParam
      : null;

  const sessionStep = useMemo(() => {
    if (!sessionId || !stepId) {
      return null;
    }

    const step = getSessionStep(sessionId, stepId);
    return step && step.type === "memory" ? step : null;
  }, [sessionId, stepId]);

  const isSessionMode = sessionStep != null;

  const clearResultDelayTimeout = () => {
    if (resultDelayTimeoutRef.current) {
      clearTimeout(resultDelayTimeoutRef.current);
      resultDelayTimeoutRef.current = null;
    }
  };

  const clearPreviewTimeout = () => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }
  };

  const clearPreviewCloseTimeout = () => {
    if (previewCloseTimeoutRef.current) {
      clearTimeout(previewCloseTimeoutRef.current);
      previewCloseTimeoutRef.current = null;
    }
  };

  const clearPostResultTimeout = () => {
    if (postResultTimeoutRef.current) {
      clearTimeout(postResultTimeoutRef.current);
      postResultTimeoutRef.current = null;
    }
  };

  const resetGameState = useCallback(
    (nextDeck: MemoryCard[] = []) => {
      commitDeckUpdate(nextDeck);
      selectedIdsRef.current = [];
      setIsResolving(false);
      setHasSubmittedResult(false);
      setGameStarted(false);
      setIsPreviewVisible(false);
      setIsReadyScreenVisible(nextDeck.length > 0);
      clearResultDelayTimeout();
      clearPreviewTimeout();
      clearPreviewCloseTimeout();
      clearPostResultTimeout();
      hasShownTwoPairPreviewRef.current = false;
    },
    [commitDeckUpdate]
  );

  const countActivePairs = useCallback(
    (cards: MemoryCard[] = deckRef.current) => {
      const active = new Set<number>();
      cards.forEach((card) => {
        if (
          card.status === "hidden" ||
          card.status === "preview" ||
          card.status === "previewClosing" ||
          card.status === "selected"
        ) {
          active.add(card.pairId);
        }
      });
      return active.size;
    },
    []
  );

  const revealActiveCards = useCallback(
    (durationMs: number, onComplete?: () => void) => {
      const hasCardsToReveal = deckRef.current.some(
        (card) => card.status === "hidden"
      );
      if (!hasCardsToReveal) {
        onComplete?.();
        return;
      }

      setIsPreviewVisible(true);

      commitDeckUpdate((previous) =>
        previous.map((card) => {
          if (card.status !== "hidden") {
            return card;
          }

          if (!card.isFlipped) {
            Animated.timing(card.animation, {
              toValue: 180,
              duration: CARD_FLIP_DURATION_MS,
              useNativeDriver: false,
            }).start();
          }

          return {
            ...card,
            isFlipped: true,
            status: "preview" as const,
          };
        })
      );

      clearPreviewTimeout();
      clearPreviewCloseTimeout();
      previewTimeoutRef.current = setTimeout(() => {
        setIsPreviewVisible(false);

        commitDeckUpdate((previous) =>
          previous.map((card) => {
            if (card.status !== "preview") {
              return card;
            }

            Animated.timing(card.animation, {
              toValue: 0,
              duration: CARD_FLIP_DURATION_MS,
              useNativeDriver: false,
            }).start();

            return {
              ...card,
              status: "previewClosing" as const,
            };
          })
        );

        previewCloseTimeoutRef.current = setTimeout(() => {
          commitDeckUpdate((previous) =>
            previous.map((card) =>
              card.status === "previewClosing"
                ? { ...card, isFlipped: false, status: "hidden" as const }
                : card
            )
          );
          previewCloseTimeoutRef.current = null;
          onComplete?.();
        }, CARD_FLIP_DURATION_MS);
        previewTimeoutRef.current = null;
      }, durationMs);
    },
    [commitDeckUpdate]
  );

  const handlePostResolution = useCallback(
    (nextDeck: MemoryCard[]) => {
      selectedIdsRef.current = [];
      clearPostResultTimeout();

      const remainingPairs = countActivePairs(nextDeck);
      const shouldStandardPreview = gameStarted && remainingPairs > 2;
      const shouldTwoPairPreview =
        gameStarted &&
        remainingPairs === 2 &&
        !hasShownTwoPairPreviewRef.current;

      const previewDuration = shouldStandardPreview
        ? ROUND_PREVIEW_DURATION_MS
        : shouldTwoPairPreview
        ? TWO_PAIR_PREVIEW_DURATION_MS
        : null;

      setIsResolving(true);

      const releaseInteraction = () => {
        setIsResolving(false);
        postResultTimeoutRef.current = null;
      };

      postResultTimeoutRef.current = setTimeout(() => {
        if (previewDuration != null) {
          if (shouldTwoPairPreview) {
            hasShownTwoPairPreviewRef.current = true;
          }
          revealActiveCards(previewDuration, releaseInteraction);
        } else {
          releaseInteraction();
        }
      }, POST_RESULT_PAUSE_MS);
    },
    [countActivePairs, gameStarted, revealActiveCards]
  );

  const handleStartGame = useCallback(() => {
    if (deckRef.current.length === 0 || isPreviewVisible) {
      return;
    }

    setIsReadyScreenVisible(false);
    setGameStarted(true);
    revealActiveCards(INITIAL_PREVIEW_DURATION_MS);
  }, [isPreviewVisible, revealActiveCards]);

  const buildSessionDeck = useCallback(
    (words: SanitizedWord[]): MemoryCard[] => {
      const mapped: WordWithTranslations[] = words.map((word) => ({
        id: word.id,
        text: word.term,
        translations: word.translations,
        flipped: false,
      }));

      const pairs = Math.min(requiredPairs, mapped.length);
      return createDeckForWords(mapped, pairs);
    },
    [requiredPairs]
  );

  useEffect(() => {
    deckRef.current = deck;
  }, [deck]);

  const allResolved = useMemo(
    () =>
      deck.length > 0 &&
      deck.every(
        (card) => card.status === "matched" || card.status === "failed"
      ),
    [deck]
  );
  const hasFailedPairs = useMemo(
    () => deck.some((card) => card.status === "failed"),
    [deck]
  );
  const footerResultStatus =
    isSessionMode && allResolved
      ? hasFailedPairs
        ? ("incorrect" as const)
        : ("correct" as const)
      : null;

  useEffect(() => {
    return () => {
      clearResultDelayTimeout();
      clearPreviewTimeout();
      clearPreviewCloseTimeout();
      clearPostResultTimeout();
    };
  }, []);

  const evaluateSelection = (firstId: string, secondId: string) => {
    const firstCard = deckRef.current.find((card) => card.id === firstId);
    const secondCard = deckRef.current.find((card) => card.id === secondId);

    if (!firstCard || !secondCard) {
      selectedIdsRef.current = [];
      setIsResolving(false);
      return;
    }

    const isMatch =
      firstCard.pairId === secondCard.pairId && firstCard.id !== secondCard.id;

    clearResultDelayTimeout();
    resultDelayTimeoutRef.current = setTimeout(() => {
      if (isMatch) {
        playFeedbackSound(true);
        const nextDeck = deckRef.current.map((card) => {
          if (card.id === firstId || card.id === secondId) {
            if (!card.isFlipped) {
              Animated.timing(card.animation, {
                toValue: 180,
                duration: CARD_FLIP_DURATION_MS,
                useNativeDriver: false,
              }).start();
            }
            return { ...card, isFlipped: true, status: "matched" as const };
          }
          return card;
        });

        commitDeckUpdate(nextDeck);
        handlePostResolution(nextDeck);
      } else {
        playFeedbackSound(false);
        const partnerCard = deckRef.current.find(
          (card) => card.pairId === firstCard.pairId && card.id !== firstCard.id
        );

        const nextDeck = deckRef.current.map((card) => {
          if (card.id === firstCard.id || card.id === partnerCard?.id) {
            if (!card.isFlipped) {
              Animated.timing(card.animation, {
                toValue: 180,
                duration: CARD_FLIP_DURATION_MS,
                useNativeDriver: false,
              }).start();
            }
            return { ...card, isFlipped: true, status: "failed" as const };
          }

          if (card.id === secondCard.id) {
            Animated.timing(card.animation, {
              toValue: 0,
              duration: CARD_FLIP_DURATION_MS,
              useNativeDriver: false,
            }).start();
            return { ...card, isFlipped: false, status: "hidden" as const };
          }

          return card;
        });

        commitDeckUpdate(nextDeck);
        handlePostResolution(nextDeck);
      }

      resultDelayTimeoutRef.current = null;
    }, RESULT_DELAY_MS);
  };

  const isCustomMode = activeCustomCourseId != null;
  const srcId = activeCourse?.sourceLangId ?? null;
  const tgtId = activeCourse?.targetLangId ?? null;

  const loadWords = useCallback(async () => {
    if (!isMountedRef.current) {
      return;
    }

    if (!isCustomMode && (!srcId || !tgtId || !selectedLevel)) {
      if (isMountedRef.current) {
        resetGameState([]);
      }
      return;
    }

    if (isCustomMode && activeCustomCourseId == null) {
      if (isMountedRef.current) {
        resetGameState([]);
      }
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

      if (!isMountedRef.current) {
        return;
      }

      const nextDeck = createDeckForWords(words, requiredPairs);
      resetGameState(nextDeck);
    } catch {
      if (isMountedRef.current) {
        resetGameState([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [
    activeCustomCourseId,
    isCustomMode,
    requiredPairs,
    selectedLevel,
    srcId,
    tgtId,
    resetGameState,
  ]);

  useEffect(() => {
    isMountedRef.current = true;

    if (isSessionMode && sessionStep) {
      const nextDeck = buildSessionDeck(sessionStep.words);
      resetGameState(nextDeck);
      setLoading(false);
    } else if (!isSessionMode) {
      void loadWords();
    } else {
      resetGameState([]);
      setLoading(false);
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [buildSessionDeck, isSessionMode, loadWords, resetGameState, sessionStep]);

  const handleContinue = useCallback(() => {
    if (!isSessionMode || !sessionStep || !sessionId) {
      router.replace("/review/brain");
      return;
    }

    if (!allResolved || hasSubmittedResult) {
      return;
    }

    setHasSubmittedResult(true);

    const pairResults = new Map<number, "correct" | "incorrect">();
    deckRef.current.forEach((card) => {
      if (card.status === "matched") {
        pairResults.set(card.pairId, "correct");
      } else if (card.status === "failed" && !pairResults.has(card.pairId)) {
        pairResults.set(card.pairId, "incorrect");
      }
    });

    const updates = sessionStep.wordIds.map((wordId) => ({
      wordId,
      status: pairResults.get(wordId) ?? ("incorrect" as const),
    }));

    const nextStep = completeSessionStep(sessionId, sessionStep.id, updates);

    if (nextStep) {
      const route = getRouteForStep(nextStep);
      const nextHref = `${route}?sessionId=${encodeURIComponent(
        sessionId
      )}&stepId=${encodeURIComponent(nextStep.id)}`;
      router.replace(nextHref as never);
    } else {
      router.replace("/review/brain");
    }
  }, [
    allResolved,
    hasSubmittedResult,
    isSessionMode,
    router,
    sessionId,
    sessionStep,
  ]);

  const handleCardPress = (id: string) => {
    if (
      loading ||
      isResolving ||
      isPreviewVisible ||
      !gameStarted ||
      selectedIdsRef.current.includes(id)
    ) {
      return;
    }

    const targetCard = deckRef.current.find((card) => card.id === id);
    if (
      !targetCard ||
      targetCard.status === "matched" ||
      targetCard.status === "failed" ||
      targetCard.status === "preview" ||
      targetCard.status === "previewClosing"
    ) {
      return;
    }

    Animated.timing(targetCard.animation, {
      toValue: 180,
      duration: CARD_FLIP_DURATION_MS,
      useNativeDriver: false,
    }).start();

    commitDeckUpdate((previous) =>
      previous.map((card) =>
        card.id === id
          ? { ...card, isFlipped: true, status: "selected" as const }
          : card
      )
    );

    const next = [...selectedIdsRef.current, id];
    selectedIdsRef.current = next;

    if (next.length === 2) {
      setIsResolving(true);
      evaluateSelection(next[0], next[1]);
    }
  };

  const placeholdersNeeded =
    deck.length > 0 ? Math.max(0, totalSlots - deck.length) : 0;
  const listData: MemoryListItem[] =
    placeholdersNeeded > 0
      ? [
          ...deck,
          ...Array.from({ length: placeholdersNeeded }, (_, index) => ({
            id: `placeholder-${index}`,
            placeholder: true as const,
          })),
        ]
      : deck;

  type FooterActions = NonNullable<
    React.ComponentProps<typeof MinigameLayout>["footerActions"]
  >;
  const footerActions: FooterActions = [];

  if (isSessionMode) {
    footerActions.push({
      key: "continue",
      text: "Dalej",
      color: allResolved ? "my_green" : "border",
      onPress: handleContinue,
      disabled: !allResolved || hasSubmittedResult,
      width: 120,
      accessibilityLabel: "Przejdź do kolejnej minigry",
    });
  }

  const showReadyScreen =
    !loading && deck.length > 0 && isReadyScreenVisible && !gameStarted;

  const startAction: FooterActions[number] = {
    key: "start",
    text: "Start",
    color: "my_green",
    onPress: handleStartGame,
    width: 140,
    accessibilityLabel: "Rozpocznij grę memory",
  };

  const layoutFooterActions = showReadyScreen ? [startAction] : footerActions;

  return (
    <MinigameLayout
      contentStyle={styles.container}
      footerActions={layoutFooterActions}
      headingTitle={HEADING_TITLE}
      footerResultStatus={footerResultStatus}
    >
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#70a1ff" />
        </View>
      ) : deck.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Brak słówek do gry</Text>
        </View>
      ) : showReadyScreen ? (
        <View style={styles.readyState}>
          <Text style={styles.readyTitle}>Przygotuj się</Text>
          <Text style={styles.readyDescription}>
            Zobaczysz wszystkie karty przez 5 sekund. Trafiaj w poprawne pary od
            razu — każda pomyłka blokuje dane słówko.
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={listData}
            keyExtractor={(item) => item.id}
            numColumns={boardLayout.columns}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.row}
            scrollEnabled={false}
            renderItem={({ item }) => {
              if ("placeholder" in item) {
                return (
                  <View
                    style={[styles.card, styles.placeholderCard]}
                    pointerEvents="none"
                    accessible={false}
                  />
                );
              }

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
                  : item.status === "matched"
                  ? colors.my_green
                  : item.status === "failed"
                  ? colors.my_red
                  : null;

              const frontBackgroundColor =
                item.status === "preview" || item.status === "previewClosing"
                  ? colors.secondBackground
                  : highlightColor ?? defaultFrontColor;
              const backBackgroundColor =
                item.status === "matched"
                  ? colors.my_green
                  : item.status === "selected"
                  ? colors.my_yellow
                  : item.status === "failed"
                  ? colors.my_red
                  : defaultBackColor;

              const frontTextColor =
                item.status === "hidden"
                  ? colors.secondBackground
                  : colors.headline;

              const isCardDisabled =
                loading ||
                isResolving ||
                isPreviewVisible ||
                !gameStarted ||
                item.status === "matched" ||
                item.status === "failed" ||
                item.status === "preview" ||
                item.status === "previewClosing";

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
                        style={[
                          styles.cardFrontLabel,
                          { color: frontTextColor },
                        ]}
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
                    ></Animated.View>
                  </View>
                </Pressable>
              );
            }}
          />
        </>
      )}
    </MinigameLayout>
  );
}
