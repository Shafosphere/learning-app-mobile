import { useEffect, useLayoutEffect, useRef } from "react";
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
  onFocusAttempt?: (event: {
    target: FocusTarget;
    phase: "initial" | "retry" | "blur";
    delayMs?: number;
    hasRef: boolean;
    previousTarget?: FocusTarget;
  }) => void;
};

const FOCUS_RETRY_DELAYS_MS = [50, 120];

export function useFocusExecutor({
  focusTarget,
  focusRequestId,
  refs,
  onFocusAttempt,
}: UseFocusExecutorArgs) {
  const timeoutIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const activeTargetRef = useRef<FocusTarget>("none");
  const onFocusAttemptRef = useRef(onFocusAttempt);

  onFocusAttemptRef.current = onFocusAttempt;

  useEffect(() => {
    return () => {
      timeoutIdsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutIdsRef.current = [];
    };
  }, []);

  useLayoutEffect(() => {
    timeoutIdsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    timeoutIdsRef.current = [];

    const blurTarget =
      activeTargetRef.current === "none" ? null : refs[activeTargetRef.current];

    if (focusTarget === "none") {
      const previousTarget = activeTargetRef.current;
      blurTarget?.current?.blur();
      activeTargetRef.current = "none";
      onFocusAttemptRef.current?.({
        target: "none",
        phase: "blur",
        hasRef: blurTarget?.current != null,
        previousTarget,
      });
      return;
    }

    const targetRef = refs[focusTarget];
    const focusCurrentTarget = (
      phase: "initial" | "retry",
      delayMs?: number,
    ) => {
      const hasRef = targetRef.current != null;
      targetRef.current?.focus();
      onFocusAttemptRef.current?.({
        target: focusTarget,
        phase,
        delayMs,
        hasRef,
      });
    };

    focusCurrentTarget("initial", 0);
    activeTargetRef.current = focusTarget;

    FOCUS_RETRY_DELAYS_MS.forEach((delay) => {
      const timeoutId = setTimeout(() => {
        focusCurrentTarget("retry", delay);
      }, delay);
      timeoutIdsRef.current.push(timeoutId);
    });
  }, [focusRequestId, focusTarget, refs]);
}
