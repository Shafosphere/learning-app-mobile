import { REVIEW_INTERVALS_MS } from "@/src/config/appConfig";
import type { CEFRLevel } from "@/src/types/language";

export const ANSWER_SPLIT_REGEX = /[;,\n]/;

export function dedupeOrdered(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value);
      result.push(value);
    }
  }
  return result;
}

export function splitBackTextIntoAnswers(
  raw: string | null | undefined
): string[] {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) {
    return [];
  }

  const tentative = trimmed
    .split(ANSWER_SPLIT_REGEX)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  const candidates = tentative.length > 0 ? tentative : [trimmed];
  return dedupeOrdered(candidates);
}

export function normalizeAnswersInput(
  rawAnswers: (string | null | undefined)[] | undefined
): string[] {
  if (!rawAnswers || rawAnswers.length === 0) {
    return [];
  }
  const cleaned = rawAnswers
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length > 0);

  return dedupeOrdered(cleaned);
}

export function addAnswerIfPresent(
  target: string[],
  answer: string | null | undefined
) {
  if (!answer) {
    return;
  }
  const trimmed = answer.trim();
  if (!trimmed) {
    return;
  }
  if (!target.includes(trimmed)) {
    target.push(trimmed);
  }
}

export function computeNextReviewFromStage(
  stage: number,
  nowMs: number
): number {
  const idx = Math.max(0, Math.min(stage, REVIEW_INTERVALS_MS.length - 1));
  return nowMs + REVIEW_INTERVALS_MS[idx];
}

export function createEmptyLevelCounts(): Record<CEFRLevel, number> {
  return {
    A1: 0,
    A2: 0,
    B1: 0,
    B2: 0,
    C1: 0,
    C2: 0,
  };
}
