import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";

import { useLocalSearchParams } from "expo-router";
import BoxesCarousel from "@/src/components/Box/Carousel/BoxCarousel";
import Boxes from "@/src/components/Box/List/BoxList";
import Card from "@/src/components/card/card";
import { DEFAULT_FLASHCARDS_BATCH_SIZE } from "@/src/config/appConfig";
import { useSettings } from "@/src/contexts/SettingsContext";
import {
  advanceCustomReview,
  getDueCustomReviewFlashcards,
  scheduleCustomReview,
  type CustomReviewFlashcard,
} from "@/src/db/sqlite/db";
import { BoxesState, WordWithTranslations } from "@/src/types/boxes";
import { stripDiacritics } from "@/src/utils/diacritics";
import { useStyles } from "@/src/screens/flashcards/FlashcardsScreen-styles";

const NON_INTRO_BOXES: readonly (keyof BoxesState)[] = [
  "boxOne",
  "boxTwo",
  "boxThree",
  "boxFour",
  "boxFive",
];

const createEmptyBoxes = (): BoxesState => ({
  boxZero: [],
  boxOne: [],
  boxTwo: [],
  boxThree: [],
  boxFour: [],
  boxFive: [],
});

const stageToBox = (stage?: number): keyof BoxesState => {
  const value = typeof stage === "number" ? stage : 1;
  const clamped = Math.max(0, Math.min(value, 5));
  // Stage 0 (immediate) trafia tutaj do boxOne, bo boxZero jest ukryty na tym ekranie.
  if (clamped <= 1) return "boxOne";
  if (clamped === 2) return "boxTwo";
  if (clamped === 3) return "boxThree";
  if (clamped === 4) return "boxFour";
  return "boxFive";
};

const boxToStage = (box: keyof BoxesState | null | undefined): number => {
  switch (box) {
    case "boxZero":
      return 0;
    case "boxOne":
      return 1;
    case "boxTwo":
      return 2;
    case "boxThree":
      return 3;
    case "boxFour":
      return 4;
    case "boxFive":
      return 5;
    default:
      return 1;
  }
};

const distributeByStage = (words: WordWithTranslations[]): BoxesState => {
  const next = createEmptyBoxes();
  for (const word of words) {
    const box = stageToBox(word.stage);
    next[box].push(word);
  }
  return next;
};

const findFirstActiveBox = (boxes: BoxesState): keyof BoxesState | null => {
  for (const box of NON_INTRO_BOXES) {
    if ((boxes[box] ?? []).length > 0) {
      return box;
    }
  }
  return null;
};

