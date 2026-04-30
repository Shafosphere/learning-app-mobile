import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { useStyles } from "../card-styles";

export function CardSceneEmpty() {
  const { t } = useTranslation();
  const styles = useStyles();
  return (
    <View style={styles.emptyScene}>
      <Text style={styles.empty}>{t("flashcards.card.emptyScene.chooseBox")}</Text>
    </View>
  );
}
