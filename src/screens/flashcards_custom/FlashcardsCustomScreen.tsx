import BoxesCarousel from "@/src/components/box/boxcarousel";
import Boxes from "@/src/components/box/boxes";
import Card from "@/src/components/card/card";
import Confetti from "@/src/components/confetti/Confetti";
import { DEFAULT_FLASHCARDS_BATCH_SIZE } from "@/src/config/appConfig";
import { useLearningStats } from "@/src/contexts/LearningStatsContext";
import { useSettings } from "@/src/contexts/SettingsContext";
import type {
  CustomCourseRecord,
  CustomFlashcardRecord,
} from "@/src/db/sqlite/db";
import {
  getCustomCourseById,
  getCustomFlashcards,
  scheduleCustomReview,
} from "@/src/db/sqlite/db";
import { useBoxesPersistenceSnapshot } from "@/src/hooks/useBoxesPersistenceSnapshot";
import { useFlashcardsAutoflow } from "@/src/hooks/useFlashcardsAutoflow";
import { useFlashcardsInteraction } from "@/src/hooks/useFlashcardsInteraction";
import useSpellchecking from "@/src/hooks/useSpellchecking";
import { BoxesState, WordWithTranslations } from "@/src/types/boxes";
import { useIsFocused } from "@react-navigation/native";
// import { useRouter } from "expo-router";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useStyles } from "../flashcards/FlashcardsScreen-styles";
import { useFlashcardsIntro } from "@/src/components/onboarding/useFlashcardsIntro";

