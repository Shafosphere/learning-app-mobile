import { useEffect, useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";
import type { TextInput } from "react-native";

import type { FocusTarget } from "./card-types";

type FocusExecutorRefs = Record<
  Exclude<FocusTarget, "none">,
  RefObject<TextInput | null>
>;

type UseFocusExecutorArgs = {
  suspended?: boolean;
  scopeKey?: number | null;
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
  suspended = false,
  scopeKey,
  focusTarget,
  focusRequestId,
  refs,
  onFocusAttempt,
}: UseFocusExecutorArgs) {
  const timeoutIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const activeTargetRef = useRef<FocusTarget>("none");
  const onFocusAttemptRef = useRef(onFocusAttempt);
  const suspendedFocusRef = useRef<{ target: FocusTarget; scopeKey: number | null | undefined } | null>(null);

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

    if (suspended) {
      if (!suspendedFocusRef.current) {
        const target = (Object.keys(refs) as Exclude<FocusTarget, "none">[])
          .find((key) => refs[key].current?.isFocused?.()) ?? "none";
        suspendedFocusRef.current = { target, scopeKey };
      }
      Object.values(refs).forEach((ref) => ref.current?.blur());
      activeTargetRef.current = "none";
      return;
    }

    const savedFocus = suspendedFocusRef.current;
    suspendedFocusRef.current = null;
    if (savedFocus) {
      if (savedFocus.scopeKey !== scopeKey || savedFocus.target === "none" || focusTarget === "none") return;
      // Let the native modal fade out before restoring the keyboard.
      const target = refs[savedFocus.target];
      const timer = setTimeout(() => {
        target.current?.focus();
        activeTargetRef.current = savedFocus.target;
      }, 250);
      timeoutIdsRef.current.push(timer);
      return;
    }

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
  }, [focusRequestId, focusTarget, refs, scopeKey, suspended]);
}
