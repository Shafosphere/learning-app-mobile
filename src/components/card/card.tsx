import { Text, TextInput, View } from "react-native";
import { useStyles } from "./styles_card";
import MyButton from "../button/button";
import { BoxesState, WordWithTranslations } from "@/src/types/boxes";

type CardProps = {
  selectedItem: WordWithTranslations | null;
  checkAnswer: () => void;
  answer: string;
  setAnswer: React.Dispatch<React.SetStateAction<string>>;
  result: boolean | null;
  confirm: ()=> void;
};

export default function Card({
  selectedItem,
  checkAnswer,
  answer,
  setAnswer,
  result,
  confirm,
}: CardProps) {
  const styles = useStyles();
  const statusStyle =
    result === null ? undefined : result ? styles.cardGood : styles.cardBad;

  function showCardContent() {
    if (selectedItem && selectedItem.text) {
      return (
        <>
          <Text style={styles.cardFont}>
            {selectedItem && selectedItem.text ? selectedItem.text : null}
          </Text>
          <TextInput
            style={[styles.cardInput, styles.cardFont]}
            value={answer}
            onChangeText={setAnswer}
            autoCapitalize="none"
          />
        </>
      );
    } else {
      return <Text style={styles.cardFont}>Wybierz pudełko z słówkami</Text>;
    }
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
        <MyButton text="pierwsza litera" color="my_red" disabled={false} />
      </View>
    </View>
  );
}
