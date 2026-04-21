export const DEFAULT_FLASHCARDS_BATCH_SIZE = 10;

const DAY_MS = 24 * 60 * 60 * 1000;

export const REVIEW_INTERVAL_RANGES_MS = [
  [1 * DAY_MS, 2 * DAY_MS],
  [4 * DAY_MS, 5 * DAY_MS],
  [7 * DAY_MS, 10 * DAY_MS],
  [17 * DAY_MS, 20 * DAY_MS],
  [20 * DAY_MS, 40 * DAY_MS],
  [40 * DAY_MS, 80 * DAY_MS],
] as const;
