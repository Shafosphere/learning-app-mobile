export const BASE_FLASHCARD_WIDTH = 325;
const BASE_FLASHCARD_MIN_HEIGHT = 120;
const TARGET_FLASHCARD_ASPECT_RATIO = 363 / 126;
const BASE_FLASHCARD_FONT_SIZE = 24;
const BASE_FLASHCARD_INPUT_HEIGHT = 52;
const BASE_FLASHCARD_TEXT_INPUT_HEIGHT = 44;
const BASE_FLASHCARD_LINE_HEIGHT = 28;
const PHONE_REFERENCE_CARD_HEIGHT = 126;
const FLASHCARD_HORIZONTAL_INSET = 48;
export const MAX_TABLET_FLASHCARD_WIDTH = 630;
const MAX_VISUAL_SCALE_DELTA = 0.22;

export type ResponsiveFlashcardMetrics = {
  width: number;
  minHeight: number;
  visualScale: number;
  /** Scales the card's text/input layout on tablets; phones always use 1. */
  contentScale: number;
  fontSize: number;
  lineHeight: number;
  inputHeight: number;
  textInputHeight: number;
  inputLineHeight: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getResponsiveFlashcardWidth(windowWidth: number): number {
  const availableWidth = Math.max(0, windowWidth - FLASHCARD_HORIZONTAL_INSET);
  return clamp(
    availableWidth,
    BASE_FLASHCARD_WIDTH,
    MAX_TABLET_FLASHCARD_WIDTH,
  );
}

export function getResponsiveFlashcardMetrics(
  windowWidth: number,
  options: { isTabletLayout?: boolean } = {},
): ResponsiveFlashcardMetrics {
  const width = getResponsiveFlashcardWidth(windowWidth);
  const progress = clamp(
    (width - BASE_FLASHCARD_WIDTH) /
      (MAX_TABLET_FLASHCARD_WIDTH - BASE_FLASHCARD_WIDTH),
    0,
    1,
  );
  const visualScale = 1 + progress * MAX_VISUAL_SCALE_DELTA;
  const minHeight = Math.max(
    BASE_FLASHCARD_MIN_HEIGHT,
    width / TARGET_FLASHCARD_ASPECT_RATIO,
  );
  const contentScale = options.isTabletLayout
    ? minHeight / PHONE_REFERENCE_CARD_HEIGHT
    : 1;
  const textScale = options.isTabletLayout ? contentScale : visualScale;

  return {
    width,
    minHeight,
    visualScale,
    contentScale,
    fontSize: BASE_FLASHCARD_FONT_SIZE * textScale,
    lineHeight: BASE_FLASHCARD_LINE_HEIGHT * textScale,
    inputHeight: BASE_FLASHCARD_INPUT_HEIGHT * textScale,
    textInputHeight: BASE_FLASHCARD_TEXT_INPUT_HEIGHT * textScale,
    inputLineHeight: BASE_FLASHCARD_LINE_HEIGHT * textScale,
  };
}
