export const SOUNDS = {
  pop: require("@/assets/audio/ui/drop_002.ogg"),
  pup: require("@/assets/audio/ui/drop_003.ogg"),
  error: require("@/assets/audio/ui/error_005.ogg"),
} as const;

export type SoundId = keyof typeof SOUNDS;
export type SoundAsset = typeof SOUNDS[SoundId];
