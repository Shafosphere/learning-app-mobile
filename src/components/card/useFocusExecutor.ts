import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { TextInput } from "react-native";

import type { FocusTarget, KeyboardMode } from "./card-types";

type FocusExecutorRefs = Record<
  Exclude<FocusTarget, "none">,
  RefObject<TextInput | null>
>;

type UseFocusExecutorArgs = {
  focusTarget: FocusTarget;
  keyboardMode: KeyboardMode;
  focusRequestId: number;
  refs: FocusExecutorRefs;
};

const DEFAULT_FOCUS_DELAY_MS = 50;
const HANGUL_TO_SYSTEM_DELAY_MS = 200;

export function useFocusExecutor({
  focusTarget,
  keyboardMode,
  focusRequestId,
  refs,
}: UseFocusExecutorArgs) {
  const timeoutIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const activeTargetRef = useRef<FocusTarget>("none");
  const previousKeyboardModeRef = useRef<KeyboardMode>(keyboardMode);

  useEffect(() => {
    return () => {
      timeoutIdsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutIdsRef.current = [];
    };
  }, []);

  useEffect(() => {
    timeoutIdsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    timeoutIdsRef.current = [];

    const blurTarget =
      activeTargetRef.current === "none" ? null : refs[activeTargetRef.current];

    if (focusTarget === "none") {
      blurTarget?.current?.blur();
      activeTargetRef.current = "none";
      previousKeyboardModeRef.current = keyboardMode;
      return;
    }

    if (activeTargetRef.current !== "none" && activeTargetRef.current !== focusTarget) {
      refs[activeTargetRef.current].current?.blur();
    }

    const delay =
      previousKeyboardModeRef.current === "hangul" && keyboardMode === "system"
        ? HANGUL_TO_SYSTEM_DELAY_MS
        : DEFAULT_FOCUS_DELAY_MS;

    const timeoutId = setTimeout(() => {
      refs[focusTarget].current?.focus();
      activeTargetRef.current = focusTarget;
    }, delay);

    timeoutIdsRef.current.push(timeoutId);
    previousKeyboardModeRef.current = keyboardMode;
  }, [focusRequestId, focusTarget, keyboardMode, refs]);
}
