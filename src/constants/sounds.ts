import popWav from "@/assets/audio/ui/pop.wav";
import pupWav from "@/assets/audio/ui/pup.wav";
import error005 from "@/assets/audio/ui/error_005.ogg";

export const SOUNDS = {
  pop: popWav,
  pup: pupWav,
  error: error005,
} as const;

export type SoundId = keyof typeof SOUNDS;
export type SoundAsset = typeof SOUNDS[SoundId];
