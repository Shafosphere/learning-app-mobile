import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from "react";
import { Easing, runOnUI, withTiming, type SharedValue } from "react-native-reanimated";
import { recordCourseActivationEvent } from "@/src/services/courseActivationDiagnostics";

type RevealTarget = { height: SharedValue<number>; targetHeight: number };

function animateReveal({ height, targetHeight }: RevealTarget) {
  "worklet";
  // Assign a new target without resetting the current animated height.
  height.value = withTiming(targetHeight, {
    duration: 260,
    easing: Easing.inOut(Easing.cubic),
    // Preserve Reanimated's system reduced-motion default.
  });
}

function animateReveals(targets: RevealTarget[]) {
  "worklet";
  // Both sides of a selection change start in the same UI task/frame.
  for (const target of targets) animateReveal(target);
}

function createRevealQueue() {
  const pending = new Map<SharedValue<number>, RevealTarget>();
  let scheduled = false;

  return {
    enqueue(height: SharedValue<number>, targetHeight: number) {
      pending.set(height, { height, targetHeight });
      if (scheduled) return;
      scheduled = true;
      // All layout effects in this commit finish before this task runs.
      queueMicrotask(() => {
        scheduled = false;
        const targets = Array.from(pending.values());
        pending.clear();
        if (targets.length) runOnUI(animateReveals)(targets);
      });
    },
    remove(height: SharedValue<number>) {
      pending.delete(height);
    },
  };
}

const RevealQueueContext = createContext<ReturnType<typeof createRevealQueue> | null>(null);

/** One stable queue per activation screen; no selection/settings subscription. */
export function CourseAudioRevealProvider({ children }: { children: ReactNode }) {
  const [queue] = useState(createRevealQueue);
  return <RevealQueueContext.Provider value={queue}>{children}</RevealQueueContext.Provider>;
}

export function useCourseAudioRevealTarget(height: SharedValue<number>, targetHeight: number, slug: string) {
  const queue = useContext(RevealQueueContext);
  useLayoutEffect(() => {
    recordCourseActivationEvent("panel.target", { slug, targetHeight });
    if (!queue) {
      animateReveal({ height, targetHeight });
      return;
    }
    queue.enqueue(height, targetHeight);
    // Discard superseded targets and panels removed before the batch is sent.
    return () => queue.remove(height);
  }, [height, targetHeight, slug, queue]);
}
