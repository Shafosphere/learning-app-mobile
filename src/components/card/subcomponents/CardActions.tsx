import MyButton from "@/src/components/button/button";
import { CoachmarkAnchor } from "@edwardloopez/react-native-coachmark";
import { useWindowDimensions, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useStyles } from "../card-styles";

type CardActionsProps = {
  handleConfirm: () => void;
  onConfirmPressIn?: () => void;
  onDownload: () => Promise<void>;
  downloadDisabled: boolean;
  downloadCoachmarkId?: string;
  confirmCoachmarkId?: string;
  confirmDisabled?: boolean;
  confirmLabel?: string;
  hidden?: boolean;
  edgeAligned?: boolean;
};

export function CardActions({
  handleConfirm,
  onConfirmPressIn,
  onDownload,
  downloadDisabled,
  downloadCoachmarkId,
  confirmCoachmarkId,
  confirmDisabled = false,
  confirmLabel = "OK",
  hidden = false,
  edgeAligned = false,
}: CardActionsProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  const { fontScale, width } = useWindowDimensions();
  const { accessibilityPreferences } = useSettings();
  const stacked =
    !edgeAligned && (width < 360 || fontScale > 1.2 || accessibilityPreferences.largeFontEnabled);
  const buttonWidth = stacked || edgeAligned ? "100%" : 140;

  if (hidden) {
    return null;
  }

  const downloadButton = (
    <MyButton
      text={t("flashcards.card.actions.addFlashcards")}
      color="my_yellow"
      width={buttonWidth}
      onPress={onDownload}
      disabled={downloadDisabled}
      textStyle={styles.cardActionButtonText}
    />
  );

  return (
    <View
      style={[
        styles.containerButton,
        stacked && styles.containerButtonStacked,
        edgeAligned && { width: "100%", justifyContent: "space-between" },
      ]}
      collapsable={false}
    >
      <View style={edgeAligned ? { flex: 1 } : undefined}>
      {downloadCoachmarkId ? (
        <CoachmarkAnchor id={downloadCoachmarkId} shape="rect" radius={18} style={edgeAligned ? { width: "100%" } : undefined}>
          <View collapsable={false}>{downloadButton}</View>
        </CoachmarkAnchor>
      ) : (
        downloadButton
      )}
      </View>
      <View style={edgeAligned ? { flex: 1 } : undefined}>
      {confirmCoachmarkId ? (
        <CoachmarkAnchor id={confirmCoachmarkId} shape="rect" radius={18} style={edgeAligned ? { width: "100%" } : undefined}>
          <View collapsable={false}>
            <MyButton
              width={buttonWidth}
              text={confirmLabel}
              color="my_green"
              disabled={confirmDisabled}
              onPressIn={onConfirmPressIn}
              onPress={handleConfirm}
            />
          </View>
        </CoachmarkAnchor>
      ) : (
        <MyButton
          width={buttonWidth}
          text={confirmLabel}
          color="my_green"
          disabled={confirmDisabled}
          onPressIn={onConfirmPressIn}
          onPress={handleConfirm}
        />
      )}
      </View>
    </View>
  );
}
