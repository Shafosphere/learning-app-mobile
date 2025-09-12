export const DEFAULT_FLASHCARDS_BATCH_SIZE = 10;

// Review intervals in milliseconds: [2d, 7d, 30d, 90d, 180d, 365d]
export const REVIEW_INTERVALS_MS = [
  // 2 * 24 * 60 * 60 * 1000,     // 2 days
  // 7 * 24 * 60 * 60 * 1000,     // 7 days
  // 30 * 24 * 60 * 60 * 1000,    // 30 days
  // 90 * 24 * 60 * 60 * 1000,    // 90 days
  // 180 * 24 * 60 * 60 * 1000,   // 180 days
  // 365 * 24 * 60 * 60 * 1000,   // 365 days

  0, // immediate
  60 * 1000, // 1 minute
  5 * 60 * 1000, // 5 minutes
  15 * 60 * 1000, // 15 minutes
  60 * 60 * 1000, // 1 hour
  2 * 60 * 60 * 1000, // 2 hours
];
