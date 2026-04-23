import {
  getFaceDurationForGameplayEvent,
  getFaceForGameplayEvent,
  pickInactiveFace,
  resolveBoxFace,
  type BoxFaceGameplayEvent,
  type BoxFaceState,
  type BoxFacesByBox,
} from "@/src/components/Box/Skin/boxFaces";
import type { BoxesState } from "@/src/types/boxes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type BoxFaceEntries = Partial<Record<keyof BoxesState, BoxFaceState>>;

type UseBoxFacesControllerParams = {
  boxes: BoxesState;
  activeBox: keyof BoxesState | null;
};

type HandleCorrectAnswerOptions = {
  preferLove?: boolean;
};

const CRYING_WRONG_STREAK_THRESHOLD = 3;

function createInitialBoxFaceEntries(boxes: BoxesState): BoxFaceEntries {
  const next: BoxFaceEntries = {};
  (Object.keys(boxes) as (keyof BoxesState)[]).forEach((box) => {
    next[box] = {
      idleFace: pickInactiveFace(),
      wrongStreak: 0,
    };
  });
  return next;
}

export function useBoxFacesController({
  boxes,
  activeBox,
}: UseBoxFacesControllerParams) {
  const [boxStates, setBoxStates] = useState<BoxFaceEntries>(() =>
    createInitialBoxFaceEntries(boxes)
  );
  const boxStatesRef = useRef<BoxFaceEntries>({});
  const timersRef = useRef<
    Partial<Record<keyof BoxesState, ReturnType<typeof setTimeout>>>
  >({});

  useEffect(() => {
    boxStatesRef.current = boxStates;
  }, [boxStates]);

  const clearBoxTimer = useCallback((box: keyof BoxesState) => {
    const timer = timersRef.current[box];
    if (timer) {
      clearTimeout(timer);
      delete timersRef.current[box];
    }
  }, []);

  const clearAllTimers = useCallback(() => {
    const currentTimers = timersRef.current;
    Object.values(currentTimers).forEach((timer) => {
      if (timer) {
        clearTimeout(timer);
      }
    });
  }, []);

  useEffect(() => {
    const boxKeys = Object.keys(boxes) as (keyof BoxesState)[];
    setBoxStates((prev) => {
      let changed = false;
      const next: BoxFaceEntries = {};

      boxKeys.forEach((box) => {
        const existing = prev[box];
        if (existing) {
          next[box] = existing;
          return;
        }

        changed = true;
        next[box] = {
          idleFace: pickInactiveFace(),
          wrongStreak: 0,
        };
      });

      return changed || boxKeys.length !== Object.keys(prev).length ? next : prev;
    });
  }, [boxes]);

  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  const triggerEvent = useCallback(
    (box: keyof BoxesState, event: BoxFaceGameplayEvent) => {
      clearBoxTimer(box);
      const transientFace = getFaceForGameplayEvent(event);
      const duration = getFaceDurationForGameplayEvent(event);

      setBoxStates((prev) => ({
        ...prev,
        [box]: {
          idleFace: prev[box]?.idleFace ?? pickInactiveFace(),
          wrongStreak: prev[box]?.wrongStreak ?? 0,
          transientFace,
        },
      }));

      timersRef.current[box] = setTimeout(() => {
        setBoxStates((prev) => {
          const current = prev[box];
          if (!current?.transientFace) {
            return prev;
          }

          return {
            ...prev,
            [box]: {
              ...current,
              transientFace: undefined,
            },
          };
        });
        delete timersRef.current[box];
      }, duration);
    },
    [clearBoxTimer]
  );

  const handleSelection = useCallback(
    (box: keyof BoxesState) => {
      triggerEvent(box, "selected");
    },
    [triggerEvent]
  );

  const handleBlockedInteraction = useCallback(
    (box: keyof BoxesState) => {
      triggerEvent(box, "blocked");
    },
    [triggerEvent]
  );

  const handleCorrectAnswer = useCallback(
    (box: keyof BoxesState, options?: HandleCorrectAnswerOptions) => {
      const current = boxStatesRef.current[box];
      setBoxStates((prev) => ({
        ...prev,
        [box]: {
          idleFace: current?.idleFace ?? pickInactiveFace(),
          wrongStreak: 0,
          transientFace: current?.transientFace,
        },
      }));
      triggerEvent(box, options?.preferLove ? "success" : "correct");
    },
    [triggerEvent]
  );

  const handleWrongAnswer = useCallback(
    (box: keyof BoxesState) => {
      const current = boxStatesRef.current[box];
      const nextWrongStreak = (current?.wrongStreak ?? 0) + 1;
      const shouldCry = nextWrongStreak >= CRYING_WRONG_STREAK_THRESHOLD;

      setBoxStates((prev) => {
        return {
          ...prev,
          [box]: {
            idleFace: current?.idleFace ?? pickInactiveFace(),
            wrongStreak: nextWrongStreak,
            transientFace: current?.transientFace,
          },
        };
      });

      triggerEvent(box, shouldCry ? "meltdown" : "wrong");
    },
    [triggerEvent]
  );

  const resetWrongStreak = useCallback((box: keyof BoxesState) => {
    setBoxStates((prev) => {
      const current = prev[box];
      if (!current || current.wrongStreak === 0) {
        return prev;
      }

      return {
        ...prev,
        [box]: {
          ...current,
          wrongStreak: 0,
        },
      };
    });
  }, []);

  const faces = useMemo<BoxFacesByBox>(() => {
    const next: BoxFacesByBox = {};
    (Object.keys(boxes) as (keyof BoxesState)[]).forEach((box) => {
      const state = boxStates[box];
      next[box] = resolveBoxFace({
        isActive: activeBox === box,
        idleFace: state?.idleFace,
        transientFace: state?.transientFace,
      });
    });
    return next;
  }, [activeBox, boxStates, boxes]);

  return {
    faces,
    boxStates,
    handleSelection,
    handleBlockedInteraction,
    handleCorrectAnswer,
    handleWrongAnswer,
    resetWrongStreak,
  };
}
