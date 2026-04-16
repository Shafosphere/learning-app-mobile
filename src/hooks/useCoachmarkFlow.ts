import {
  createTour,
  useCoachmarkContext,
} from "@edwardloopez/react-native-coachmark";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CoachmarkAdvanceEvent,
  CoachmarkFlowStep,
} from "@/src/constants/coachmarkFlows";

type UseCoachmarkFlowParams = {
  flowKey: string;
  storageKey: string;
  shouldStart: boolean;
  steps: CoachmarkFlowStep[];
  completionState?: Partial<Record<CoachmarkAdvanceEvent, boolean>>;
  restartToken?: string | string[] | undefined;
};

export function useCoachmarkFlow({
  flowKey,
  storageKey,
  shouldStart,
  steps,
  completionState,
  restartToken,
}: UseCoachmarkFlowParams) {
  const { start, next, back, stop, state } = useCoachmarkContext();
  const [isReady, setIsReady] = useState(false);
  const [hasSeen, setHasSeen] = useState(true);
  const startAttemptedRef = useRef(false);
  const autoAdvanceStepIdRef = useRef<string | null>(null);
  const autoAdvancedStepIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (restartToken == null || restartToken === "") return;
    startAttemptedRef.current = false;
    autoAdvanceStepIdRef.current = null;
    autoAdvancedStepIdsRef.current.clear();
    setHasSeen(false);
    setIsReady(true);
  }, [restartToken]);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(storageKey)
      .then((value) => {
        if (!mounted) return;
        if (restartToken != null && restartToken !== "") {
          setHasSeen(false);
          return;
        }
        setHasSeen(value === "1");
      })
      .catch((error) => {
        console.warn("[Coachmark] Failed to hydrate flow visibility", error);
        if (mounted) setHasSeen(false);
      })
      .finally(() => {
        if (mounted) setIsReady(true);
      });

    return () => {
      mounted = false;
    };
  }, [restartToken, storageKey]);

  const isActive = state.isActive && state.activeTour?.key === flowKey;
  const currentStep = isActive ? steps[state.index] ?? null : null;
  const isPendingStart =
    isReady && !hasSeen && shouldStart && !isActive && !startAttemptedRef.current;

  useEffect(() => {
    if (!isReady || hasSeen || !shouldStart || isActive || startAttemptedRef.current) {
      return;
    }

    startAttemptedRef.current = true;
    autoAdvanceStepIdRef.current = null;
    autoAdvancedStepIdsRef.current.clear();
    let didStart = false;
    const timeout = setTimeout(() => {
      didStart = true;
      void start(
        createTour(
          flowKey,
          steps.map((step) => ({
            id: step.targetId,
            title: step.titleKey,
            description: step.descriptionKey,
          }))
        )
      );
    }, 600);

    return () => {
      clearTimeout(timeout);
      if (!didStart) {
        startAttemptedRef.current = false;
      }
    };
  }, [flowKey, hasSeen, isActive, isReady, shouldStart, start, steps]);

  useEffect(() => {
    if (!currentStep) {
      autoAdvanceStepIdRef.current = null;
      return;
    }
    if (currentStep.advanceOn === "manual" || currentStep.advanceOn === "press_next") {
      autoAdvanceStepIdRef.current = null;
      return;
    }
    if (!completionState?.[currentStep.advanceOn]) {
      autoAdvanceStepIdRef.current = null;
      return;
    }
    if (autoAdvancedStepIdsRef.current.has(currentStep.id)) {
      autoAdvanceStepIdRef.current = currentStep.id;
      return;
    }
    if (autoAdvanceStepIdRef.current === currentStep.id) {
      return;
    }
    autoAdvanceStepIdRef.current = currentStep.id;

    const timeout = setTimeout(() => {
      autoAdvancedStepIdsRef.current.add(currentStep.id);
      next();
    }, currentStep.autoAdvanceDelayMs ?? 180);
    return () => clearTimeout(timeout);
  }, [completionState, currentStep, next]);

  const finishFlow = useCallback(async () => {
    await AsyncStorage.setItem(storageKey, "1");
    autoAdvanceStepIdRef.current = null;
    autoAdvancedStepIdsRef.current.clear();
    setHasSeen(true);
    await stop("completed");
  }, [storageKey, stop]);

  const canAdvanceCurrentStep = Boolean(
    currentStep &&
      (
        currentStep.advanceOn === "manual" ||
        (
          currentStep.advanceOn !== "press_next" &&
          completionState?.[currentStep.advanceOn] === true
        )
      )
  );

  const goNext = useCallback(async () => {
    if (!currentStep || !canAdvanceCurrentStep) return;
    const isLast = state.index >= steps.length - 1;
    if (isLast) {
      await finishFlow();
      return;
    }
    next();
  }, [canAdvanceCurrentStep, currentStep, finishFlow, next, state.index, steps.length]);

  const advanceByEvent = useCallback(async (event: CoachmarkAdvanceEvent) => {
    if (!currentStep || currentStep.advanceOn !== event) return false;
    const isLast = state.index >= steps.length - 1;
    if (isLast) {
      await finishFlow();
      return true;
    }
    next();
    return true;
  }, [currentStep, finishFlow, next, state.index, steps.length]);

  const goBack = useCallback(() => {
    if (!isActive || state.index <= 0) return;
    back();
  }, [back, isActive, state.index]);

  return useMemo(
    () => ({
      isActive,
      isPendingStart,
      hasSeen,
      isReady,
      currentStep,
      currentIndex: isActive ? state.index : -1,
      totalSteps: steps.length,
      canGoBack: isActive && state.index > 0,
      canGoNext: canAdvanceCurrentStep,
      goBack,
      goNext,
      advanceByEvent,
    }),
    [
      advanceByEvent,
      canAdvanceCurrentStep,
      currentStep,
      goBack,
      goNext,
      hasSeen,
      isActive,
      isPendingStart,
      isReady,
      state.index,
      steps.length,
    ]
  );
}
