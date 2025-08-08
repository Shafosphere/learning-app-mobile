import { Text, TextInput, View } from "react-native";
import { useStyles } from "./styles_card";
import MyButton from "../button/button";
import { BoxesState, WordWithTranslations } from "@/src/types/boxes";

export default function Card({
  selectedItem,
}: {
  selectedItem: WordWithTranslations;
}) {
  const styles = useStyles();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text>
          {selectedItem && selectedItem.text
            ? selectedItem.text
            : "Wybierz pudełko z słówkami"}
        </Text>
        <TextInput></TextInput>
      </View>

      <View style={styles.containerButton}>
        <MyButton text="zatwiedź" color="my_green" disabled={false} />
        <MyButton text="pierwsza litera" color="my_red" disabled={false} />
      </View>
    </View>
  );
}
