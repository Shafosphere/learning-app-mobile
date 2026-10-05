const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** Height is the actual content area after safe-area insets, in layout points. */
export function getIntroSpacing(height: number) {
  const progress = clamp((height - 480) / 200, 0, 1);
  return {
    logoWidth: 72 + 36 * progress,
    logoGap: 8 + 4 * progress,
    headerGap: 10 + 6 * progress,
    cardPadding: 14 + 8 * progress,
    illustrationGap: 12 + 6 * progress,
  };
}

/** Keep a readable minimum and let the ScrollView handle any remaining overflow. */
export function getIntroIllustrationWidth({
  contentWidth,
  availableHeight,
  aspectRatio,
}: {
  contentWidth: number;
  availableHeight: number;
  aspectRatio: number;
}) {
  const preferredWidth = Math.min(contentWidth * 0.8, 340);
  const minimumWidth = Math.min(preferredWidth, 180);
  return clamp(availableHeight * aspectRatio, minimumWidth, preferredWidth);
}
