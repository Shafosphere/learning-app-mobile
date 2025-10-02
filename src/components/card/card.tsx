import { Text, TextInput, View } from "react-native";
import { useStyles } from "./card-styles";
import MyButton from "../button/button";
import { WordWithTranslations } from "@/src/types/boxes";
import { useState } from "react";
import AntDesign from "@expo/vector-icons/AntDesign";

type CardProps = {
  selectedItem: WordWithTranslations | null;
  reversed?: boolean;
  answer: string;
  setAnswer: React.Dispatch<React.SetStateAction<string>>;
  setResult: React.Dispatch<React.SetStateAction<boolean | null>>;
  result: boolean | null;
  confirm: () => void;
  correction: {
    awers: string;
    rewers: string;
    input1: string;
    input2: string;
  } | null;
  wrongInputChange: (which: 1 | 2, value: string) => void;
  onDownload: () => Promise<void>;
  downloadDisabled?: boolean;
};

export default function Card({
  selectedItem,
  reversed = false,
  answer,
  setAnswer,
  result,
  confirm,
  correction,
  wrongInputChange,
  onDownload,
  downloadDisabled = false,
}: CardProps) {
  const styles = useStyles();
  const statusStyle =
    result === null ? undefined : result ? styles.cardGood : styles.cardBad;

  const [translations, setTranslations] = useState<number>(0);

  const awers = selectedItem?.text ?? "";
  const rewers = selectedItem?.translations?.[translations] ?? "";
  const promptText = reversed ? rewers : awers;

  const len = selectedItem?.translations?.length ?? 0;
  const prev = () => len && setTranslations((i) => (i - 1 + len) % len);
  const next = () => len && setTranslations((i) => (i + 1) % len);

  function handleConfirm() {
    if (selectedItem?.translations && selectedItem.translations.length > 1) {
      const currentIndex = translations; 
      if (currentIndex !== 0) {
        const arr = [...selectedItem.translations]; 
        const [chosen] = arr.splice(currentIndex, 1);
        arr.unshift(chosen); 
        selectedItem.translations = arr; 
      }
      setTranslations(0); 
    }
    confirm(); 
  }

  function showCardContent() {
    if (result === false && correction) {
      return (
        <>
          <View style={styles.containerInput}>
            <Text style={styles.myplaceholder}>{correction.awers}</Text>
            <TextInput
              value={correction.input1}
              onChangeText={(t) => wrongInputChange(1, t)}
              style={styles.myinput}
            />
          </View>

          <View style={styles.containerInput}>
            <Text style={styles.myplaceholder}>{correction.rewers}</Text>
            <TextInput
              value={correction.input2}
              onChangeText={(t) => wrongInputChange(2, t)}
              style={styles.myinput}
            />
          </View>
        </>
      );
    }
    if (selectedItem && selectedItem.text) {
      return (
        <>
          <View style={styles.topContainer}>
            {promptText === rewers && selectedItem.translations.length > 1 ? (
              <AntDesign
                style={styles.miniArrow}
                onPress={prev}
                name="caretleft"
                size={16}
              />
            ) : null}
            <Text style={styles.cardFont}>{promptText}</Text>
            {promptText === rewers && selectedItem.translations.length > 1 ? (
              <AntDesign
                style={styles.miniArrow}
                onPress={next}
                name="caretright"
                size={16}
              />
            ) : null}
          </View>

          <TextInput
            style={[styles.cardInput, styles.cardFont]}
            value={answer}
            onChangeText={setAnswer}
            autoCapitalize="none"
          />
        </>
      );
    }
    return <Text style={styles.cardFont}>Wybierz pudełko z słowkami</Text>;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.card, statusStyle]}>{showCardContent()}</View>

      <View style={styles.containerButton}>
        <MyButton
          text="zatwiedź"
          color="my_green"
          disabled={false}
          onPress={handleConfirm}
        />
        <MyButton
          text="dodaj    słówka"
          color="my_yellow"
          onPress={onDownload}
          disabled={downloadDisabled}
        />
      </View>
    </View>
  );
}
