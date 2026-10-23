import {
  getFaceDurationForGameplayEvent,
  getFaceForGameplayEvent,
  getIdleFaceForBox,
  pickBoxSelectionFace,
  type BoxFaceGameplayEvent,
  type BoxFaceState,
  type BoxFacesByBox,
} from "@/src/components/Box/Skin/boxFaces";
import type { BoxesState } from "@/src/types/boxes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";

type BoxKey = keyof BoxesState;
type BoxFaceEntries = Partial<Record<BoxKey, BoxFaceState>>;
type ControllerState = {
  boxStates: BoxFaceEntries;
  correctStreak: number;
  wrongStreak: number;
};
type UseBoxFacesControllerParams = {
  boxes: BoxesState;
  activeBox: BoxKey | null;
  isFocused: boolean;
  resetKey: string | number | null;
  /** Initial hydration establishes content counts without a wake-up reaction. */
  isReady?: boolean;
};

function initialState(boxes: BoxesState): ControllerState {
  return {
    boxStates: Object.fromEntries(Object.keys(boxes).map((box) => [box, {}])),
    correctStreak: 0,
    wrongStreak: 0,
  };
}

function eventPriority(event?: BoxFaceGameplayEvent) {
  if (!event) return 0;
  if (event === "awakened") return 1;
  if (event === "selected" || event === "blocked") return 2;
  return 3;
}

export function useBoxFacesController({ boxes, isFocused, resetKey, isReady = true }: UseBoxFacesControllerParams) {
  const [state, setState] = useState(() => initialState(boxes));
  const stateRef = useRef(state);
  const timers = useRef<Partial<Record<BoxKey, ReturnType<typeof setTimeout>>>>({});
  const scope = useRef({ isFocused, resetKey, isReady, lastBoxCount: boxes.boxFive?.length });
  const appActive = useRef(AppState.currentState !== "background" && AppState.currentState !== "inactive");

  // Commit the ref synchronously so batched answer callbacks see previous answers.
  const commit = useCallback((next: ControllerState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const clearTimer = useCallback((box: BoxKey) => {
    if (timers.current[box] != null) clearTimeout(timers.current[box]);
    delete timers.current[box];
  }, []);

  const clearTimers = useCallback(() => {
    (Object.keys(timers.current) as BoxKey[]).forEach(clearTimer);
  }, [clearTimer]);

  const triggerEvent = useCallback((box: BoxKey, event: BoxFaceGameplayEvent, next = stateRef.current) => {
    if (!isFocused || !isReady || !appActive.current || !next.boxStates[box]) return;
    if (eventPriority(event) < eventPriority(next.boxStates[box]?.transientEvent)) return;
    // Draw only after the reaction has been accepted, never during rendering.
    const transientFace = event === "selected" ? pickBoxSelectionFace() : getFaceForGameplayEvent(event);
    clearTimer(box);
    commit({
      ...next,
      boxStates: { ...next.boxStates, [box]: { transientFace, transientEvent: event } },
    });
    const timer = setTimeout(() => {
      // A cancelled or removed reaction must never clear its replacement.
      if (timers.current[box] !== timer) return;
      delete timers.current[box];
      const current = stateRef.current;
      if (!current.boxStates[box]) return;
      commit({ ...current, boxStates: { ...current.boxStates, [box]: {} } });
    }, getFaceDurationForGameplayEvent(event));
    timers.current[box] = timer;
  }, [clearTimer, commit, isFocused, isReady]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    const previous = scope.current;
    const lastBoxCount = boxes.boxFive?.length;
    scope.current = { isFocused, resetKey, isReady, lastBoxCount };
    if (previous.isFocused !== isFocused || previous.resetKey !== resetKey) {
      clearTimers();
      commit(initialState(boxes));
      return;
    }
    const current = stateRef.current;
    const keys = Object.keys(boxes) as BoxKey[];
    const previousKeys = Object.keys(current.boxStates) as BoxKey[];
    previousKeys.filter((box) => !keys.includes(box)).forEach(clearTimer);
    if (keys.length !== previousKeys.length || keys.some((box) => !current.boxStates[box])) {
      commit({
        ...current,
        boxStates: Object.fromEntries(keys.map((box) => [box, current.boxStates[box] ?? {}])),
      });
    }
    if (previous.isReady && isReady && previous.lastBoxCount === 0 && lastBoxCount != null && lastBoxCount > 0) {
      triggerEvent("boxFive", "awakened");
    }
  }, [boxes, isFocused, resetKey, isReady, clearTimer, clearTimers, commit, triggerEvent]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (status) => {
      appActive.current = status === "active";
      if (appActive.current) return;
      clearTimers();
      const current = stateRef.current;
      commit({
        ...current,
        boxStates: Object.fromEntries(Object.keys(current.boxStates).map((box) => [box, {}])),
      });
    });
    return () => subscription.remove();
  }, [clearTimers, commit]);

  const handleSelection = useCallback((box: BoxKey) => triggerEvent(box, "selected"), [triggerEvent]);
  const handleBlockedInteraction = useCallback((box: BoxKey) => triggerEvent(box, "blocked"), [triggerEvent]);

  const handleCorrectAnswer = useCallback((box: BoxKey, options?: { preferLove?: boolean }) => {
    const current = stateRef.current;
    const correctStreak = current.correctStreak + 1;
    const event = options?.preferLove ? "success"
      : current.wrongStreak >= 2 ? "recovered"
      : correctStreak === 3 ? "streakThree"
      : correctStreak === 5 ? "streakFive"
      : "correct";
    triggerEvent(box, event, { ...current, correctStreak, wrongStreak: 0 });
  }, [triggerEvent]);

  const handleWrongAnswer = useCallback((box: BoxKey) => {
    const current = stateRef.current;
    const wrongStreak = current.wrongStreak + 1;
    triggerEvent(box, wrongStreak >= 3 ? "meltdown" : "wrong", { ...current, correctStreak: 0, wrongStreak });
  }, [triggerEvent]);

  const resetWrongStreak = useCallback((_box: BoxKey) => {
    commit({ ...stateRef.current, wrongStreak: 0 });
  }, [commit]);

  const faces = useMemo<BoxFacesByBox>(() => Object.fromEntries(
    (Object.keys(boxes) as BoxKey[]).map((box) => [
      box,
      (isFocused ? state.boxStates[box]?.transientFace : undefined) ?? getIdleFaceForBox(box, boxes[box].length),
    ])
  ), [boxes, isFocused, state.boxStates]);

  return { faces, ...state, handleSelection, handleBlockedInteraction, handleCorrectAnswer, handleWrongAnswer, resetWrongStreak };
}
