import { Text, View } from "react-native";
import { styles } from "../../src/screens/flashcards/styles_flashcards";
import { useState } from "react";

export default function Flashcards() {
  const [boxes, setBoxes] = useState({
    boxOne: [],
    boxTwo: [],
    boxThree: [],
    boxFour: [],
    boxFive: [],
  });

  return (
    <View style={styles.container}>
      <Text style={styles.text}> Flashcards </Text>
    </View>
  );
}
