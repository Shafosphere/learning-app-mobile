import React from "react";
import { View } from "react-native";

import { CardActions } from "@/src/components/card/subcomponents/CardActions";
import type { TrueFalseButtonsVariant } from "@/src/contexts/SettingsContext";
import { useStyles } from "@/src/screens/flashcards/FlashcardsScreen-styles";
import { TrueFalseActions, TrueFalseActionsAnimated } from "@/src/screens/flashcards/TrueFalseActions";

export type FlashcardsButtonsProps = {
  position: "top" | "bottom";

  // True/False Actions
  showTrueFalseActions: boolean;
  trueFalseActionsDisabled: boolean;
  onTrueFalseAnswer: (val: boolean) => void;
  trueFalseActionsMode?: "answer" | "ok";
  onTrueFalseOk?: () => void;
  trueFalseButtonsVariant?: TrueFalseButtonsVariant;

  // Card Actions (Download + OK)
  showCardActions: boolean;
  onCardActionsConfirm?: () => void;
  onDownload?: () => Promise<void>;
  downloadDisabled?: boolean;
  confirmDisabled?: boolean;
  confirmLabel?: string;
};

export const FlashcardsButtons: React.FC<FlashcardsButtonsProps> = ({
  position,
  showTrueFalseActions,
  trueFalseActionsDisabled,
  onTrueFalseAnswer,
  trueFalseActionsMode = "answer",
  onTrueFalseOk,
  trueFalseButtonsVariant = "true_false",
  showCardActions,
  onCardActionsConfirm,
  onDownload,
  downloadDisabled = false,
  confirmDisabled = false,
  confirmLabel = "OK",
}) => {
  const styles = useStyles();
  const noopAsync = React.useCallback(async () => undefined, []);
  const noop = React.useCallback(() => undefined, []);

  return (
    <View collapsable={false}>
      {position === "bottom" ? (
        showTrueFalseActions ? (
          <TrueFalseActionsAnimated
            visible={showTrueFalseActions}
            disabled={trueFalseActionsDisabled}
            onAnswer={onTrueFalseAnswer}
            onOk={onTrueFalseOk}
            mode={trueFalseActionsMode}
            dense
            variant={trueFalseButtonsVariant}
          />
        ) : null
      ) : (
        <View
          style={[
            styles.topActionsWrapper,
            !showTrueFalseActions && { opacity: 0, height: 0 },
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
          />
        </View>
      )}

      {showCardActions ? (
        <CardActions
          handleConfirm={onCardActionsConfirm ?? noop}
          onDownload={onDownload ?? noopAsync}
          downloadDisabled={downloadDisabled}
          confirmDisabled={confirmDisabled}
          confirmLabel={confirmLabel}
        />
      ) : null}
    </View>
  );
};
