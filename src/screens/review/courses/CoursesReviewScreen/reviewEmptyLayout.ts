const BOX_WIDTH = 115;
const BOX_HEIGHT = 122;
export const REVIEW_EMPTY_CLOCK_TOP = -150;
const CLOCK_OVERFLOW = -REVIEW_EMPTY_CLOCK_TOP;
const EDGE_INSET = 16;
export const REVIEW_EMPTY_MESSAGE_GAP = 28;

type ReviewEmptyLayoutOptions = {
  width: number;
  height: number;
  isCompact: boolean;
  isTablet: boolean;
  messageHeight: number;
};

export function getReviewEmptyLayout({
  width,
  height,
  isCompact,
  isTablet,
  messageHeight,
}: ReviewEmptyLayoutOptions) {
  const targetWidth = (isTablet ? 260 : isCompact ? 170 : 200) * 0.85;
  const boxWidth = Math.max(0, Math.min(
    targetWidth,
    width - 48,
    // Reserve space for the caption, but allow scrolling for very large text.
    Math.max(0, height - EDGE_INSET * 2 - REVIEW_EMPTY_MESSAGE_GAP - Math.min(messageHeight, height * 0.25))
      * BOX_WIDTH / (BOX_HEIGHT + CLOCK_OVERFLOW),
  ));
  const scale = boxWidth / BOX_WIDTH;
  const boxHeight = BOX_HEIGHT * scale;
  const clockOverflow = CLOCK_OVERFLOW * scale;
  const minTop = EDGE_INSET + clockOverflow;
  const groupHeight = clockOverflow + boxHeight + REVIEW_EMPTY_MESSAGE_GAP + messageHeight;
  const preferredTop = height * 0.42 - groupHeight / 2 + clockOverflow;
  const maxTop = height - EDGE_INSET - boxHeight - REVIEW_EMPTY_MESSAGE_GAP - messageHeight;

  return {
    boxWidth,
    boxHeight,
    scale,
    // Move upward when text needs space. If it still cannot fit, let the ScrollView grow.
    paddingTop: Math.max(minTop, Math.min(preferredTop, maxTop)),
  };
}
