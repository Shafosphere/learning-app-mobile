import { normalizeAnswerText } from "./answerNormalization";

/** Only converts characters introduced by this edit; replacements keep cursor offsets. */
export function convertSpanishPunctuation(
  previous: string,
  next: string,
  expectedAnswers: readonly string[],
  ignoreDiacritics: boolean,
): string {
  let start = 0;
  while (start < previous.length && start < next.length && previous[start] === next[start]) start++;
  let end = next.length;
  let previousEnd = previous.length;
  while (end > start && previousEnd > start && next[end - 1] === previous[previousEnd - 1]) {
    end--;
    previousEnd--;
  }
  const targets = expectedAnswers.map((answer) => normalizeAnswerText(answer, ignoreDiacritics));
  let result = next;
  for (let index = start; index < end; index++) {
    const inverted = result[index] === "?" ? "¿" : result[index] === "!" ? "¡" : null;
    if (!inverted) continue;
    // A sentinel preserves trailing whitespace in the prefix during normalization.
    const prefix = normalizeAnswerText(result.slice(0, index) + "\uE000", ignoreDiacritics).slice(0, -1);
    const candidates = targets.filter((target) => target.startsWith(prefix));
    if (candidates.length && candidates.every((target) => target[prefix.length] === inverted)) {
      result = result.slice(0, index) + inverted + result.slice(index + 1);
    }
  }
  return result;
}
