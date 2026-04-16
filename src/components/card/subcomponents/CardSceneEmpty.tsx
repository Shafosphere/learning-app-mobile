import { Text, View } from "react-native";

import { useStyles } from "../card-styles";

export function CardSceneEmpty() {
  const styles = useStyles();
  return (
    <View style={styles.emptyScene}>
      <Text style={styles.empty}>Wybierz pudełko z fiszkami</Text>
    </View>
  );
}
