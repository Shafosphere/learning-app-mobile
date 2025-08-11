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

  const checkSpelling = useSpellchecking();
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<boolean | null>(null);

  const boxOrder: ReadonlyArray<keyof BoxesState> = [
    "boxOne",
    "boxTwo",
    "boxThree",
    "boxFour",
    "boxFive",
  ];
  const [learned, setLearned] = useState<WordWithTranslations[]>([]);

  const [boxes, setBoxes] = useState<BoxesState>({
    boxOne: [],
    boxTwo: [],
    boxThree: [],
    boxFour: [],
    boxFive: [],
  });

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

  function checkAnswer(): boolean {
    if (!selectedItem) return false;
    const isOk = selectedItem.translations.some((t) =>
      checkSpelling(answer, t)
    );
    return isOk;
  }

  function confirm() {
    const ok = checkAnswer();
    if (ok) {
      console.log("logika jezeli bedzie dobrze");
      setResult(true);

      setTimeout(() => {
        setResult(null);
        console.log("timeout w confirm");
      }, 1500);
    } else {
      console.log("logika jezeli bedzie źle");
    }
  }

  function moveElement(id: number, promote = false) {
    if (!activeBox) return;

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

  useEffect(() => {
    if (activeBox && boxes[activeBox].length > 0) {
      const currentBox = boxes[activeBox];
      const randomIndex = Math.floor(Math.random() * currentBox.length);
      const randomWord = currentBox[randomIndex];

      setItem(randomWord);
      console.log("Wylosowane:", randomWord);
    }
  }, [activeBox]);

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
        checkAnswer={checkAnswer}
        setAnswer={setAnswer}
        answer={answer}
        result={result}
        confirm={confirm}
      />

      <Boxes
        boxes={boxes}
        activeBox={activeBox}
        onSelectBox={setActiveBox}
        onDownload={downloadData}
      />
    </View>
  );
}
