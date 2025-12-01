export const SOUNDS = {
  pop: require("@/assets/sounds/pop.wav"),
  pup: require("@/assets/sounds/pup.wav"),
  error: require("@/assets/sounds/error.wav"),
} as const;

export type SoundId = keyof typeof SOUNDS;
export type SoundAsset = typeof SOUNDS[SoundId];
