import popWav from "@/assets/audio/ui/pop.wav";
import plumWav from "@/assets/audio/ui/plum.wav";
import errorWav from "@/assets/audio/ui/error.wav";

export const SOUNDS = {
  pop: popWav,
  plum: plumWav,
  error: errorWav,
} as const;

export type SoundId = keyof typeof SOUNDS;
export type SoundAsset = typeof SOUNDS[SoundId];
