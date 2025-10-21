import { Text, View, TouchableOpacity } from "react-native";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  getCustomFlashcards,
  getCustomCourseById,
  scheduleCustomReview,
} from "@/src/db/sqlite/db";
import { useStyles } from "../flashcards/FlashcardsScreen-styles";
import { useSettings } from "@/src/contexts/SettingsContext";
import Boxes from "@/src/components/box/boxes";
import Card from "@/src/components/card/card";
import { BoxesState, WordWithTranslations } from "@/src/types/boxes";
import useSpellchecking from "@/src/hooks/useSpellchecking";
import { useRouter } from "expo-router";
import { useBoxesPersistenceSnapshot } from "@/src/hooks/useBoxesPersistenceSnapshot";
import BoxesCarousel from "@/src/components/box/boxcarousel";
import { useLearningStats } from "@/src/contexts/LearningStatsContext";
import { useIsFocused } from "@react-navigation/native";
import { getCourseIconById } from "@/src/constants/customCourse";
import { DEFAULT_FLASHCARDS_BATCH_SIZE } from "@/src/config/appConfig";
import { useFlashcardsInteraction } from "@/src/hooks/useFlashcardsInteraction";
import type {
  CustomFlashcardRecord,
  CustomCourseRecord,
} from "@/src/db/sqlite/db";
import Confetti from "@/src/components/confetti/Confetti";

function mapCustomCardToWord(
  card: CustomFlashcardRecord
): WordWithTranslations {
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

  return {
    id: card.id,
    text: front,
    translations,
  };
}
// import MediumBoxes from "@/src/components/box/mediumboxes";
export default function Flashcards() {
  const router = useRouter();
  const styles = useStyles();
  const {
    activeCustomCourseId,
    boxesLayout,
    flashcardsBatchSize,
    boxZeroEnabled,
  } = useSettings();
  const { registerKnownWord } = useLearningStats();
  const isFocused = useIsFocused();
  const [shouldCelebrate, setShouldCelebrate] = useState(false);

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
      autosave: activeCustomCourseId != null,
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
  const learnedPercent = totalCards > 0 ? learned.length / totalCards : 0;
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

  async function downloadData(): Promise<void> {
    if (!customCards.length) return;

    const existingIds = new Set<number>();
    for (const list of Object.values(boxes)) {
      for (const item of list) existingIds.add(item.id);
    }
    for (const item of learned) existingIds.add(item.id);

    const remaining = customCards.filter((card) => !existingIds.has(card.id));
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
  }

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
        setCustomCourse(courseRow);
        const mapped = flashcardRows.map(mapCustomCardToWord);
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
  ]);

  useEffect(() => {
    if (selectedItem && !customCards.some((card) => card.id === selectedItem.id)) {
      clearSelection();
    }
  }, [clearSelection, customCards, selectedItem]);

  const courseAccessibilityLabel = customCourse
    ? `Kurs ${customCourse.name}. Otwórz panel kursów.`
    : "Wybierz kurs fiszek.";

  const editAccessibilityLabel = customCourse
    ? `Edytuj fiszki kursu ${customCourse.name}.`
    : "Dodaj fiszki do kursu.";

  const courseIconMeta = useMemo(() => {
    if (!customCourse) return null;
    return getCourseIconById(customCourse.iconId);
  }, [customCourse]);
  const CourseIconComponent = courseIconMeta?.Component;
  const courseIconName = courseIconMeta?.name ?? "";
  const courseIconColor = customCourse?.iconColor ?? "#00214D";
  const courseName = customCourse?.name ?? "Wybierz kurs";
  const totalCardsLabel = customCards.length > 0
    ? `Fiszki: ${customCards.length}`
    : "Brak fiszek";
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

  const handleEditPress = () => {
    if (!customCourse || activeCustomCourseId == null) return;
    const encodedName = encodeURIComponent(customCourse.name);
    router.push(
      `/custom_course/edit?id=${activeCustomCourseId.toString()}&name=${encodedName}`
    );
  };

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
        onDownload={downloadData}
        downloadDisabled={downloadDisabled}
        introMode={introModeActive}
      />
    );
  }

  return (
    <View style={styles.container}>
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
