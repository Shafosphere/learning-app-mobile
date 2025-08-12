import { Text, TextInput, View } from "react-native";
import { useStyles } from "./styles_card";
import MyButton from "../button/button";
import { BoxesState, WordWithTranslations } from "@/src/types/boxes";
import { useState } from "react";

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
}: CardProps) {
  const styles = useStyles();
  const statusStyle =
    result === null ? undefined : result ? styles.cardGood : styles.cardBad;

  const awers = selectedItem?.text ?? "";
  const rewers = selectedItem?.translations?.[0] ?? "";
  const promptText = reversed ? rewers : awers;

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
          <Text style={styles.cardFont}>{promptText}</Text>
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
          onPress={confirm}
        />
        <MyButton
          text="dodaj    słówka"
          color="my_yellow"
          onPress={onDownload}
          disabled={false}
        />
      </View>
    </View>
  );
}
