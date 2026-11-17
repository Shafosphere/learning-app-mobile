import {
  createTour,
  useCoachmarkContext,
} from "@edwardloopez/react-native-coachmark";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { NavigationContext } from "@react-navigation/native";
import { useTutorialPortrait } from "@/src/contexts/TutorialOrientationContext";
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
  onComplete?: () => void;
};

export function useCoachmarkFlow({
  flowKey,
  storageKey,
  shouldStart,
  steps,
  completionState,
  restartToken,
  onComplete,
}: UseCoachmarkFlowParams) {
  const { start, next, back, stop, state } = useCoachmarkContext();
  const navigation = useContext(NavigationContext);
  const subscribeToFocus = useCallback((notify: () => void) => {
    if (!navigation) return () => {};
    const offFocus = navigation.addListener("focus", notify);
    const offBlur = navigation.addListener("blur", notify);
    return () => { offFocus(); offBlur(); };
  }, [navigation]);
  const getFocus = useCallback(() => navigation?.isFocused() ?? true, [navigation]);
  const isFocused = useSyncExternalStore(subscribeToFocus, getFocus, getFocus);
  const [isReady, setIsReady] = useState(false);
  const [hasSeen, setHasSeen] = useState(true);
  const startAttemptedRef = useRef(false);
  const autoAdvanceStepIdRef = useRef<string | null>(null);
  const autoAdvancedStepIdsRef = useRef<Set<string>>(new Set());
  const finishFlowInProgressRef = useRef(false);
  const consumedRestartTokenRef = useRef<string | null>(null);
  const replayInProgressRef = useRef(false);
  const replayToken = restartToken == null || restartToken === ""
    ? null
    : JSON.stringify(restartToken);

  useEffect(() => {
    if (replayToken == null || replayToken === consumedRestartTokenRef.current) return;
    consumedRestartTokenRef.current = replayToken;
    replayInProgressRef.current = true;
    startAttemptedRef.current = false;
    autoAdvanceStepIdRef.current = null;
    autoAdvancedStepIdsRef.current.clear();
    finishFlowInProgressRef.current = false;
    setHasSeen(false);
    setIsReady(true);
  }, [replayToken]);

  useEffect(() => {
    if (!isFocused) return;
    let mounted = true;
    setIsReady(false);
    AsyncStorage.getItem(storageKey)
      .then((value) => {
        if (!mounted) return;
        // A replay overrides old storage only until it is completed or skipped.
        if (replayInProgressRef.current) {
          setHasSeen(false);
          return;
        }
        const seen = value === "1";
        if (!seen) {
          // Screens can stay mounted while Settings resets onboarding storage.
          startAttemptedRef.current = false;
          finishFlowInProgressRef.current = false;
        }
        setHasSeen(seen);
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
  }, [isFocused, replayToken, storageKey]);

  const isActive = isFocused && state.isActive && state.activeTour?.key === flowKey;
  const isPaused = !isFocused && state.isActive && state.activeTour?.key === flowKey;
  const portraitReady = useTutorialPortrait(isFocused && !hasSeen && (isActive || (isReady && shouldStart)));
  const currentStep = isActive ? steps[state.index] ?? null : null;
  const isPendingStart =
    isFocused && isReady && !hasSeen && shouldStart && !isActive && !startAttemptedRef.current;

  useEffect(() => {
    if (!isFocused || !portraitReady || !isReady || hasSeen || !shouldStart || isActive || startAttemptedRef.current) {
      return;
    }

    startAttemptedRef.current = true;
    autoAdvanceStepIdRef.current = null;
    autoAdvancedStepIdsRef.current.clear();
    finishFlowInProgressRef.current = false;
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
  }, [flowKey, hasSeen, isActive, isReady, isFocused, portraitReady, shouldStart, start, steps]);

  useEffect(() => {
    if (!currentStep || !portraitReady) {
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

    let didAdvance = false;
    const timeout = setTimeout(() => {
      didAdvance = true;
      autoAdvancedStepIdsRef.current.add(currentStep.id);
      next();
    }, currentStep.autoAdvanceDelayMs ?? 180);
    return () => {
      clearTimeout(timeout);
      if (!didAdvance) autoAdvanceStepIdRef.current = null;
    };
  }, [completionState, currentStep, next, portraitReady]);

  const finishFlow = useCallback(async () => {
    if (finishFlowInProgressRef.current) return;
    finishFlowInProgressRef.current = true;
    await AsyncStorage.setItem(storageKey, "1");
    replayInProgressRef.current = false;
    autoAdvanceStepIdRef.current = null;
    autoAdvancedStepIdsRef.current.clear();
    setHasSeen(true);
    await stop("completed");
    if (onComplete) {
      const runOnComplete = () => {
        onComplete();
      };
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(runOnComplete);
      } else {
        setTimeout(runOnComplete, 0);
      }
    }
  }, [onComplete, storageKey, stop]);

  const skipFlow = useCallback(async () => {
    if (finishFlowInProgressRef.current) return;
    finishFlowInProgressRef.current = true;
    await AsyncStorage.setItem(storageKey, "1");
    replayInProgressRef.current = false;
    autoAdvanceStepIdRef.current = null;
    autoAdvancedStepIdsRef.current.clear();
    setHasSeen(true);
    await stop("completed");
  }, [storageKey, stop]);

  const canAdvanceCurrentStep = Boolean(
    portraitReady && currentStep &&
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
    if (!portraitReady || !currentStep || currentStep.advanceOn !== event) return false;
    const isLast = state.index >= steps.length - 1;
    if (isLast) {
      await finishFlow();
      return true;
    }
    next();
    return true;
  }, [currentStep, finishFlow, next, portraitReady, state.index, steps.length]);

  const goBack = useCallback(() => {
    if (!portraitReady || !isActive || state.index <= 0) return;
    back();
  }, [back, isActive, portraitReady, state.index]);

  return useMemo(
    () => ({
      isActive,
      isPaused,
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
      skipFlow,
    }),
    [
      advanceByEvent,
      canAdvanceCurrentStep,
      currentStep,
      goBack,
      goNext,
      hasSeen,
      isActive,
      isPaused,
      isPendingStart,
      isReady,
      skipFlow,
      state.index,
      steps.length,
    ]
  );
}
