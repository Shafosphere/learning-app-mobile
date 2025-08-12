import { Button, Text, View } from "react-native";
import { useEffect, useState } from "react";
import { getWordsFromPatch } from "@/src/components/db/dbGenerator";
import { useStyles } from "@/src/screens/flashcards/styles_flashcards";
import { useSettings } from "@/src/contexts/SettingsContext";
import Boxes from "@/src/components/boxes/boxes";
import Card from "@/src/components/card/card";
import { BoxesState, WordWithTranslations } from "@/src/types/boxes";
import useSpellchecking from "@/src/hooks/useSpellchecking";

export default function Flashcards() {
  const styles = useStyles();
  const { selectedLevel, profiles } = useSettings();
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

  const [learned, setLearned] = useState<WordWithTranslations[]>([]);

  const [boxes, setBoxes] = useState<BoxesState>({
    boxOne: [],
    boxTwo: [],
    boxThree: [],
    boxFour: [],
    boxFive: [],
  });

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
    try {
      const patchData: WordWithTranslations[] = await getWordsFromPatch({
        sourceLangId: 1,
        targetLangId: 2,
        cefrLevel: "A1",
        batchIndex: 1,
      });

      setBoxes((prev) => ({
        ...prev,
        boxOne: [...prev.boxOne, ...patchData],
      }));

      console.log("boxOne teraz ma:", boxes.boxOne);
    } catch (error) {
      console.error("Błąd podczas pobierania:", error);
    }
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

  function moveElement(id: number, promote = false) {
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
      }

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

  return (
    <View style={styles.container}>
      {/* <Text>{selectedLevel}</Text>
      <Text>{activeBox}</Text>
      {profiles && (
        <>
          {profiles.map((profile, idx) => (
            <Text key={idx}>
              {profile.sourceLang} → {profile.targetLang}
            </Text>
          ))}
        </>
      )} */}
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
      />

      <Boxes
        boxes={boxes}
        activeBox={activeBox}
        handleSelectBox={handleSelectBox}
        onDownload={downloadData}
      />
    </View>
  );
}
