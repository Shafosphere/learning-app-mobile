import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import { getRandomWordsBatch } from "@/src/db/sqlite/dbGenerator";
import { DEFAULT_FLASHCARDS_BATCH_SIZE } from "@/src/config/appConfig";
import { scheduleReview } from "@/src/db/sqlite/db";
import { useStyles } from "./FlashcardsScreen-styles";
import { useSettings } from "@/src/contexts/SettingsContext";
import Boxes from "@/src/components/box/boxes";
import Card from "@/src/components/card/card";
import useSpellchecking from "@/src/hooks/useSpellchecking";
import { useRouter } from "expo-router";
import { useBoxesPersistenceSnapshot } from "@/src/hooks/useBoxesPersistenceSnapshot";
import BoxesCarousel from "@/src/components/box/boxcarousel";
import { useLearningStats } from "@/src/contexts/LearningStatsContext";
import { useFlashcardsInteraction } from "@/src/hooks/useFlashcardsInteraction";
import { useFlashcardsAutoflow } from "@/src/hooks/useFlashcardsAutoflow";
import Confetti from "@/src/components/confetti/Confetti";
// import MediumBoxes from "@/src/components/box/mediumboxes";
export default function FlashcardsScreen() {
  const router = useRouter();
  const styles = useStyles();
  const {
    selectedLevel,
    activeCourse,
    boxesLayout,
    flashcardsBatchSize,
    boxZeroEnabled,
    autoflowEnabled,
  } = useSettings();
  const { registerKnownWord } = useLearningStats();
  const [shouldCelebrate, setShouldCelebrate] = useState(false);

  useEffect(() => {
    if (!shouldCelebrate) return;
    const timeout = setTimeout(() => setShouldCelebrate(false), 1750);
    return () => clearTimeout(timeout);
  }, [shouldCelebrate]);

  const {
    boxes,
    setBoxes,
    batchIndex,
    setBatchIndex,
    isReady,
    resetSave,
    saveNow,
    addUsedWordIds,
    removeUsedWordIds,
    progress,
    totalWordsForLevel,
  } = useBoxesPersistenceSnapshot({
    sourceLangId: activeCourse?.sourceLangId ?? 0,
    targetLangId: activeCourse?.targetLangId ?? 0,
    level: selectedLevel ?? "A1",
    autosave:
      activeCourse?.sourceLangId != null &&
      activeCourse?.targetLangId != null &&
      !!selectedLevel,
    saveDelayMs: 0,
  });

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
  } = useFlashcardsInteraction({
    boxes,
    setBoxes,
    checkSpelling,
    addUsedWordIds,
    registerKnownWord,
    onWordPromotedOut: (word) => {
      if (
        activeCourse?.sourceLangId != null &&
        activeCourse?.targetLangId != null &&
        selectedLevel
      ) {
        void scheduleReview(
          word.id,
          activeCourse.sourceLangId,
          activeCourse.targetLangId,
          selectedLevel,
          0
        );
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
  const learnedPercent =
    totalWordsForLevel > 0 ? learned.length / totalWordsForLevel : 0;
  const introBoxLimitReached = boxZeroEnabled
    ? boxes.boxZero.length >= 30
    : boxes.boxOne.length >= 30;

  const downloadData = useCallback(async () => {
    if (introBoxLimitReached) {
      return;
    }
    const prof = activeCourse;
    if (!prof || prof.sourceLangId == null || prof.targetLangId == null) {
      console.warn("Brak aktywnego kursu lub ID języków");
      return;
    }

    const excludeIds = [
      ...boxes.boxZero.map((x) => x.id),
      ...boxes.boxOne.map((x) => x.id),
      ...boxes.boxTwo.map((x) => x.id),
      ...boxes.boxThree.map((x) => x.id),
      ...boxes.boxFour.map((x) => x.id),
      ...boxes.boxFive.map((x) => x.id),
      ...learned.map((x) => x.id),
    ];

    const batchData = await getRandomWordsBatch({
      sourceLangId: prof.sourceLangId,
      targetLangId: prof.targetLangId,
      cefrLevel: selectedLevel as "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
      batchSize: (flashcardsBatchSize ?? DEFAULT_FLASHCARDS_BATCH_SIZE),
      excludeIds,
    });

    setBoxes((prev) =>
      boxZeroEnabled
        ? {
            ...prev,
            boxZero: [...prev.boxZero, ...batchData],
          }
        : {
            ...prev,
            boxOne: [...prev.boxOne, ...batchData],
          }
    );
    // Track used words when they are added to any box
    addUsedWordIds(batchData.map((w) => w.id));
    setBatchIndex((prev) => {
      return prev + 1;
    });
    await saveNow();
  }, [
    activeCourse,
    addUsedWordIds,
    boxZeroEnabled,
    boxes,
    flashcardsBatchSize,
    introBoxLimitReached,
    learned,
    saveNow,
    selectedLevel,
    setBatchIndex,
    setBoxes,
  ]);

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

  if (
    !activeCourse ||
    activeCourse.sourceLangId == null ||
    activeCourse.targetLangId == null ||
    !selectedLevel
  ) {
    return (
      <View style={styles.container}>
        <Text allowFontScaling>Wybierz kurs i poziom.</Text>
      </View>
    );
  }

  const introModeActive = boxZeroEnabled && activeBox === "boxZero";
  const correctionLocked = correction?.mode === "demote";
  const isAnswering =
    selectedItem != null && result === null && correction?.mode !== "intro";
  const canAutoflowSwitch = !correctionLocked && !isAnswering;

  useFlashcardsAutoflow({
    enabled: autoflowEnabled,
    boxes,
    activeBox,
    handleSelectBox,
    canSwitch: canAutoflowSwitch,
    boxZeroEnabled,
    downloadMore: downloadData,
    introBoxLimitReached,
  });
  return (
    <View style={styles.container}>
      <Confetti generateConfetti={shouldCelebrate} />

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
        downloadDisabled={introBoxLimitReached}
        introMode={introModeActive}
      />

      {boxesLayout === "classic" ? (
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
      )}
    </View>
  );
}
