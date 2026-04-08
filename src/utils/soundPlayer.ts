import { createAudioPlayer, setAudioModeAsync } from "expo-audio";

import { SOUNDS, SoundAsset, SoundId } from "@/src/constants/sounds";

type SoundInstance = ReturnType<typeof createAudioPlayer>;
type LoadedSounds = Partial<Record<string, SoundInstance>>;

const loadedSounds: LoadedSounds = {};
let audioModeConfigured = false;
let feedbackVolume = 1;

const clampVolume = (value: number) => Math.min(1, Math.max(0, value));

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

const loadSoundByKey = async (
  cacheKey: string,
  source: SoundAsset,
): Promise<SoundInstance | null> => {
  const cached = loadedSounds[cacheKey];
  if (cached) {
    cached.volume = feedbackVolume;
    return cached;
  }

  try {
    const player = createAudioPlayer(source);
    player.volume = feedbackVolume;
    loadedSounds[cacheKey] = player;
    return player;
  } catch (error) {
    console.warn("[soundPlayer] Failed to load sound", {
      cacheKey,
      error,
    });
    return null;
  }
};

const loadSound = async (soundId: SoundId): Promise<SoundInstance | null> =>
  loadSoundByKey(soundId, SOUNDS[soundId]);

const playSound = async (soundId: SoundId) => {
  await configureAudioMode();
  const sound = await loadSound(soundId);
  if (!sound) {
    return;
  }
  sound.volume = feedbackVolume;

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

export const playSoundAsset = async (cacheKey: string, source: SoundAsset) => {
  await configureAudioMode();
  const sound = await loadSoundByKey(cacheKey, source);
  if (!sound) {
    return;
  }
  sound.volume = feedbackVolume;

  try {
    await sound.seekTo(0);
    sound.play();
  } catch (error) {
    console.warn("[soundPlayer] Failed to play sound asset", {
      cacheKey,
      error,
    });
  }
};

export const playFeedbackSound = (isCorrect: boolean) => {
  void playSound(isCorrect ? "pop" : "pup");
};

export const setFeedbackVolume = (value: number) => {
  feedbackVolume = clampVolume(value);
  Object.values(loadedSounds).forEach((sound) => {
    if (!sound) return;
    sound.volume = feedbackVolume;
  });
};
