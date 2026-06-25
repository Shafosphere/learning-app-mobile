import type { BoxesState, WordWithTranslations } from "@/src/types/boxes";

export type ReviewMistakeNudgeCandidate = {
  card: WordWithTranslations;
  box: keyof BoxesState;
  wrongStreak: number;
};

export type ReviewMistakeNudgeState = ReviewMistakeNudgeCandidate & {
  confirming: boolean;
  error: boolean;
  preview?: boolean;
};

export type ReviewPendingExplanationMove = {
  cardId: number;
  promote: boolean;
} | null;
