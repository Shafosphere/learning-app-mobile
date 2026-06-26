import type { FlashcardsImageSize } from "@/src/contexts/SettingsContext";
import type { ImageStyle } from "react-native";

import {
  BASE_FLASHCARD_WIDTH,
  MAX_TABLET_FLASHCARD_WIDTH,
  type ResponsiveFlashcardMetrics,
} from "./responsiveCardWidth";

export const PROMPT_IMAGE_TARGET_HEIGHT = 140;

const IMAGE_SIZE_MULTIPLIER: Record<FlashcardsImageSize, number> = {
  dynamic: 1,
  small: 0.4,
  medium: 0.6,
  large: 1,
  very_large: 1.7,
};

const MEDIUM_TABLET_MULTIPLIER = IMAGE_SIZE_MULTIPLIER.very_large;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getPromptImageSizeMultiplier(
  mode: FlashcardsImageSize,
  cardMetrics: Pick<ResponsiveFlashcardMetrics, "width">,
): number {
  const baseMultiplier = IMAGE_SIZE_MULTIPLIER[mode] ?? 1;
  if (mode !== "medium") return baseMultiplier;

  const progress = clamp(
    (cardMetrics.width - BASE_FLASHCARD_WIDTH) /
      (MAX_TABLET_FLASHCARD_WIDTH - BASE_FLASHCARD_WIDTH),
    0,
    1,
  );
  if (progress === 0) return baseMultiplier;
  if (progress === 1) return MEDIUM_TABLET_MULTIPLIER;

  return (
    baseMultiplier +
    progress * (MEDIUM_TABLET_MULTIPLIER - baseMultiplier)
  );
}

export function buildPromptImageStyle(
  mode: FlashcardsImageSize,
  cardMetrics: Pick<ResponsiveFlashcardMetrics, "width">,
): ImageStyle {
  const target =
    PROMPT_IMAGE_TARGET_HEIGHT * getPromptImageSizeMultiplier(mode, cardMetrics);
  return { height: target, maxHeight: target };
}
