import { flashcardAudioPlayer } from "./playback";

// Feedback stays visible for at least delayMs, and longer while audio is loading
// or playing. The returned cleanup cancels both the timer and the audio wait.
export function scheduleAudioTransition(callback: () => void, delayMs: number) {
  let cancelled = false;
  let cancelWait: (() => void) | undefined;
  const timer = setTimeout(() => {
    cancelWait = flashcardAudioPlayer.whenIdle(() => {
      if (!cancelled) callback();
    });
  }, delayMs);
  return () => {
    cancelled = true;
    clearTimeout(timer);
    cancelWait?.();
  };
}
