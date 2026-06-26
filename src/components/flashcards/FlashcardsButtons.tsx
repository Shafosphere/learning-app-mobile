import React from "react";
import { View } from "react-native";
import { CoachmarkAnchor } from "@edwardloopez/react-native-coachmark";

import { CardActions } from "@/src/components/card/subcomponents/CardActions";
import type { TrueFalseButtonsVariant } from "@/src/contexts/SettingsContext";
import { useStyles } from "@/src/screens/flashcards/FlashcardsScreen/FlashcardsScreen-styles";
import { TrueFalseActions, TrueFalseActionsAnimated } from "@/src/components/flashcards/TrueFalseActions";

type FlashcardsButtonsProps = {
  position: "top" | "bottom";
  align?: "left" | "center" | "right";
  coachmarkId?: string;
  contentWidth?: number;

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
  onCardActionsConfirmPressIn?: () => void;
  onDownload?: () => Promise<void>;
  downloadDisabled?: boolean;
  downloadCoachmarkId?: string;
  confirmCoachmarkId?: string;
  confirmDisabled?: boolean;
  confirmLabel?: string;
};

export const FlashcardsButtons: React.FC<FlashcardsButtonsProps> = ({
  position,
  align = "center",
  coachmarkId,
  contentWidth,
  showTrueFalseActions,
  trueFalseActionsDisabled,
  onTrueFalseAnswer,
  trueFalseActionsMode = "answer",
  onTrueFalseOk,
  trueFalseButtonsVariant = "true_false",
  selectedTrueFalseAnswer = null,
  showCardActions,
  onCardActionsConfirm,
  onCardActionsConfirmPressIn,
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
  const contentWidthStyle =
    contentWidth != null
      ? { width: contentWidth, maxWidth: "100%" as const }
      : null;
  const alignItems: "flex-start" | "center" | "flex-end" =
    align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";
  const outerAlignStyle = {
    width: "100%" as const,
    alignItems,
    ...(position === "bottom" && align !== "center"
      ? { paddingHorizontal: 16 }
      : null),
  };
  const innerAlignStyle = { alignItems };
  const hiddenAccessibilityProps = {
    accessibilityElementsHidden: true,
    importantForAccessibility: "no-hide-descendants" as const,
  };

  const contentBody = (
    <>
      {position === "bottom" ? (
        <View
          style={!showTrueFalseActions ? hiddenStyle : undefined}
          pointerEvents={showTrueFalseActions ? "auto" : "none"}
          collapsable={false}
          {...(!showTrueFalseActions ? hiddenAccessibilityProps : undefined)}
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
          {...(!showTrueFalseActions ? hiddenAccessibilityProps : undefined)}
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
        {...(!showCardActions ? hiddenAccessibilityProps : undefined)}
      >
        <CardActions
          handleConfirm={onCardActionsConfirm ?? noop}
          onConfirmPressIn={onCardActionsConfirmPressIn}
          onDownload={onDownload ?? noopAsync}
          downloadDisabled={downloadDisabled}
          downloadCoachmarkId={downloadCoachmarkId}
          confirmCoachmarkId={confirmCoachmarkId}
          confirmDisabled={confirmDisabled}
          confirmLabel={confirmLabel}
        />
      </View>
    </>
  );

  if (!coachmarkId) {
    return (
      <View style={outerAlignStyle}>
        <View collapsable={false} style={[contentWidthStyle, innerAlignStyle]}>
          {contentBody}
        </View>
      </View>
    );
  }

  return (
    <View style={outerAlignStyle}>
      <CoachmarkAnchor
        id={coachmarkId}
        shape="rect"
        radius={24}
        style={contentWidthStyle ?? undefined}
      >
        <View collapsable={false} style={[contentWidthStyle, innerAlignStyle]}>
          {contentBody}
        </View>
      </CoachmarkAnchor>
    </View>
  );
};
