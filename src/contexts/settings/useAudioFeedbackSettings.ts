import { useCallback, useEffect } from "react";

import { usePersistedState } from "@/src/hooks/usePersistedState";
import { setFeedbackVolume as setSoundPlayerVolume } from "@/src/utils/soundPlayer";

const clampVolume = (value: number) => Math.min(1, Math.max(0, value));

export function useAudioFeedbackSettings() {
  const [feedbackEnabled, setFeedbackEnabledState] =
    usePersistedState<boolean>("feedbackEnabled", true);
  const [feedbackVolume, setFeedbackVolumeState] =
    usePersistedState<number>("feedbackVolume", 1);

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
    await setFeedbackVolume(1);
  }, [setFeedbackVolume]);

  return {
    feedbackEnabled,
    setFeedbackEnabled,
    toggleFeedbackEnabled,
    feedbackVolume,
    setFeedbackVolume,
    resetAudioFeedbackSettings,
  };
}
