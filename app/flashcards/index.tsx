import { Button, Text, View, Image, TouchableOpacity } from "react-native";
import { useEffect, useState } from "react";
import { getRandomWordsBatch } from "@/src/components/db/dbGenerator";
import { DEFAULT_FLASHCARDS_BATCH_SIZE } from "@/src/config/appConfig";
import { scheduleReview } from "@/src/components/db/db";
import { useStyles } from "@/src/screens/flashcards/styles_flashcards";
import { useSettings } from "@/src/contexts/SettingsContext";
import Boxes from "@/src/components/boxes/boxes";
import Card from "@/src/components/card/card";
import { BoxesState, WordWithTranslations } from "@/src/types/boxes";
import useSpellchecking from "@/src/hooks/useSpellchecking";
import PL_FLAG from "../../assets/flag/PL.png";
import ES_FLAG from "../../assets/flag/ES.png";
import PM_FLAG from "../../assets/flag/PM.png";
import US_FLAG from "../../assets/flag/US.png";
import { useRouter } from "expo-router";
import { useBoxesPersistenceSnapshot } from "@/src/hooks/useBoxesPersistenceSnapshot";
import BoxesCarousel from "@/src/components/boxes/boxcarousel";
import { useStreak } from "@/src/contexts/StreakContext";
// import MediumBoxes from "@/src/components/boxes/mediumboxes";
export default function Flashcards() {
  const router = useRouter();
  const styles = useStyles();
  const { selectedLevel, profiles, activeProfile, boxesLayout, flashcardsBatchSize } = useSettings();
  const { registerLearningEvent } = useStreak();

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
    sourceLangId: activeProfile?.sourceLangId ?? 0,
    targetLangId: activeProfile?.targetLangId ?? 0,
    level: selectedLevel ?? "A1",
    autosave:
      activeProfile?.sourceLangId != null &&
      activeProfile?.targetLangId != null &&
      !!selectedLevel,
    saveDelayMs: 0,
  });

  const [activeBox, setActiveBox] = useState<keyof BoxesState | null>(null);
  const [selectedItem, setItem] = useState<WordWithTranslations | null>(null);
  const [queueNext, setQueueNext] = useState(false);
  const checkSpelling = useSpellchecking();
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<boolean | null>(null);
  const reversed = activeBox === "boxTwo" || activeBox === "boxFour";
  const boxOrder: ReadonlyArray<keyof BoxesState> = [
    "boxOne",
    "boxTwo",
    "boxThree",
    "boxFour",
    "boxFive",
  ];

  const [correction, setCorrection] = useState<{
    awers: string;
    rewers: string;
    input1: string;
    input2: string;
  } | null>(null);

  const flagMap: Record<string, number> = {
    pl: PL_FLAG,
    es: ES_FLAG,
    pm: PM_FLAG,
    en: US_FLAG,
  };

  const [learned, setLearned] = useState<WordWithTranslations[]>([]);
  const learnedPercent =
    totalWordsForLevel > 0 ? learned.length / totalWordsForLevel : 0;
  const boxOneFull = boxes.boxOne.length >= 30;

  function selectRandomWord(box: keyof BoxesState) {
    const list = boxes[box];
    if (!list || list.length === 0) {
      setItem(null);
      return;
    }
    if (list.length === 1) {
      setItem(list[0]);
      return;
    }
    let idx = Math.floor(Math.random() * list.length);
    if (selectedItem && list[idx].id === selectedItem.id) {
      idx = (idx + 1) % list.length;
    }
    setItem(list[idx]);
    console.log(selectedItem);
  }

  async function downloadData() {
    if (boxOneFull) {
      return;
    }
    const prof = activeProfile;
    if (!prof || prof.sourceLangId == null || prof.targetLangId == null) {
      console.warn("Brak aktywnego profilu lub ID języków");
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
      const next = prev + 1;
      console.log(next);
      return next;
    });
    await saveNow();
  }

  function handleSelectBox(box: keyof BoxesState) {
    setActiveBox(box);
    selectRandomWord(box);
  }

  function checkAnswer(): boolean {
    if (!selectedItem) return false;
    let isOk: boolean;
    if (reversed) {
      isOk = checkSpelling(answer, selectedItem.text);
    } else {
      isOk = selectedItem.translations.some((t) => checkSpelling(answer, t));
    }

    return isOk;
  }

  function confirm() {
    if (!selectedItem) return;

    const ok = checkAnswer();
    if (ok) {
      setResult(true);
      // If the user answered correctly in the last box, register streak event
      if (activeBox === "boxFive") {
        registerLearningEvent();
      }
      setTimeout(() => {
        setAnswer("");
        moveElement(selectedItem.id, true);
        setResult(null);
        setQueueNext(true);
      }, 1500);
    } else {
      setResult(false);
      setCorrection({
        awers: selectedItem.text,
        rewers: selectedItem.translations[0] ?? "",
        input1: "",
        input2: "",
      });
    }
  }

  async function moveElement(id: number, promote = false) {
    if (!activeBox) return;
    if (activeBox === "boxOne" && promote === false) {
      selectRandomWord(activeBox);
      return;
    }

    setBoxes((prev) => {
      const from = activeBox;
      const source = prev[from];
      const element = source.find((x) => x.id === id);
      if (!element) return prev;

      console.log("Przenoszę element:", element, "z boxa:", from);
      const fromIdx = boxOrder.indexOf(from);

      let target: keyof BoxesState | null;
      if (promote) {
        const isLast = fromIdx >= boxOrder.length - 1;
        if (isLast) {
          target = null;
        } else {
          target = boxOrder[fromIdx + 1];
        }
      } else {
        target = "boxOne";
      }

      const nextState: BoxesState = {
        ...prev,
        [from]: source.filter((x) => x.id !== id),
      };

      if (target) {
        nextState[target] = [element, ...prev[target]];
      } else {
        setLearned((list) => [element, ...list]);
        // Schedule spaced-repetition review when a word is learned
        if (
          activeProfile?.sourceLangId != null &&
          activeProfile?.targetLangId != null &&
          selectedLevel
        ) {
          // Initial stage 0 on first learn; helper computes next_review
          void scheduleReview(
            element.id,
            activeProfile.sourceLangId,
            activeProfile.targetLangId,
            selectedLevel,
            0
          );
        }
      }

      // Update usedWordIds when moving to a box or learned
      addUsedWordIds(element.id);

      return nextState;
    });
  }

  function wrongInputChange(which: 1 | 2, value: string) {
    setCorrection((c) =>
      c ? { ...c, [which === 1 ? "input1" : "input2"]: value } : c
    );
  }

  useEffect(() => {
    if (
      correction &&
      correction.input1.trim() === correction.awers &&
      correction.input2.trim() === correction.rewers
    ) {
      if (selectedItem) {
        moveElement(selectedItem.id, false);
      }
      setResult(null);
      setCorrection(null);
      setQueueNext(true);
    }
  }, [correction]);

  useEffect(() => {
    console.log(selectedItem);
  }, [selectedItem]);

  useEffect(() => {
    if (queueNext && activeBox) {
      selectRandomWord(activeBox);
      setResult(null);
      setQueueNext(false);
    }
  }, [boxes]);

  if (
    !activeProfile ||
    activeProfile.sourceLangId == null ||
    activeProfile.targetLangId == null ||
    !selectedLevel
  ) {
    return (
      <View style={styles.container}>
        <Text>Wybierz profil i poziom.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => router.push("/profilpanel")}
        style={styles.containerofprofile}
      >
        {activeProfile && (
          <Image
            source={flagMap[activeProfile.sourceLang]}
            style={styles.flag}
          />
        )}
        {/* <Text style={styles.levelText}>{selectedLevel}</Text> */}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push("/level")}
        style={styles.containeroflevel}
      >
        <View style={styles.levelContainer}>
          <Text style={styles.levelLabel}>{selectedLevel}</Text>
          {/* <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${learnedPercent * 100}%` },
              ]}
            />
          </View> */}
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