// Lightweight placeholder: keeps UI pieces but no data fetching or persistence.
export default function ReviewFlashcardsPlaceholder() {
  const styles = useStyles();
  const params = useLocalSearchParams<{ courseId?: string }>();
  const { ignoreDiacriticsInSpellcheck } = useSettings();
  const courseId = useMemo(() => {
    const id = params?.courseId;
    const num = typeof id === "string" ? Number(id) : Array.isArray(id) ? Number(id[0]) : NaN;
    return Number.isFinite(num) ? num : null;
  }, [params?.courseId]);
  const [boxes, setBoxes] = useState<BoxesState>(() => createEmptyBoxes());
  const [activeBox, setActiveBox] = useState<keyof BoxesState | null>("boxOne");
  const [layout] = useState<"classic" | "carousel">("classic");
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const scheduledTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearScheduledTimers = useCallback(() => {
    const timers = scheduledTimersRef.current;
    timers.forEach((timer) => {
      if (timer) clearTimeout(timer);
    });
    timers.clear();
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
  }, []);

  const scheduleReturnToBox = useCallback(
    (card: WordWithTranslations, nextStage: number, nextReview: number) => {
      const targetBox = stageToBox(nextStage);
      const delay = Math.max(0, nextReview - Date.now());
      const timers = scheduledTimersRef.current;

      if (timers.has(card.id)) {
        clearTimeout(timers.get(card.id)!);
        timers.delete(card.id);
      }

      const requeue = () => {
        timers.delete(card.id);
        const updatedCard: WordWithTranslations = {
          ...card,
          stage: nextStage,
          nextReview,
        };

        setBoxes((prev) => {
          const existing = prev[targetBox]?.some((item) => item.id === card.id);
          if (existing) return prev;
          const updatedTarget = [...(prev[targetBox] ?? []), updatedCard];
          return {
            ...prev,
            [targetBox]: updatedTarget,
          };
        });
        setActiveBox((current) => current ?? targetBox);
      };

      if (delay <= 0) {
        requeue();
        return;
      }

      const timer = setTimeout(requeue, delay);
      timers.set(card.id, timer);
    },
    []
  );

  useEffect(() => {
    return () => {
      clearScheduledTimers();
    };
  }, [clearScheduledTimers]);

  useEffect(() => {
    let cancelled = false;
    clearScheduledTimers();

    if (!courseId) {
      setBoxes(createEmptyBoxes());
      setActiveBox(null);
      return;
    }
    setIsLoading(true);
    void getDueCustomReviewFlashcards(courseId, DEFAULT_FLASHCARDS_BATCH_SIZE)
      .then((cards) => {
        if (cancelled) return;
        const mapped = cards.map(mapReviewCardToWord);
        const nextBoxes = distributeByStage(mapped);
        setBoxes(nextBoxes);
        setActiveBox(findFirstActiveBox(nextBoxes));
      })
      .catch((err) => {
        console.error("Failed to load review flashcards", err);
        if (cancelled) return;
        setBoxes(createEmptyBoxes());
        setActiveBox(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clearScheduledTimers, courseId]);

  const handleSelectBox = (box: keyof BoxesState) => {
    setActiveBox(box);
  };

  const selectedItem = useMemo<WordWithTranslations | null>(() => {
    if (!activeBox) return null;
    const list = boxes[activeBox] ?? [];
    return list[0] ?? null;
  }, [activeBox, boxes]);

  const reversed = selectedItem?.flipped ?? false;

  const normalize = (value: string | undefined | null) => {
    const raw = (value ?? "").trim().toLowerCase();
    if (!ignoreDiacriticsInSpellcheck) return raw;
    return stripDiacritics(raw);
  };

  useEffect(() => {
    setResult(null);
    setAnswer("");
  }, [selectedItem?.id]);

  const handleConfirm = () => {
    if (!selectedItem || !activeBox || !courseId) return;
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    const userAnswer = normalize(answer);
    const expectedTranslations = (selectedItem.translations ?? []).map(normalize).filter(Boolean);
    const expectedFront = normalize(selectedItem.text);
    const ok = reversed
      ? userAnswer.length > 0 && userAnswer === expectedFront
      : userAnswer.length > 0 && expectedTranslations.includes(userAnswer);

    setResult(ok);
    const reset = () => {
      setAnswer("");
      setResult(null);
    };

    const currentStage = selectedItem.stage ?? boxToStage(activeBox);

    if (!ok) {
      void (async () => {
        try {
          const { stage: demotedStage, nextReview } = await scheduleCustomReview(selectedItem.id, courseId, 1);
          const baseCard: WordWithTranslations = { ...selectedItem, stage: currentStage };
          scheduleReturnToBox(baseCard, demotedStage, nextReview);
        } catch (error) {
          console.error("Failed to demote custom review", error);
          setBoxes((prev) => {
            const current = prev[activeBox] ?? [];
            if (current.some((item) => item.id === selectedItem.id)) {
              return prev;
            }
            return {
              ...prev,
              [activeBox]: [selectedItem, ...current],
            };
          });
          setActiveBox((current) => current ?? activeBox);
        }
      })();

      transitionTimerRef.current = setTimeout(() => {
        setBoxes((prev) => {
          const current = prev[activeBox] ?? [];
          const remaining = current.filter((item) => item.id !== selectedItem.id);
          const nextState: BoxesState = {
            ...prev,
            [activeBox]: remaining,
          };

          if (remaining.length === 0) {
            const nextActive = findFirstActiveBox(nextState);
            if (nextActive !== activeBox) {
              setActiveBox(nextActive);
            }
          }

          return nextState;
        });
        reset();
        transitionTimerRef.current = null;
      }, 1500);
      return;
    }

    void (async () => {
      try {
        const { stage: nextStage, nextReview } = await advanceCustomReview(selectedItem.id, courseId);
        const baseCard: WordWithTranslations = { ...selectedItem, stage: currentStage };
        scheduleReturnToBox(baseCard, nextStage, nextReview);
      } catch (error) {
        console.error("Failed to advance custom review", error);
        setBoxes((prev) => {
          const current = prev[activeBox] ?? [];
          if (current.some((item) => item.id === selectedItem.id)) {
            return prev;
          }
          return {
            ...prev,
            [activeBox]: [selectedItem, ...current],
          };
        });
        setActiveBox((current) => current ?? activeBox);
      }
    })();

    transitionTimerRef.current = setTimeout(() => {
      setBoxes((prev) => {
        const current = prev[activeBox] ?? [];
        const remaining = current.filter((item) => item.id !== selectedItem.id);
        const nextState: BoxesState = {
          ...prev,
          [activeBox]: remaining,
        };

        if (remaining.length === 0) {
          const nextActive = findFirstActiveBox(nextState);
          if (nextActive !== activeBox) {
            setActiveBox(nextActive);
          }
        }

        return nextState;
      });
      reset();
      transitionTimerRef.current = null;
    }, 1500);
  };

  return (
    <View style={styles.container}>
      <Card
        selectedItem={selectedItem}
        setAnswer={setAnswer}
        answer={answer}
        result={result}
        confirm={handleConfirm}
        reversed={reversed}
        setResult={setResult}
        correction={null}
        wrongInputChange={(_which, _value) => undefined}
        setCorrectionRewers={() => undefined}
        onDownload={async () => {}}
        downloadDisabled
        introMode={false}
        onHintUpdate={() => undefined}
        hideActions={false}
        isFocused={!isLoading}
      />

      <View style={styles.boxesWrapper}>
        {layout === "classic" ? (
          <Boxes
            boxes={boxes}
            activeBox={activeBox}
            handleSelectBox={handleSelectBox}
            hideBoxZero
          />
        ) : (
          <BoxesCarousel
            boxes={boxes}
            activeBox={activeBox}
            handleSelectBox={handleSelectBox}
            hideBoxZero
          />
        )}
      </View>
    </View>
  );
}

function mapReviewCardToWord(card: CustomReviewFlashcard): WordWithTranslations {
  const front = card.frontText?.trim() ?? "";
  const answers = (card.answers ?? []).map((ans) => ans.trim()).filter(Boolean);
  const backPieces = (card.backText ?? "")
    .split(/[;,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  const translations = answers.length > 0 ? answers : backPieces.length > 0 ? backPieces : [card.backText ?? ""];

  return {
    id: card.id,
    text: front,
    translations,
    flipped: card.flipped ?? false,
    stage: card.stage,
    nextReview: card.nextReview,
    answerOnly: card.answerOnly ?? false,
    hintFront: card.hintFront,
    hintBack: card.hintBack,
    imageFront: card.imageFront ?? null,
    imageBack: card.imageBack ?? null,
    type: (card.type as "text" | "image" | "true_false") || "text",
  };
}
