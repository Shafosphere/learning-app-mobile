import AngryFace from "@/assets/illustrations/mascot-box/newface/angry.png";
import BlinkFace from "@/assets/illustrations/mascot-box/newface/blink.png";
import BlushedFace from "@/assets/illustrations/mascot-box/newface/blushed.png";
import CryingFace from "@/assets/illustrations/mascot-box/newface/crying.png";
import HappyFace from "@/assets/illustrations/mascot-box/newface/happy.png";
import LoveFace from "@/assets/illustrations/mascot-box/newface/love.png";
import NiceFace from "@/assets/illustrations/mascot-box/newface/nice.png";
import SadFace from "@/assets/illustrations/mascot-box/newface/sad.png";
import SurprisedFace from "@/assets/illustrations/mascot-box/newface/suprice.png";
import type { BoxesState } from "@/src/types/boxes";

export type Face =
  | "angry"
  | "blink"
  | "blushed"
  | "crying"
  | "happy"
  | "love"
  | "nice"
  | "sad"
  | "surprised";

export type BoxFaceInteraction = "inactive" | "active";

export type BoxFaceGameplayEvent =
  | "selected"
  | "correct"
  | "success"
  | "wrong"
  | "meltdown"
  | "blocked";

export type BoxFaceState = {
  idleFace: Face;
  transientFace?: Face;
  wrongStreak: number;
};

export type BoxFacesByBox = Partial<Record<keyof BoxesState, Face>>;

export const BOX_FACE_ASSETS: Record<Face, number> = {
  angry: AngryFace,
  blink: BlinkFace,
  blushed: BlushedFace,
  crying: CryingFace,
  happy: HappyFace,
  love: LoveFace,
  nice: NiceFace,
  sad: SadFace,
  surprised: SurprisedFace,
};

export function getFaceForInteraction(interaction: BoxFaceInteraction): Face {
  switch (interaction) {
    case "active":
      return "happy";
    case "inactive":
    default:
      return "nice";
  }
}

export function getFaceForGameplayEvent(event: BoxFaceGameplayEvent): Face {
  switch (event) {
    case "selected":
      return "surprised";
    case "correct":
      return "blushed";
    case "success":
      return "love";
    case "wrong":
      return "sad";
    case "meltdown":
      return "crying";
    case "blocked":
    default:
      return "angry";
  }
}

export function getFaceDurationForGameplayEvent(
  event: BoxFaceGameplayEvent
): number {
  switch (event) {
    case "selected":
      return 1400;
    case "correct":
      return 2900;
    case "success":
      return 3200;
    case "wrong":
      return 3100;
    case "meltdown":
      return 3400;
    case "blocked":
    default:
      return 2800;
  }
}

export function pickInactiveFace(randomValue = Math.random()): Face {
  return randomValue < 0.5 ? "nice" : "blink";
}

export function resolveBoxFace(params: {
  isActive: boolean;
  idleFace?: Face;
  transientFace?: Face;
}): Face {
  const { isActive, idleFace, transientFace } = params;
  if (transientFace) {
    return transientFace;
  }

  if (isActive) {
    return getFaceForInteraction("active");
  }

  return idleFace ?? getFaceForInteraction("inactive");
}
