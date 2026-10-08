import type { ComponentProps } from "react";
import { FlashcardsButtons } from "@/src/components/flashcards/FlashcardsButtons";
import type { useFlashcardActionBarState } from "../hooks/useFlashcardActionBarState";

type ActionState = Pick<ReturnType<typeof useFlashcardActionBarState>,
  | "shouldShowTrueFalseActions" | "trueFalseActionsDisabled"
  | "handleTrueFalseAnswer" | "trueFalseActionsMode" | "handleTrueFalseOk"
  | "effectiveTrueFalseButtonsVariant" | "selectedTrueFalseAnswer"
  | "showCardActions" | "handleCardActionsConfirm"
  | "cardActionsDownloadDisabled" | "cardActionsConfirmDisabled"
  | "cardActionsConfirmLabel"
>;
type ButtonProps = ComponentProps<typeof FlashcardsButtons>;
type FlashcardsStudyButtonsProps = Partial<Omit<ButtonProps, "position" | "align">> & {
  position: ButtonProps["position"];
  isTabletLayout: boolean;
  dominantHand: "left" | "center" | "right";
  actionState: ActionState;
};

export function FlashcardsStudyButtons({
  position, isTabletLayout, dominantHand, actionState, ...props
}: FlashcardsStudyButtonsProps) {
  return (
    <FlashcardsButtons
      position={position}
      align={position === "bottom" && isTabletLayout ? dominantHand : "center"}
      showTrueFalseActions={actionState.shouldShowTrueFalseActions}
      trueFalseActionsDisabled={actionState.trueFalseActionsDisabled}
      onTrueFalseAnswer={actionState.handleTrueFalseAnswer}
      trueFalseActionsMode={actionState.trueFalseActionsMode}
      onTrueFalseOk={actionState.handleTrueFalseOk}
      trueFalseButtonsVariant={actionState.effectiveTrueFalseButtonsVariant}
      selectedTrueFalseAnswer={actionState.selectedTrueFalseAnswer}
      showCardActions={actionState.showCardActions}
      onCardActionsConfirm={actionState.handleCardActionsConfirm}
      downloadDisabled={actionState.cardActionsDownloadDisabled}
      confirmDisabled={actionState.cardActionsConfirmDisabled}
      confirmLabel={actionState.cardActionsConfirmLabel}
      {...props}
    />
  );
}
