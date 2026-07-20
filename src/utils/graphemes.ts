const graphemeSegmenter =
  typeof Intl !== "undefined" && typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

/**
 * Splits user-visible characters without separating emoji surrogate pairs or
 * combined characters. Array.from is a safe fallback for runtimes without
 * Intl.Segmenter: it still keeps each Unicode code point intact.
 */
export function splitGraphemes(value: string): string[] {
  if (!graphemeSegmenter) return Array.from(value);
  return Array.from(graphemeSegmenter.segment(value), ({ segment }) => segment);
}
