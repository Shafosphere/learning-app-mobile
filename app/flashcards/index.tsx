import { Button, Text, View } from "react-native";
import { useEffect, useState } from "react";
import { getWordsFromPatch } from "@/src/components/db/dbGenerator";
import { useStyles } from "@/src/screens/flashcards/styles_flashcards";
import { useSettings } from "@/src/contexts/SettingsContext";
import Boxes from "@/src/components/boxes/boxes";
import Card from "@/src/components/card/card";
import { BoxesState, WordWithTranslations } from "@/src/types/boxes";

export default function Flashcards() {
  const styles = useStyles();
  const { selectedLevel, profiles } = useSettings();
  const [activeBox, setActiveBox] = useState<keyof BoxesState | null>(null);
  const [selectedItem, setItem] = useState<WordWithTranslations | null>(null);

  const [boxes, setBoxes] = useState<BoxesState>({
    boxOne: [],
    boxTwo: [],
    boxThree: [],
    boxFour: [],
    boxFive: [],
  });

  function clickOnBox(boxName: keyof BoxesState) {
    setActiveBox(boxName);
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
      <Card selectedItem={selectedItem}/>

      <Boxes
        boxes={boxes}
        activeBox={activeBox}
        onSelectBox={setActiveBox}
        onDownload={downloadData}
      />
    </View>
  );
}
