import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { TextInput } from "react-native";

import type { FocusTarget } from "./card-types";

type FocusExecutorRefs = Record<
  Exclude<FocusTarget, "none">,
  RefObject<TextInput | null>
>;

type UseFocusExecutorArgs = {
  focusTarget: FocusTarget;
  focusRequestId: number;
  refs: FocusExecutorRefs;
};

const DEFAULT_FOCUS_DELAY_MS = 50;

export function useFocusExecutor({
  focusTarget,
  focusRequestId,
  refs,
}: UseFocusExecutorArgs) {
  const timeoutIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const activeTargetRef = useRef<FocusTarget>("none");

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
      return;
    }

    if (activeTargetRef.current !== "none" && activeTargetRef.current !== focusTarget) {
      refs[activeTargetRef.current].current?.blur();
    }

    const timeoutId = setTimeout(() => {
      refs[focusTarget].current?.focus();
      activeTargetRef.current = focusTarget;
    }, DEFAULT_FOCUS_DELAY_MS);

    timeoutIdsRef.current.push(timeoutId);
  }, [focusRequestId, focusTarget, refs]);
}
