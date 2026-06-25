import type { BoxesState } from "@/src/types/boxes";

export const BOX_SPAM_WINDOW_MS = 2000;
export const BOX_SPAM_THRESHOLD = 20;
export const LONG_THINK_MS = 12 * 1000;
export const REVIEW_MISTAKE_NUDGE_PREVIEW_FRONT_IMAGE =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 140">
      <path d="M80 8 154 132H6Z" fill="#fff7ed" stroke="#dc2626" stroke-width="12" stroke-linejoin="round"/>
      <path d="M80 42v42" stroke="#111827" stroke-width="12" stroke-linecap="round"/>
      <circle cx="80" cy="108" r="7" fill="#111827"/>
    </svg>`
  );

export const NON_INTRO_BOXES: readonly (keyof BoxesState)[] = [
  "boxZero",
  "boxOne",
  "boxTwo",
  "boxThree",
  "boxFour",
  "boxFive",
];
