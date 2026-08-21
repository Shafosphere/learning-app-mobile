import { createAudioPlayer, setAudioModeAsync } from "expo-audio";

import { SOUNDS, SoundAsset, SoundId } from "@/src/constants/sounds";

type SoundInstance = ReturnType<typeof createAudioPlayer>;
type LoadedSounds = Partial<Record<string, SoundInstance>>;

const loadedSounds: LoadedSounds = {};
const playbackLocks = new Map<string, Promise<void>>();
let audioModeConfigured = false;
let feedbackVolume = 1;

const clampVolume = (value: number) => Math.min(1, Math.max(0, value));
const isFeedbackMuted = () => feedbackVolume <= 0;

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

const playLoadedSound = async (
  cacheKey: string,
  load: () => Promise<SoundInstance | null>,
  logContext: Record<string, string>,
) => {
  const previousPlayback = playbackLocks.get(cacheKey) ?? Promise.resolve();
  const currentPlayback = previousPlayback
    .catch(() => {})
    .then(async () => {
      if (isFeedbackMuted()) {
        return;
      }

      await configureAudioMode();
      const sound = await load();
      if (!sound) {
        return;
      }
      sound.volume = feedbackVolume;

      // Stop an earlier playback before seeking. Without this, rapid taps can
      // race seekTo(0) and play() on the same native player instance.
      if (sound.playing) {
        sound.pause();
      }
      await sound.seekTo(0);
      sound.play();
    })
    .catch((error) => {
      console.warn("[soundPlayer] Failed to play sound", {
        ...logContext,
        error,
      });
    });

  playbackLocks.set(cacheKey, currentPlayback);
  await currentPlayback;
  if (playbackLocks.get(cacheKey) === currentPlayback) {
    playbackLocks.delete(cacheKey);
  }
};

const playSound = async (soundId: SoundId) => {
  if (isFeedbackMuted()) {
    return;
  }

  await playLoadedSound(soundId, () => loadSound(soundId), { soundId });
};

export const playSoundAsset = async (cacheKey: string, source: SoundAsset) => {
  if (isFeedbackMuted()) {
    return;
  }

  await playLoadedSound(cacheKey, () => loadSoundByKey(cacheKey, source), {
    cacheKey,
  });
};

export const playFeedbackSound = (isCorrect: boolean) => {
  void playSound(isCorrect ? "pop" : "plum");
};

export const setFeedbackVolume = (value: number) => {
  feedbackVolume = clampVolume(value);
  Object.values(loadedSounds).forEach((sound) => {
    if (!sound) return;
    sound.volume = feedbackVolume;
    if (isFeedbackMuted() && sound.playing) {
      sound.pause();
    }
  });
};
