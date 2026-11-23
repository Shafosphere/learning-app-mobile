import { useCallback, useEffect, useRef } from "react";
import { scheduleAudioTransition } from "@/Audio/runtime/scheduleAudioTransition";

// Feedback/audio deadlines may elapse during a preview. Keep their actions
// queued until it closes, and preserve cancellation on course change/unmount.
export function usePausableAudioTransition(paused: boolean) {
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const deferred = useRef(new Set<() => void>());
  const cancellations = useRef(new Set<() => void>());

  useEffect(() => {
    if (paused) return;
    for (const callback of [...deferred.current]) {
      if (pausedRef.current) break;
      deferred.current.delete(callback);
      callback();
    }
  }, [paused]);

  useEffect(() => () => {
    cancellations.current.forEach((cancel) => cancel());
    cancellations.current.clear();
    deferred.current.clear();
  }, []);

  return useCallback((callback: () => void, delayMs: number) => {
    let cancelled = false;
    const run = () => {
      cancellations.current.delete(cancel);
      if (!cancelled) callback();
    };
    const cancelAudio = scheduleAudioTransition(() => {
      if (pausedRef.current) deferred.current.add(run);
      else run();
    }, delayMs);
    const cancel = () => {
      cancelled = true;
      cancelAudio();
      deferred.current.delete(run);
      cancellations.current.delete(cancel);
    };
    cancellations.current.add(cancel);
    return cancel;
  }, []);
}
