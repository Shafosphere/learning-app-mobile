export const SOUNDS = {
  pop: require("@/assets/audio/ui/pop.wav"),
  pup: require("@/assets/audio/ui/pup.wav"),
  error: require("@/assets/audio/ui/error.wav"),
} as const;

export type SoundId = keyof typeof SOUNDS;
export type SoundAsset = typeof SOUNDS[SoundId];
