import { useCallback, useEffect } from "react";

import { flashcardAudioPlayer } from "@/Audio/runtime/playback";
import { useHydratedPersistedState, usePersistedState } from "@/src/hooks/usePersistedState";
import { setFeedbackVolume as setSoundPlayerVolume } from "@/src/utils/soundPlayer";
import { defaultValue } from "./defaults";

const clampVolume = (value: number) => Math.min(1, Math.max(0, value));

export function useAudioFeedbackSettings() {
  const [feedbackEnabled, setFeedbackEnabledState] =
    usePersistedState<boolean>("feedbackEnabled", true);
  const [feedbackVolume, setFeedbackVolumeState] =
    usePersistedState<number>("feedbackVolume", defaultValue.feedbackVolume);

  const [flashcardAudioVolume, setFlashcardAudioVolumeState, flashcardAudioVolumeHydrated] =
    useHydratedPersistedState<number>("flashcards.audioVolume", defaultValue.flashcardAudioVolume);

  const setFlashcardAudioVolume = useCallback(async (value: number) => {
    const clamped = Number.isFinite(value) ? clampVolume(value) : 0;
    flashcardAudioPlayer.setVolume(clamped);
    await setFlashcardAudioVolumeState(clamped);
  }, [setFlashcardAudioVolumeState]);

  useEffect(() => {
    if (flashcardAudioVolumeHydrated) flashcardAudioPlayer.setVolume(flashcardAudioVolume);
  }, [flashcardAudioVolume, flashcardAudioVolumeHydrated]);

  const setFeedbackEnabled = useCallback(
    async (value: boolean) => {
      await setFeedbackEnabledState(value);
    },
    [setFeedbackEnabledState]
  );

  const toggleFeedbackEnabled = useCallback(async () => {
    await setFeedbackEnabled(!feedbackEnabled);
  }, [feedbackEnabled, setFeedbackEnabled]);

  const setFeedbackVolume = useCallback(
    async (value: number) => {
      const clamped = clampVolume(value);
      await setFeedbackVolumeState(clamped);
      setSoundPlayerVolume(clamped);
    },
    [setFeedbackVolumeState]
  );

  useEffect(() => {
    setSoundPlayerVolume(clampVolume(feedbackVolume));
  }, [feedbackVolume]);

  const resetAudioFeedbackSettings = useCallback(async () => {
    await Promise.all([
      setFeedbackVolume(defaultValue.feedbackVolume),
      setFlashcardAudioVolume(defaultValue.flashcardAudioVolume),
    ]);
  }, [setFeedbackVolume, setFlashcardAudioVolume]);

  return {
    flashcardAudioVolume,
    setFlashcardAudioVolume,
    flashcardAudioVolumeHydrated,
    feedbackEnabled,
    setFeedbackEnabled,
    toggleFeedbackEnabled,
    feedbackVolume,
    setFeedbackVolume,
    resetAudioFeedbackSettings,
  };
}
