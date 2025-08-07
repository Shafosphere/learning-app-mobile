import { Button, Text, View } from "react-native";
import { useState } from "react";
import { getWordsFromPatch } from "@/src/components/db/dbGenerator";
import { useStyles } from "@/src/screens/flashcards/styles_flashcards";
import { useSettings } from "@/src/contexts/SettingsContext";

export default function Flashcards() {
  const styles = useStyles();
  const { selectedLevel, profiles } = useSettings();

  interface WordWithTranslations {
    id: number;
    text: string;
    translations: string[];
  }

  interface BoxesState {
    boxOne: WordWithTranslations[];
    boxTwo: WordWithTranslations[];
    boxThree: WordWithTranslations[];
    boxFour: WordWithTranslations[];
    boxFive: WordWithTranslations[];
  }

  const [boxes, setBoxes] = useState<BoxesState>({
    boxOne: [],
    boxTwo: [],
    boxThree: [],
    boxFour: [],
    boxFive: [],
  });

  async function loadAndDisplayPatch() {
    try {
      const patchData = await getWordsFromPatch({
        sourceLangId: 1,
        targetLangId: 2,
        cefrLevel: "A1",
        batchIndex: 1,
      });

      console.log(JSON.stringify(patchData, null, 2));
    } catch (error) {
      console.error("Wystąpił błąd podczas pobierania paczki:", error);
    }
  }

  async function downloadData() {
    try {
      const patchData = await getWordsFromPatch({
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

  return (
    <View style={styles.container}>
      <Text>{selectedLevel}</Text>
      {profiles && (
        <>
          {profiles.map((profile, idx) => (
            <Text key={idx}>
              {profile.sourceLang} → {profile.targetLang}
            </Text>
          ))}
        </>
      )}
      <Button title="sprawdź patch" onPress={loadAndDisplayPatch} />
      <Button title="add" onPress={downloadData} />

      <View>
        <Text>{boxes.boxOne.length}</Text>
      </View>
    </View>
  );
}
