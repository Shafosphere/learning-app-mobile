import type { PreviewOptionSelectorOption } from "@/src/components/selection/PreviewOptionSelector";
import { useHydratedPersistedState } from "@/src/hooks/usePersistedState";
import {
  consumeActionsPositionNudgePreview,
  subscribeActionsPositionNudgePreview,
} from "@/src/services/actionsPositionNudgePreview";
import type { TFunction } from "i18next";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ACTIONS_POSITION_NUDGE_TRIGGER_ANSWERS,
  bottomButtonsPreview,
  topButtonsPreview,
} from "../model/FlashcardsScreen.constants";

type ActionButtonsPosition = "top" | "bottom";

type UseActionsPositionNudgeParams = {
  isFocused: boolean;
  actionButtonsPosition: ActionButtonsPosition;
  setActionButtonsPosition: (
    position: ActionButtonsPosition,
  ) => void | Promise<void>;
  shouldShowBoxes: boolean;
  shouldRenderLoadingOverlay: boolean;
  isCoachmarkActive: boolean;
  isCoachmarkPendingStart: boolean;
  isHintCoachmarkActive: boolean;
  isHintCoachmarkPendingStart: boolean;
  t: TFunction;
};

export function useActionsPositionNudge({
  isFocused,
  actionButtonsPosition,
  setActionButtonsPosition,
  shouldShowBoxes,
  shouldRenderLoadingOverlay,
  isCoachmarkActive,
  isCoachmarkPendingStart,
  isHintCoachmarkActive,
  isHintCoachmarkPendingStart,
  t,
}: UseActionsPositionNudgeParams) {
  const [
    actionsPositionNudgeAnswerCount,
    setActionsPositionNudgeAnswerCount,
    isActionsPositionNudgeAnswerCountHydrated,
  ] = useHydratedPersistedState<number>(
    "flashcards.actionsPositionNudgeAnswerCount",
    0,
  );
  const [
    actionsPositionNudgeSeen,
    setActionsPositionNudgeSeen,
    isActionsPositionNudgeSeenHydrated,
  ] = useHydratedPersistedState<boolean>(
    "flashcards.actionsPositionNudgeSeen",
    false,
  );
  const [isVisible, setIsVisible] = useState(false);
  const [preview, setPreview] = useState<ActionButtonsPosition>("top");
  const isHydrated =
    isActionsPositionNudgeAnswerCountHydrated &&
    isActionsPositionNudgeSeenHydrated;

  const onAnsweredForNudge = useCallback(() => {
    if (!isHydrated) {
      return;
    }
    if (
      actionsPositionNudgeAnswerCount < ACTIONS_POSITION_NUDGE_TRIGGER_ANSWERS
    ) {
      void setActionsPositionNudgeAnswerCount(
        actionsPositionNudgeAnswerCount + 1,
      );
    }
  }, [
    actionsPositionNudgeAnswerCount,
    isHydrated,
    setActionsPositionNudgeAnswerCount,
  ]);

  const tryOpenActionsPositionNudgePreview = useCallback(() => {
    if (!isFocused) return;
    if (!consumeActionsPositionNudgePreview()) return;

    setIsVisible(true);
  }, [isFocused]);

  useEffect(() => {
    const unsubscribe = subscribeActionsPositionNudgePreview(() => {
      tryOpenActionsPositionNudgePreview();
    });

    return unsubscribe;
  }, [tryOpenActionsPositionNudgePreview]);

  useEffect(() => {
    tryOpenActionsPositionNudgePreview();
  }, [tryOpenActionsPositionNudgePreview]);

  useEffect(() => {
    if (!isFocused) return;
    if (!isHydrated) return;
    if (actionsPositionNudgeSeen) return;
    if (isVisible) return;
    if (
      actionsPositionNudgeAnswerCount < ACTIONS_POSITION_NUDGE_TRIGGER_ANSWERS
    ) {
      return;
    }
    if (actionButtonsPosition !== "top") return;
    if (!shouldShowBoxes || shouldRenderLoadingOverlay) return;
    if (
      isCoachmarkActive ||
      isCoachmarkPendingStart ||
      isHintCoachmarkActive ||
      isHintCoachmarkPendingStart
    )
      return;

    setIsVisible(true);
    void setActionsPositionNudgeSeen(true);
  }, [
    actionButtonsPosition,
    actionsPositionNudgeAnswerCount,
    actionsPositionNudgeSeen,
    isCoachmarkActive,
    isCoachmarkPendingStart,
    isFocused,
    isHintCoachmarkActive,
    isHintCoachmarkPendingStart,
    isHydrated,
    isVisible,
    setActionsPositionNudgeSeen,
    shouldRenderLoadingOverlay,
    shouldShowBoxes,
  ]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    setPreview(actionButtonsPosition);
  }, [actionButtonsPosition, isVisible]);

  useEffect(() => {
    if (isFocused || !isVisible) {
      return;
    }

    setIsVisible(false);
  }, [isFocused, isVisible]);

  const handleConfirm = useCallback(async () => {
    if (preview !== actionButtonsPosition) {
      await setActionButtonsPosition(preview);
    }
    setIsVisible(false);
  }, [actionButtonsPosition, preview, setActionButtonsPosition]);

  const handleClose = useCallback(() => {
    setPreview(actionButtonsPosition);
    setIsVisible(false);
  }, [actionButtonsPosition]);

  const handlePreviewSelect = useCallback((position: ActionButtonsPosition) => {
    setPreview(position);
  }, []);

  const options = useMemo<PreviewOptionSelectorOption<ActionButtonsPosition>[]>(
    () => [
      {
        key: "top",
        label: t("settings.appearance.actionsSelector.top"),
        preview: topButtonsPreview,
      },
      {
        key: "bottom",
        label: t("settings.appearance.actionsSelector.bottom"),
        preview: bottomButtonsPreview,
      },
    ],
    [t],
  );

  return {
    isVisible,
    preview,
    options,
    handleConfirm,
    handleClose,
    handlePreviewSelect,
    onAnsweredForNudge,
  };
}
