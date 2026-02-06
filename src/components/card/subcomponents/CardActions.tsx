import MyButton from "@/src/components/button/button";
import { View } from "react-native";
import { useStyles } from "../card-styles";

type CardActionsProps = {
  handleConfirm: () => void;
  onDownload: () => Promise<void>;
  downloadDisabled: boolean;
  confirmDisabled?: boolean;
  confirmLabel?: string;
  hidden?: boolean;
};

export function CardActions({
  handleConfirm,
  onDownload,
  downloadDisabled,
  confirmDisabled = false,
  confirmLabel = "OK",
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
         width={140}
        onPress={onDownload}
        disabled={downloadDisabled}
      />
      <MyButton
       width={140}
        text={confirmLabel}
        color="my_green"
        disabled={confirmDisabled}
        onPress={handleConfirm}
      />
    </View>
  );
}
