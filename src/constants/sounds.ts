export const SOUNDS = {
  ding: require("@/assets/sounds/ding.wav"),
  dong: require("@/assets/sounds/dong.wav"),
  error: require("@/assets/sounds/error.wav"),
} as const;

export type SoundId = keyof typeof SOUNDS;
export type SoundAsset = typeof SOUNDS[SoundId];
