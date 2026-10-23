import BlinkEye from "@/assets/mascot/box/face/blink.png";
import Blush from "@/assets/mascot/box/face/blush.png";
import AngryEyebrows from "@/assets/mascot/box/face/eyebrows-angry.png";
import SadEyebrows from "@/assets/mascot/box/face/eyebrows-sad.png";
import EzEyes from "@/assets/mascot/box/face/eyes-ez.png";
import HappyEyes from "@/assets/mascot/box/face/eyes-happy.png";
import HeartEyes from "@/assets/mascot/box/face/eyes-hearth.png";
import NormalEyes from "@/assets/mascot/box/face/eyes-normal.png";
import SleepEyes from "@/assets/mascot/box/face/eyes-sleep.png";
import SparkleEyes from "@/assets/mascot/box/face/eyes-sparkle.png";
import XdEyes from "@/assets/mascot/box/face/eyes-xd.png";
import EzMouth from "@/assets/mascot/box/face/mouth-ez.png";
import HappyMouth from "@/assets/mascot/box/face/mouth-happy.png";
import OwoMouth from "@/assets/mascot/box/face/mouth-owo.png";
import SadMouth from "@/assets/mascot/box/face/mouth-sad.png";
import SleepMouth from "@/assets/mascot/box/face/mouth-sleep.png";
import SmileMouth from "@/assets/mascot/box/face/mouth-smile.png";
import SurprisedMouth from "@/assets/mascot/box/face/mouth-suprice.png";
import Tears from "@/assets/mascot/box/face/tears.png";
import Zzz from "@/assets/mascot/box/face/zzz.png";
import type { BoxesState } from "@/src/types/boxes";

export const BOX_EYE_ASSETS = {
  normal: NormalEyes,
  happy: HappyEyes,
  heart: HeartEyes,
  sleep: SleepEyes,
  sparkle: SparkleEyes,
  xd: XdEyes,
  ez: EzEyes,
  // This asset contains only the right eye; BoxFace keeps the normal left eye.
  blink: BlinkEye,
};

export const BOX_MOUTH_ASSETS = {
  smile: SmileMouth,
  happy: HappyMouth,
  sad: SadMouth,
  surprised: SurprisedMouth,
  sleep: SleepMouth,
  owo: OwoMouth,
  ez: EzMouth,
};

export const BOX_EYEBROW_ASSETS = {
  angry: AngryEyebrows,
  sad: SadEyebrows,
};

export const BOX_FACE_EFFECT_ASSETS = {
  blush: Blush,
  tears: Tears,
  zzz: Zzz,
};

export type BoxFaceParts = {
  eyes: keyof typeof BOX_EYE_ASSETS;
  mouth: keyof typeof BOX_MOUTH_ASSETS;
  eyebrows?: keyof typeof BOX_EYEBROW_ASSETS | null;
  blush?: boolean;
  tears?: boolean;
  zzz?: boolean;
};

export const BOX_FACE_PRESETS = {
  angry: { eyes: "normal", mouth: "sad", eyebrows: "angry" },
  blink: { eyes: "blink", mouth: "smile" },
  blushed: { eyes: "normal", mouth: "smile", blush: true },
  crying: { eyes: "normal", mouth: "sad", eyebrows: "sad", tears: true },
  happy: { eyes: "happy", mouth: "happy" },
  cheerful: { eyes: "happy", mouth: "smile" },
  love: { eyes: "heart", mouth: "happy" },
  nice: { eyes: "normal", mouth: "smile" },
  sad: { eyes: "normal", mouth: "sad", eyebrows: "sad" },
  surprised: { eyes: "normal", mouth: "surprised" },
  ez: { eyes: "ez", mouth: "ez" },
  owo: { eyes: "normal", mouth: "owo" },
  sleep: { eyes: "sleep", mouth: "sleep", zzz: true },
  sparkle: { eyes: "sparkle", mouth: "happy" },
  xd: { eyes: "xd", mouth: "happy" },
  encouraging: { eyes: "normal", mouth: "smile", eyebrows: "sad" },
  relieved: { eyes: "happy", mouth: "smile", blush: true },
} satisfies Record<string, BoxFaceParts>;

export type Face = keyof typeof BOX_FACE_PRESETS;

/** Override individual parts; null eyebrows and false effects remove preset layers. */
export function getBoxFaceParts(
  face: Face,
  overrides?: Partial<BoxFaceParts>
): BoxFaceParts {
  return overrides ? { ...BOX_FACE_PRESETS[face], ...overrides } : BOX_FACE_PRESETS[face];
}

export type BoxFaceInteraction = "inactive" | "active";

const GAMEPLAY_REACTIONS = {
  selected: { face: "surprised", duration: 800 },
  awakened: { face: "surprised", duration: 800 },
  blocked: { face: "owo", duration: 800 },
  correct: { face: "happy", duration: 1200 },
  success: { face: "love", duration: 1500 },
  wrong: { face: "sad", duration: 1000 },
  meltdown: { face: "encouraging", duration: 1200 },
  recovered: { face: "relieved", duration: 1500 },
  streakThree: { face: "sparkle", duration: 1500 },
  streakFive: { face: "ez", duration: 1500 },
} satisfies Record<string, { face: Face; duration: number }>;

export type BoxFaceGameplayEvent = keyof typeof GAMEPLAY_REACTIONS;

export type BoxFaceState = {
  transientFace?: Face;
  transientEvent?: BoxFaceGameplayEvent;
};

export type BoxFacesByBox = Partial<Record<keyof BoxesState, Face>>;

export function getFaceForInteraction(_interaction: BoxFaceInteraction): Face {
  return "nice";
}

export function getFaceForGameplayEvent(event: BoxFaceGameplayEvent): Face {
  return GAMEPLAY_REACTIONS[event].face;
}

export function getFaceDurationForGameplayEvent(event: BoxFaceGameplayEvent): number {
  return GAMEPLAY_REACTIONS[event].duration;
}

const BOX_IDLE_FACES = {
  boxZero: "owo",
  boxOne: "nice",
  boxTwo: "ez",
  boxThree: "cheerful",
  boxFour: "sparkle",
  boxFive: "love",
} satisfies Record<keyof BoxesState, Face>;

export function getIdleFaceForBox(box: keyof BoxesState, wordCount: number): Face {
  return box === "boxFive" && wordCount === 0 ? "sleep" : BOX_IDLE_FACES[box];
}

export function pickBoxSelectionFace(randomValue = Math.random()): "surprised" | "owo" {
  return randomValue < 0.75 ? "surprised" : "owo";
}

export function resolveBoxFace(params: {
  isActive: boolean;
  box?: keyof BoxesState;
  wordCount?: number;
  idleFace?: Face;
  transientFace?: Face;
}): Face {
  const { box, wordCount = 0, idleFace, transientFace } = params;
  return transientFace ?? idleFace ?? (box ? getIdleFaceForBox(box, wordCount) : "nice");
}
