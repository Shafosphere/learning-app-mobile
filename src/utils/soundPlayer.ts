import {
  Audio,
  InterruptionModeAndroid,
  InterruptionModeIOS,
} from "expo-av";

import { SOUNDS, SoundId } from "@/src/constants/sounds";

type LoadedSounds = Partial<Record<SoundId, Audio.Sound>>;

const loadedSounds: LoadedSounds = {};
let audioModeConfigured = false;

const configureAudioMode = async () => {
  if (audioModeConfigured) {
    return;
  }

  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      allowsRecordingIOS: false,
      interruptionModeIOS: InterruptionModeIOS.DuckOthers,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    audioModeConfigured = true;
  } catch (error) {
    console.warn("[soundPlayer] Failed to configure audio mode", error);
  }
};

const loadSound = async (soundId: SoundId): Promise<Audio.Sound | null> => {
  const cached = loadedSounds[soundId];
  if (cached) {
    return cached;
  }

  try {
    const { sound } = await Audio.Sound.createAsync(SOUNDS[soundId]);
    loadedSounds[soundId] = sound;
    return sound;
  } catch (error) {
    console.warn("[soundPlayer] Failed to load sound", {
      soundId,
      error,
    });
    return null;
  }
};

export const playSound = async (soundId: SoundId) => {
  await configureAudioMode();
  const sound = await loadSound(soundId);
  if (!sound) {
    return;
  }

  try {
    await sound.replayAsync();
  } catch (error) {
    console.warn("[soundPlayer] Failed to play sound", {
      soundId,
      error,
    });
  }
};

export const playFeedbackSound = (isCorrect: boolean) => {
  void playSound(isCorrect ? "ding" : "dong");
};
