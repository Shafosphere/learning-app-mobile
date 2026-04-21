import MyButton from "@/src/components/button/button";
import { CoachmarkAnchor } from "@edwardloopez/react-native-coachmark";
import { View } from "react-native";
import { useStyles } from "../card-styles";

type CardActionsProps = {
  handleConfirm: () => void;
  onDownload: () => Promise<void>;
  downloadDisabled: boolean;
  downloadCoachmarkId?: string;
  confirmDisabled?: boolean;
  confirmLabel?: string;
  hidden?: boolean;
};

export function CardActions({
  handleConfirm,
  onDownload,
  downloadDisabled,
  downloadCoachmarkId,
  confirmDisabled = false,
  confirmLabel = "OK",
  hidden = false,
}: CardActionsProps) {
  const styles = useStyles();

  if (hidden) {
    return null;
  }

  const downloadButton = (
    <MyButton
      text="DODAJ FISZKI"
      color="my_yellow"
       width={140}
      onPress={onDownload}
      disabled={downloadDisabled}
    />
  );

  return (
    <View style={styles.containerButton} collapsable={false}>
      {downloadCoachmarkId ? (
        <CoachmarkAnchor id={downloadCoachmarkId} shape="rect" radius={18}>
          <View collapsable={false}>{downloadButton}</View>
        </CoachmarkAnchor>
      ) : (
        downloadButton
      )}
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
