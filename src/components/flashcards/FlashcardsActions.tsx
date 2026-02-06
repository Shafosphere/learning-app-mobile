import React from "react";

import { useSettings } from "@/src/contexts/SettingsContext";
import type { TrueFalseButtonsVariant } from "@/src/contexts/SettingsContext";
import { TrueFalseActions, TrueFalseActionsAnimated } from "@/src/screens/flashcards/TrueFalseActions";
import { CardActions } from "@/src/components/card/subcomponents/CardActions";

type FlashcardsActionsProps = {
  placement: "inline" | "bottom";

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

export const FlashcardsActions: React.FC<FlashcardsActionsProps> = ({
  placement,
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
  const { actionButtonsPosition } = useSettings();
  const noopAsync = React.useCallback(async () => undefined, []);
  const noop = React.useCallback(() => undefined, []);

  const shouldRenderTrueFalse =
    showTrueFalseActions &&
    ((placement === "inline" && actionButtonsPosition === "top") ||
      (placement === "bottom" && actionButtonsPosition === "bottom"));

  if (shouldRenderTrueFalse) {
    if (placement === "bottom") {
      return (
        <TrueFalseActionsAnimated
          visible={showTrueFalseActions}
          disabled={trueFalseActionsDisabled}
          onAnswer={onTrueFalseAnswer}
          onOk={onTrueFalseOk}
          mode={trueFalseActionsMode}
          dense
          variant={trueFalseButtonsVariant}
        />
      );
    }
    return (
      <TrueFalseActions
        disabled={trueFalseActionsDisabled}
        onAnswer={onTrueFalseAnswer}
        onOk={onTrueFalseOk}
        mode={trueFalseActionsMode}
        dense
        variant={trueFalseButtonsVariant}
      />
    );
  }

  if (placement === "inline" && showCardActions) {
    return (
      <CardActions
        handleConfirm={onCardActionsConfirm ?? noop}
        onDownload={onDownload ?? noopAsync}
        downloadDisabled={downloadDisabled}
        confirmDisabled={confirmDisabled}
        confirmLabel={confirmLabel}
      />
    );
  }

  return null;
};