function mapCustomCardToWord(
  card: CustomFlashcardRecord
): WordWithTranslations {
  console.log('Converting card:', { id: card.id, frontText: card.frontText, flipped: card.flipped });
  const front = card.frontText?.trim() ?? "";
  const normalizedAnswers = (card.answers ?? [])
    .map((answer) => answer.trim())
    .filter((answer) => answer.length > 0);

  const uniqueAnswers: string[] = [];
  for (const answer of normalizedAnswers) {
    if (!uniqueAnswers.includes(answer)) {
      uniqueAnswers.push(answer);
    }
  }

  const rawBack = card.backText ?? "";
  const fallback = rawBack
    .split(/[;,\n]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  const defaultTranslation = rawBack.trim();
  const translations =
    uniqueAnswers.length > 0
      ? uniqueAnswers
      : fallback.length > 0
        ? fallback
        : [defaultTranslation];

  const result = {
    id: card.id,
    text: front,
    translations,
    flipped: card.flipped,
  };
  console.log('Converted to WordWithTranslations:', result);
  return result;
}
// import MediumBoxes from "@/src/components/box/mediumboxes";
export default function Flashcards() {
  // const router = useRouter();
  const styles = useStyles();
  const {
    activeCustomCourseId,
    boxesLayout,
    flashcardsBatchSize,
    boxZeroEnabled,
    autoflowEnabled,
  } = useSettings();
  const { registerKnownWord } = useLearningStats();
  const isFocused = useIsFocused();
  const [shouldCelebrate, setShouldCelebrate] = useState(false);
  const { IntroOverlay } = useFlashcardsIntro();

  useEffect(() => {
    if (!shouldCelebrate) return;
    const timeout = setTimeout(() => setShouldCelebrate(false), 1750);
    return () => clearTimeout(timeout);
  }, [shouldCelebrate]);

  const { boxes, setBoxes, isReady, addUsedWordIds, removeUsedWordIds } =
    useBoxesPersistenceSnapshot({
      sourceLangId: activeCustomCourseId ?? 0,
      targetLangId: activeCustomCourseId ?? 0,
      level: `custom-${activeCustomCourseId ?? 0}`,
      storageNamespace: "customBoxes",
      autosave: activeCustomCourseId !== null,
      saveDelayMs: 0,
    });

  const [customCourse, setCustomCourse] =
    useState<CustomCourseRecord | null>(null);
  const checkSpelling = useSpellchecking();
  const {
    activeBox,
    handleSelectBox,
    selectedItem,
    answer,
    setAnswer,
    result,
    setResult,
    confirm,
    reversed,
    correction,
    wrongInputChange,
    setCorrectionRewers,
    learned,
    setLearned,
    resetInteractionState,
    clearSelection,
  } = useFlashcardsInteraction({
    boxes,
    setBoxes,
    checkSpelling,
    addUsedWordIds,
    registerKnownWord,
    onWordPromotedOut: (word) => {
      if (activeCustomCourseId != null && customCourse?.reviewsEnabled) {
        void scheduleCustomReview(word.id, activeCustomCourseId, 0);
      }
    },
    onCorrectAnswer: (boxKey) => {
      if (boxKey !== "boxFive") return;
      setShouldCelebrate(false);
      requestAnimationFrame(() => {
        setShouldCelebrate(true);
      });
    },
    boxZeroEnabled,
  });


  const [customCards, setCustomCards] = useState<WordWithTranslations[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const totalCards = customCards.length;
  const trackedIds = useMemo(() => {
    const ids = new Set<number>();
    for (const list of Object.values(boxes)) {
      for (const item of list) ids.add(item.id);
    }
    for (const item of learned) ids.add(item.id);
    return ids;
  }, [boxes, learned]);
  const allCardsDistributed = totalCards > 0 && trackedIds.size >= totalCards;
  const totalCardsInBoxes = useMemo(() => {
    return (
      boxes.boxZero.length +
      boxes.boxOne.length +
      boxes.boxTwo.length +
      boxes.boxThree.length +
      boxes.boxFour.length +
      boxes.boxFive.length
    );
  }, [boxes]);

  const downloadData = useCallback(async (): Promise<void> => {
    if (!customCards.length) return;

    const remaining = customCards.filter((card) => !trackedIds.has(card.id));
    if (remaining.length === 0) return;

    const batchSize = flashcardsBatchSize ?? DEFAULT_FLASHCARDS_BATCH_SIZE;
    const nextBatch = remaining.slice(0, Math.max(1, batchSize));

    setBoxes((prev) =>
      boxZeroEnabled
        ? {
          ...prev,
          boxZero: [...prev.boxZero, ...nextBatch],
        }
        : {
          ...prev,
          boxOne: [...prev.boxOne, ...nextBatch],
        }
    );
    addUsedWordIds(nextBatch.map((card) => card.id));
  }, [
    addUsedWordIds,
    boxZeroEnabled,
    customCards,
    flashcardsBatchSize,
    trackedIds,
  ]);

  const introBoxLimitReached = boxZeroEnabled
    ? boxes.boxZero.length >= 30
    : boxes.boxOne.length >= 30;

  const correctionLocked = correction?.mode === "demote";
  const isAnswering =
    selectedItem != null && result === null && correction?.mode !== "intro";
  const resultPending = result !== null;
  const canAutoflowSwitch =
    !correctionLocked && !isAnswering && !resultPending;

  useFlashcardsAutoflow({
    enabled: autoflowEnabled,
    boxes,
    activeBox,
    handleSelectBox,
    canSwitch: canAutoflowSwitch,
    boxZeroEnabled,
    isReady: isReady,
    downloadMore: downloadData,
    introBoxLimitReached,
    totalFlashcardsInCourse: totalCards,
  });

  useEffect(() => {
    if (boxZeroEnabled) return;
    if (!boxes.boxZero.length) return;

    const wordsToReset = boxes.boxZero;
    setBoxes((prev) => ({
      ...prev,
      boxZero: [],
    }));
    removeUsedWordIds(wordsToReset.map((word) => word.id));
  }, [boxZeroEnabled, boxes.boxZero, removeUsedWordIds, setBoxes]);

  useEffect(() => {
    if (!isFocused) return;

    let isMounted = true;

    if (activeCustomCourseId == null) {
      setCustomCourse(null);
      setCustomCards([]);
      setLoadError(null);
      setIsLoadingData(false);
      return () => {
        isMounted = false;
      };
    }

    setIsLoadingData(true);
    setLoadError(null);

    void Promise.all([
      getCustomCourseById(activeCustomCourseId),
      getCustomFlashcards(activeCustomCourseId),
    ])
      .then(([courseRow, flashcardRows]) => {
        if (!isMounted) return;
        if (!courseRow) {
          setCustomCourse(null);
          setCustomCards([]);
          setLoadError("Wybrany kurs nie istnieje.");
          return;
        }
        console.log('Loading flashcards from DB:', flashcardRows);
        setCustomCourse(courseRow);
        const mapped = flashcardRows.map(mapCustomCardToWord);
        // console.log('After mapping flashcards:', mapped);
        setCustomCards(mapped);
      })
      .catch((error) => {
        console.error("Failed to load custom flashcards", error);
        if (!isMounted) return;
        setCustomCourse(null);
        setCustomCards([]);
        setLoadError("Nie udało się wczytać fiszek.");
      })
      .finally(() => {
        if (isMounted) setIsLoadingData(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeCustomCourseId, isFocused]);

  useEffect(() => {
    if (!isReady) return;
    if (isLoadingData || customCards.length === 0) return;

    const allowedIds = new Set(customCards.map((card) => card.id));

    setBoxes((prev) => {
      let mutated = false;
      const sanitize = (list: WordWithTranslations[]) => {
        const filtered = list.filter((item) => allowedIds.has(item.id));
        if (filtered.length !== list.length) mutated = true;
        return filtered;
      };

      const next: BoxesState = {
        boxZero: sanitize(prev.boxZero),
        boxOne: sanitize(prev.boxOne),
        boxTwo: sanitize(prev.boxTwo),
        boxThree: sanitize(prev.boxThree),
        boxFour: sanitize(prev.boxFour),
        boxFive: sanitize(prev.boxFive),
      };
      return mutated ? next : prev;
    });

    setLearned((current) => {
      const filtered = current.filter((card) => allowedIds.has(card.id));
      return filtered.length === current.length ? current : filtered;
    });
  }, [customCards, isReady, isLoadingData, learned, setBoxes, setLearned]);

  useEffect(() => {
    if (!isReady) return;
    if (isLoadingData) return;
    if (activeCustomCourseId == null) return;
    if (totalCardsInBoxes > 0) return;
    if (allCardsDistributed) return;
    if (!customCards.length) return;

    void downloadData();
  }, [
    isReady,
    isLoadingData,
    activeCustomCourseId,
    totalCardsInBoxes,
    allCardsDistributed,
    customCards,
    downloadData,
  ]);

  useEffect(() => {
    if (selectedItem && !customCards.some((card) => card.id === selectedItem.id)) {
      clearSelection();
    }
  }, [clearSelection, customCards, selectedItem]);


  const downloadDisabled =
    customCards.length === 0 || allCardsDistributed || isLoadingData || !isReady;
  const shouldShowBoxes =
    activeCustomCourseId != null &&
    isReady &&
    !isLoadingData &&
    !loadError &&
    customCards.length > 0;
  const introModeActive = boxZeroEnabled && activeBox === "boxZero";

  useEffect(() => {
    resetInteractionState();
  }, [activeCustomCourseId, resetInteractionState]);

  let cardSection: ReactNode;
  if (activeCustomCourseId == null) {
    cardSection = (
      <View style={{ paddingHorizontal: 32 }}>
        <Text allowFontScaling>
          Wybierz własny kurs w panelu kursów, aby rozpocząć naukę.
        </Text>
      </View>
    );
  } else if (isLoadingData) {
    cardSection = (
      <View style={{ paddingHorizontal: 32 }}>
        <Text allowFontScaling>Ładowanie fiszek...</Text>
      </View>
    );
  } else if (loadError) {
    cardSection = (
      <View style={{ paddingHorizontal: 32 }}>
        <Text allowFontScaling>{loadError}</Text>
      </View>
    );
  } else if (!customCards.length) {
    cardSection = (
      <View style={{ paddingHorizontal: 32 }}>
        <Text allowFontScaling>
          Dodaj fiszki do tego kursu, aby móc z nich korzystać.
        </Text>
      </View>
    );
  } else {
    cardSection = (
      <Card
        selectedItem={selectedItem}
        setAnswer={setAnswer}
        answer={answer}
        result={result}
        confirm={confirm}
        reversed={reversed}
        setResult={setResult}
        correction={correction}
        wrongInputChange={wrongInputChange}
        setCorrectionRewers={setCorrectionRewers}
        onDownload={downloadData}
        downloadDisabled={downloadDisabled}
        introMode={introModeActive}
      />
    );
  }

  return (
    <View style={styles.container}>
      <IntroOverlay />
      <Confetti generateConfetti={shouldCelebrate} />
      {cardSection}

      {shouldShowBoxes ? (
        boxesLayout === "classic" ? (
          <Boxes
            boxes={boxes}
            activeBox={activeBox}
            handleSelectBox={handleSelectBox}
            hideBoxZero={!boxZeroEnabled}
          />
        ) : (
          <BoxesCarousel
            boxes={boxes}
            activeBox={activeBox}
            handleSelectBox={handleSelectBox}
            hideBoxZero={!boxZeroEnabled}
          />
        )
      ) : null}
    </View>
  );
}
