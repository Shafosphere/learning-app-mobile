import { createAudioPlayer, setAudioModeAsync } from "expo-audio";

import { SOUNDS, SoundId } from "@/src/constants/sounds";

type SoundInstance = ReturnType<typeof createAudioPlayer>;
type LoadedSounds = Partial<Record<SoundId, SoundInstance>>;

const loadedSounds: LoadedSounds = {};
let audioModeConfigured = false;

const configureAudioMode = async () => {
  if (audioModeConfigured) {
    return;
  }

  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      allowsRecording: false,
      interruptionMode: "duckOthers",
      interruptionModeAndroid: "duckOthers",
      shouldRouteThroughEarpiece: false,
    });
    audioModeConfigured = true;
  } catch (error) {
    console.warn("[soundPlayer] Failed to configure audio mode", error);
  }
};

const loadSound = async (soundId: SoundId): Promise<SoundInstance | null> => {
  const cached = loadedSounds[soundId];
  if (cached) {
    return cached;
  }

  try {
    const player = createAudioPlayer(SOUNDS[soundId]);
    loadedSounds[soundId] = player;
    return player;
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
    await sound.seekTo(0);
    sound.play();
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
