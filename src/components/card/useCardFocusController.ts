import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { FocusTarget } from "./card-types";

type CardFocusControllerArgs = {
  isFocused: boolean;
  selectedItemId: number | null;
  result: boolean | null;
  isIntroMode: boolean;
  showCorrectionInputs: boolean;
  correctionCardId: number | null;
  correctionPrimaryTarget: Exclude<FocusTarget, "none" | "main" | "hint">;
  isEditingHint: boolean;
};

type CardFocusControllerResult = {
  focusTarget: FocusTarget;
  focusRequestId: number;
  requestFocus: (target: FocusTarget) => void;
  clearFocus: () => void;
  onCorrection1Completed: () => void;
  onHintEditStarted: () => void;
  onHintEditFinished: () => void;
};

const buildDefaultFocusTarget = ({
  isFocused,
  isEditingHint,
  selectedItemId,
  showCorrectionInputs,
  correctionPrimaryTarget,
}: Pick<
  CardFocusControllerArgs,
  "isFocused" | "isEditingHint" | "selectedItemId" | "showCorrectionInputs" | "correctionPrimaryTarget"
>): FocusTarget => {
  if (!isFocused) return "none";
  if (isEditingHint) return "hint";
  if (selectedItemId == null) return "none";
  if (showCorrectionInputs) return correctionPrimaryTarget;
  return "main";
};

export function useCardFocusController({
  isFocused,
  selectedItemId,
  result,
  isIntroMode,
  showCorrectionInputs,
  correctionCardId,
  correctionPrimaryTarget,
  isEditingHint,
}: CardFocusControllerArgs): CardFocusControllerResult {
  const [focusTarget, setFocusTarget] = useState<FocusTarget>("none");
  const [focusRequestId, setFocusRequestId] = useState(0);
  const [hasSkippedInitialAutofocus, setHasSkippedInitialAutofocus] =
    useState(false);
  const previousSelectedItemIdRef = useRef<number | null>(null);
  const previousResultRef = useRef<boolean | null>(null);
  const previousIntroModeRef = useRef(isIntroMode);
  const previousCorrectionCardIdRef = useRef<number | null>(null);

  const updateFocusTarget = useCallback((target: FocusTarget) => {
    setFocusTarget(target);
    setFocusRequestId((prev) => prev + 1);
  }, []);

  const requestFocus = useCallback(
    (target: FocusTarget) => {
      updateFocusTarget(target);
    },
    [updateFocusTarget],
  );

  const clearFocus = useCallback(() => {
    updateFocusTarget("none");
  }, [updateFocusTarget]);

  const onCorrection1Completed = useCallback(() => {
    requestFocus("correction2");
  }, [requestFocus]);

  const onHintEditStarted = useCallback(() => {
    requestFocus("hint");
  }, [requestFocus]);

  const defaultFocusTarget = useMemo(
    () =>
      buildDefaultFocusTarget({
        isFocused,
        isEditingHint,
        selectedItemId,
        showCorrectionInputs,
        correctionPrimaryTarget,
      }),
    [
      correctionPrimaryTarget,
      isEditingHint,
      isFocused,
      selectedItemId,
      showCorrectionInputs,
    ],
  );

  const onHintEditFinished = useCallback(() => {
    requestFocus(defaultFocusTarget);
  }, [defaultFocusTarget, requestFocus]);

  useEffect(() => {
    if (!isFocused) {
      clearFocus();
    }
  }, [clearFocus, isFocused]);

  useEffect(() => {
    if (isEditingHint) {
      onHintEditStarted();
      return;
    }
    if (focusTarget === "hint") {
      onHintEditFinished();
    }
  }, [focusTarget, isEditingHint, onHintEditFinished, onHintEditStarted]);

  useEffect(() => {
    if (selectedItemId === previousSelectedItemIdRef.current) {
      return;
    }

    previousSelectedItemIdRef.current = selectedItemId;

    if (selectedItemId == null) {
      clearFocus();
      return;
    }

    if (!hasSkippedInitialAutofocus) {
      setHasSkippedInitialAutofocus(true);
      clearFocus();
      return;
    }

    requestFocus(defaultFocusTarget);
  }, [
    clearFocus,
    defaultFocusTarget,
    hasSkippedInitialAutofocus,
    requestFocus,
    selectedItemId,
  ]);

  useEffect(() => {
    const movedToCorrection =
      result === false && previousResultRef.current !== false;
    const backToMain = result !== false && previousResultRef.current === false;

    if (movedToCorrection && showCorrectionInputs) {
      requestFocus(correctionPrimaryTarget);
    } else if (backToMain && !isIntroMode) {
      requestFocus(defaultFocusTarget);
    }

    previousResultRef.current = result;
  }, [
    correctionPrimaryTarget,
    defaultFocusTarget,
    isIntroMode,
    requestFocus,
    result,
    showCorrectionInputs,
  ]);

  useEffect(() => {
    const enteredIntroMode = isIntroMode && !previousIntroModeRef.current;
    const exitedIntroMode = !isIntroMode && previousIntroModeRef.current;

    if (enteredIntroMode && showCorrectionInputs) {
      requestFocus(correctionPrimaryTarget);
    } else if (exitedIntroMode && result !== false) {
      requestFocus(defaultFocusTarget);
    }

    previousIntroModeRef.current = isIntroMode;
  }, [
    correctionPrimaryTarget,
    defaultFocusTarget,
    isIntroMode,
    requestFocus,
    result,
    showCorrectionInputs,
  ]);

  useEffect(() => {
    if (!showCorrectionInputs) {
      previousCorrectionCardIdRef.current = correctionCardId;
      return;
    }
    if (correctionCardId == null) return;
    if (correctionCardId === previousCorrectionCardIdRef.current) return;
    previousCorrectionCardIdRef.current = correctionCardId;
    requestFocus(correctionPrimaryTarget);
  }, [
    correctionCardId,
    correctionPrimaryTarget,
    requestFocus,
    showCorrectionInputs,
  ]);

  return {
    focusTarget,
    focusRequestId,
    requestFocus,
    clearFocus,
    onCorrection1Completed,
    onHintEditStarted,
    onHintEditFinished,
  };
}
