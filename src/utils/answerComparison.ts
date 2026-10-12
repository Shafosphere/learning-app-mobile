import { normalizeAnswerText } from "./answerNormalization";
import { stripDiacritics } from "./diacritics";
import { splitGraphemes } from "./graphemes";
import { calculateTypoDiff } from "./typoDiff";

export type AnswerComparisonOptions = {
  ignoreDiacritics: boolean;
  ignoreBoundaryPunctuation: boolean;
};

type SourcePosition = { start: number; end: number; graphemeIndex: number };
type AnswerProjection = { text: string; positions: SourcePosition[] };

/** Keeps UTF-16 comparison offsets tied to the original visible characters. */
function projectAnswer(raw: string, options: AnswerComparisonOptions): AnswerProjection {
  let prefix = "";
  let text = "";
  let positions: SourcePosition[] = [];
  let offset = 0;
  splitGraphemes(raw).forEach((char, graphemeIndex) => {
    prefix += char;
    const next = prefix.normalize("NFKC")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\s+/g, " ");
    let common = 0;
    while (common < text.length && common < next.length && text[common] === next[common]) common++;
    const start = positions[common]?.start ?? offset;
    const sourceIndex = positions[common]?.graphemeIndex ?? graphemeIndex;
    positions = positions.slice(0, common);
    for (let index = common; index < next.length; index++) {
      positions.push({ start, end: offset + char.length, graphemeIndex: sourceIndex });
    }
    text = next;
    offset += char.length;
  });
  // Build source spans before contextual casing can revise earlier characters.
  // Per-code-point output lengths preserve expansions without merging sources.
  const transformedPositions: SourcePosition[] = [];
  let normalizedOffset = 0;
  for (const char of text) {
    let transformed = char.toLowerCase();
    if (options.ignoreDiacritics) transformed = stripDiacritics(transformed);
    for (let index = 0; index < transformed.length; index++) {
      transformedPositions.push(positions[normalizedOffset]);
    }
    normalizedOffset += char.length;
  }
  // Lowercase the complete string to retain contextual forms such as final sigma.
  text = text.toLowerCase();
  if (options.ignoreDiacritics) text = stripDiacritics(text);
  positions = transformedPositions;
  let start = text.length - text.trimStart().length;
  let end = text.trimEnd().length;
  if (options.ignoreBoundaryPunctuation) {
    while (start < end && /[?¿!¡]/.test(text[start])) start++;
    while (end > start && /[?¿!¡]/.test(text[end - 1])) end--;
    while (start < end && text[start] === " ") start++;
    while (end > start && text[end - 1] === " ") end--;
  }
  return { text: text.slice(start, Math.max(start, end)), positions: positions.slice(start, Math.max(start, end)) };
}

function resolveComparisonOptions(expected: string, options: AnswerComparisonOptions) {
  // Symbol-only flashcards retain their original comparison rules.
  return options.ignoreBoundaryPunctuation &&
    !normalizeAnswerText(expected, options.ignoreDiacritics, true)
    ? { ...options, ignoreBoundaryPunctuation: false }
    : options;
}

export function normalizeAnswerPair(input: string, expected: string, options: AnswerComparisonOptions) {
  const effectiveOptions = resolveComparisonOptions(expected, options);
  const normalize = (value: string) => normalizeAnswerText(value, effectiveOptions.ignoreDiacritics, effectiveOptions.ignoreBoundaryPunctuation);
  return { input: normalize(input), expected: normalize(expected) };
}

export function compareAnswerText(input: string, expected: string, options: AnswerComparisonOptions) {
  const effectiveOptions = resolveComparisonOptions(expected, options);
  return { input: projectAnswer(input, effectiveOptions), expected: projectAnswer(expected, effectiveOptions) };
}

export function answersMatch(input: string, expected: string, options: AnswerComparisonOptions): boolean {
  const comparison = normalizeAnswerPair(input, expected, options);
  return comparison.input.length > 0 && comparison.input === comparison.expected;
}

export function getAnswerMismatchFlags(input: string, expected: string, options: AnswerComparisonOptions): boolean[] {
  const comparison = compareAnswerText(input, expected, options);
  const flags = splitGraphemes(input).map(() => false);
  comparison.input.positions.forEach((position, index) => {
    if (comparison.input.text[index] !== comparison.expected.text[index]) flags[position.graphemeIndex] = true;
  });
  return flags;
}

/** Mirrors the existing placeholder casing without shifting around ignored marks. */
export function applyAnswerCasing(input: string, expected: string, options: AnswerComparisonOptions): string {
  const comparison = compareAnswerText(input, expected, options);
  const chars = splitGraphemes(input);
  comparison.input.positions.forEach((position, index) => {
    const targetPosition = comparison.expected.positions[index];
    if (!targetPosition || comparison.input.text[index] !== comparison.expected.text[index]) return;
    const target = expected.slice(targetPosition.start, targetPosition.end);
    const current = chars[position.graphemeIndex];
    if (target === target.toUpperCase()) chars[position.graphemeIndex] = current.toUpperCase();
    else if (target === target.toLowerCase()) chars[position.graphemeIndex] = current.toLowerCase();
  });
  return chars.join("");
}

export function getAnswerGhostSuffix(input: string, expected: string, options: AnswerComparisonOptions): string {
  if (!input) return expected;
  const comparison = compareAnswerText(input, expected, options);
  let suffixOffset = comparison.input.text.length;
  // Comparison trims trailing whitespace, but the overlay already renders it.
  // Whitespace runs normalize to one separator, so consume it only when expected.
  const hasTrailingWhitespace = /\s$/.test(input.replace(/[\u200B-\u200D\uFEFF]/g, ""));
  if (suffixOffset > 0 && hasTrailingWhitespace && comparison.expected.text[suffixOffset] === " ") {
    suffixOffset++;
  }
  const nextPosition = comparison.expected.positions[suffixOffset];
  const lastPosition = comparison.expected.positions.at(-1);
  return nextPosition && lastPosition ? expected.slice(nextPosition.start, lastPosition.end) : "";
}

export function getAnswerTypoDiff(input: string, expected: string, options: AnswerComparisonOptions) {
  const comparison = compareAnswerText(input, expected, options);
  const diff = calculateTypoDiff(comparison.input.text, comparison.expected.text);
  if (!diff) return null;
  const inputPosition = comparison.input.positions[diff.index];
  const expectedPosition = comparison.expected.positions[diff.index];
  return {
    ...diff,
    index: inputPosition?.start ?? comparison.input.positions.at(-1)?.end ?? input.length,
    inputLength: diff.type === "deletion" ? 0 : (inputPosition ? inputPosition.end - inputPosition.start : 0),
    inputChar: diff.type === "deletion" || !inputPosition ? "" : input.slice(inputPosition.start, inputPosition.end),
    expectedChar: diff.type === "insertion" || !expectedPosition ? "" : expected.slice(expectedPosition.start, expectedPosition.end),
  };
}
