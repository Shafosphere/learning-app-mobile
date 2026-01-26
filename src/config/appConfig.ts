export const DEFAULT_FLASHCARDS_BATCH_SIZE = 10;

// Review intervals in milliseconds: [2d, 7d, 30d, 90d, 180d, 365d]
export const REVIEW_INTERVALS_MS = [
  // Index 0 is the “immediate” interval (Box 0), indexes 1–5 map to boxes one through five.
  0, // immediate
  60 * 1000, // 1 minute
  5 * 60 * 1000, // 5 minutes
  15 * 60 * 1000, // 15 minutes
  60 * 60 * 1000, // 1 hour
  2 * 60 * 60 * 1000, // 2 hours
];
