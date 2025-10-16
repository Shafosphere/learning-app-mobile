import { useEffect, useState } from "react";
import { Text, View, Image, TouchableOpacity } from "react-native";
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
import { getFlagSource } from "@/src/constants/languageFlags";
import { useFlashcardsInteraction } from "@/src/hooks/useFlashcardsInteraction";
import Confetti from "@/src/components/confetti/Confetti";
// import MediumBoxes from "@/src/components/box/mediumboxes";
export default function FlashcardsScreen() {
  const router = useRouter();
  const styles = useStyles();
  const { selectedLevel, activeCourse, boxesLayout, flashcardsBatchSize } = useSettings();
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
  });
  const learnedPercent =
    totalWordsForLevel > 0 ? learned.length / totalWordsForLevel : 0;
  const boxOneFull = boxes.boxOne.length >= 30;

  async function downloadData() {
    if (boxOneFull) {
      return;
    }
    const prof = activeCourse;
    if (!prof || prof.sourceLangId == null || prof.targetLangId == null) {
      console.warn("Brak aktywnego kursu lub ID języków");
      return;
    }

    const excludeIds = [
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

    setBoxes((prev) => ({ ...prev, boxOne: [...prev.boxOne, ...batchData] }));
    // Track used words when they are added to any box
    addUsedWordIds(batchData.map((w) => w.id));
    setBatchIndex((prev) => {
      return prev + 1;
    });
    await saveNow();
  }

  const courseAccessibilityLabel = activeCourse
    ? `Kurs ${activeCourse.sourceLang?.toUpperCase()} do ${activeCourse.targetLang?.toUpperCase()}. Otwórz panel kursów.`
    : "Wybierz kurs językowy";

  const levelAccessibilityLabel = `Poziom ${selectedLevel}. Zmień poziom nauki.`;

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

  const courseFlagSource = getFlagSource(activeCourse.sourceLang);
  return (
    <View style={styles.container}>
      <Confetti generateConfetti={shouldCelebrate} />
      {/* <TouchableOpacity
        onPress={() => router.push("/coursepanel")}
        style={styles.containerofcourse}
        accessibilityRole="button"
        accessibilityLabel={courseAccessibilityLabel}
      >
        {courseFlagSource ? (
          <Image source={courseFlagSource} style={styles.flag} />
        ) : null}
      </TouchableOpacity> */}

      <TouchableOpacity
        onPress={() => router.push("/level")}
        style={styles.containeroflevel}
        accessibilityRole="button"
        accessibilityLabel={levelAccessibilityLabel}
      >
        <View style={styles.levelContainer}>
          <Text style={styles.levelLabel} allowFontScaling>
            {selectedLevel}
          </Text>
        </View>
      </TouchableOpacity>

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
        downloadDisabled={boxOneFull}
      />

      {boxesLayout === "classic" ? (
        <Boxes
          boxes={boxes}
          activeBox={activeBox}
          handleSelectBox={handleSelectBox}
        />
      ) : (
        <BoxesCarousel
          boxes={boxes}
          activeBox={activeBox}
          handleSelectBox={handleSelectBox}
        />
      )}
    </View>
  );
}
