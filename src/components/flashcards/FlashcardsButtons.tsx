import React from "react";
import { View } from "react-native";
import { CoachmarkAnchor } from "@edwardloopez/react-native-coachmark";

import { CardActions } from "@/src/components/card/subcomponents/CardActions";
import type { TrueFalseButtonsVariant } from "@/src/contexts/SettingsContext";
import { useStyles } from "@/src/screens/flashcards/FlashcardsScreen/FlashcardsScreen-styles";
import { TrueFalseActions, TrueFalseActionsAnimated } from "@/src/components/flashcards/TrueFalseActions";

type FlashcardsButtonsProps = {
  position: "top" | "bottom";
  coachmarkId?: string;

  // True/False Actions
  showTrueFalseActions: boolean;
  trueFalseActionsDisabled: boolean;
  onTrueFalseAnswer: (val: boolean) => void;
  trueFalseActionsMode?: "answer" | "ok";
  onTrueFalseOk?: () => void;
  trueFalseButtonsVariant?: TrueFalseButtonsVariant;
  selectedTrueFalseAnswer?: boolean | null;

  // Card Actions (Download + OK)
  showCardActions: boolean;
  onCardActionsConfirm?: () => void;
  onDownload?: () => Promise<void>;
  downloadDisabled?: boolean;
  downloadCoachmarkId?: string;
  confirmCoachmarkId?: string;
  confirmDisabled?: boolean;
  confirmLabel?: string;
};

export const FlashcardsButtons: React.FC<FlashcardsButtonsProps> = ({
  position,
  coachmarkId,
  showTrueFalseActions,
  trueFalseActionsDisabled,
  onTrueFalseAnswer,
  trueFalseActionsMode = "answer",
  onTrueFalseOk,
  trueFalseButtonsVariant = "true_false",
  selectedTrueFalseAnswer = null,
  showCardActions,
  onCardActionsConfirm,
  onDownload,
  downloadDisabled = false,
  downloadCoachmarkId,
  confirmCoachmarkId,
  confirmDisabled = false,
  confirmLabel = "OK",
}) => {
  const styles = useStyles();
  const noopAsync = React.useCallback(async () => undefined, []);
  const noop = React.useCallback(() => undefined, []);
  const hiddenStyle = { opacity: 0, height: 0, overflow: "hidden" as const };

  const content = (
    <View collapsable={false}>
      {position === "bottom" ? (
        <View
          style={!showTrueFalseActions ? hiddenStyle : undefined}
          pointerEvents={showTrueFalseActions ? "auto" : "none"}
          collapsable={false}
        >
          <TrueFalseActionsAnimated
            visible={showTrueFalseActions}
            disabled={trueFalseActionsDisabled}
            onAnswer={onTrueFalseAnswer}
            onOk={onTrueFalseOk}
            mode={trueFalseActionsMode}
            dense
            variant={trueFalseButtonsVariant}
            selectedAnswer={selectedTrueFalseAnswer}
          />
        </View>
      ) : (
        <View
          style={[
            styles.topActionsWrapper,
            !showTrueFalseActions && hiddenStyle,
          ]}
          pointerEvents={showTrueFalseActions ? "auto" : "none"}
          collapsable={false}
        >
          <TrueFalseActions
            disabled={trueFalseActionsDisabled}
            onAnswer={onTrueFalseAnswer}
            onOk={onTrueFalseOk}
            mode={trueFalseActionsMode}
            dense
            variant={trueFalseButtonsVariant}
            selectedAnswer={selectedTrueFalseAnswer}
          />
        </View>
      )}

      <View
        style={!showCardActions ? hiddenStyle : undefined}
        pointerEvents={showCardActions ? "auto" : "none"}
        collapsable={false}
      >
        <CardActions
          handleConfirm={onCardActionsConfirm ?? noop}
          onDownload={onDownload ?? noopAsync}
          downloadDisabled={downloadDisabled}
          downloadCoachmarkId={downloadCoachmarkId}
          confirmCoachmarkId={confirmCoachmarkId}
          confirmDisabled={confirmDisabled}
          confirmLabel={confirmLabel}
        />
      </View>
    </View>
  );

  if (!coachmarkId) {
    return content;
  }

  return (
    <CoachmarkAnchor
      id={coachmarkId}
      shape="rect"
      radius={24}
      style={{ alignSelf: "center" }}
    >
      <View collapsable={false} style={{ alignSelf: "center" }}>
        {content}
      </View>
    </CoachmarkAnchor>
  );
};
