import MyButton from "@/src/components/button/button";
import { View } from "react-native";
import { useStyles } from "../card-styles";

type CardActionsProps = {
  handleConfirm: () => void;
  onDownload: () => Promise<void>;
  downloadDisabled: boolean;
  hidden?: boolean;
};

export function CardActions({
  handleConfirm,
  onDownload,
  downloadDisabled,
  hidden = false,
}: CardActionsProps) {
  const styles = useStyles();

  if (hidden) {
    return null;
  }

  return (
    <View style={styles.containerButton}>
      <MyButton
        text="DODAJ FISZKI"
        color="my_yellow"
        onPress={onDownload}
        disabled={downloadDisabled}
      />
      <MyButton
        text="OK"
        color="my_green"
        disabled={false}
        onPress={handleConfirm}
      />
    </View>
  );
}
