export const REVIEW_EMPTY_MESSAGES = ["break", "allReviewed", "comeBackLater"] as const;

export type ReviewEmptyMessage = (typeof REVIEW_EMPTY_MESSAGES)[number]
  | "noCourses" | "noPinnedCourses" | "reviewsDisabled";

// Session-only history also survives remounting the review screen.
let previousMessage: ReviewEmptyMessage | undefined;

export function selectReviewEmptyMessage(): ReviewEmptyMessage {
  const candidates = REVIEW_EMPTY_MESSAGES.filter((message) => message !== previousMessage);
  const message = candidates[Math.floor(Math.random() * candidates.length)];
  previousMessage = message;
  return message;
}
