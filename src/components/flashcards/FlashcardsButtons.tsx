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
  selectedTrueFalseAnswer?: boolean | null;

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
  selectedTrueFalseAnswer = null,
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
  const hiddenStyle = { opacity: 0, height: 0, overflow: "hidden" as const };

  return (
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
          confirmDisabled={confirmDisabled}
          confirmLabel={confirmLabel}
        />
      </View>
    </View>
  );
};
