import { stripDiacritics } from "./diacritics";

export function normalizeAnswerText(
  rawValue: string,
  ignoreDiacritics: boolean,
): string {
  let normalized = rawValue
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  if (ignoreDiacritics) {
    normalized = stripDiacritics(normalized);
  }

  return normalized;
}
