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
};

const FOCUS_RETRY_DELAYS_MS = [50, 120];

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

  useLayoutEffect(() => {
    timeoutIdsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    timeoutIdsRef.current = [];

    const blurTarget =
      activeTargetRef.current === "none" ? null : refs[activeTargetRef.current];

    if (focusTarget === "none") {
      blurTarget?.current?.blur();
      activeTargetRef.current = "none";
      return;
    }

    const targetRef = refs[focusTarget];
    targetRef.current?.focus();
    activeTargetRef.current = focusTarget;

    FOCUS_RETRY_DELAYS_MS.forEach((delay) => {
      const timeoutId = setTimeout(() => {
        targetRef.current?.focus();
      }, delay);
      timeoutIdsRef.current.push(timeoutId);
    });
  }, [focusRequestId, focusTarget, refs]);
}
