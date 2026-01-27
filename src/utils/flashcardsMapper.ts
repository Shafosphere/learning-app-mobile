import { type CustomFlashcardRecord } from "@/src/db/sqlite/repositories/flashcards";
import { type CustomReviewFlashcard } from "@/src/db/sqlite/repositories/reviews";
import { type WordWithTranslations } from "@/src/types/boxes";

const normalizeTranslations = (
  rawBack: string | undefined | null,
  answers: string[] | undefined | null,
): string[] => {
  const normalizedAnswers = (answers ?? [])
    .map((answer) => answer.trim())
    .filter((answer) => answer.length > 0);

  const uniqueAnswers: string[] = [];
  for (const answer of normalizedAnswers) {
    if (!uniqueAnswers.includes(answer)) {
      uniqueAnswers.push(answer);
    }
  }

  const fallback = (rawBack ?? "")
    .split(/[;,\n]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  const defaultTranslation = (rawBack ?? "").trim();

  if (uniqueAnswers.length > 0) return uniqueAnswers;
  if (fallback.length > 0) return fallback;
  return [defaultTranslation];
};

const mapBaseCard = (
  card: Pick<
    CustomFlashcardRecord,
    | "id"
    | "frontText"
    | "backText"
    | "answers"
    | "flipped"
    | "answerOnly"
    | "hintFront"
    | "hintBack"
    | "imageFront"
    | "imageBack"
    | "type"
  >,
): WordWithTranslations => {
  const translations = normalizeTranslations(card.backText, card.answers);
  return {
    id: card.id,
    text: card.frontText?.trim() ?? "",
    translations,
    flipped: card.flipped,
    answerOnly: card.answerOnly ?? false,
    hintFront: card.hintFront,
    hintBack: card.hintBack,
    imageFront: card.imageFront ?? null,
    imageBack: card.imageBack ?? null,
    type: (card.type as "text" | "image" | "true_false") || "text",
  };
};

export const mapCustomCardToWord = (
  card: CustomFlashcardRecord,
): WordWithTranslations => mapBaseCard(card);

export const mapReviewCardToWord = (
  card: CustomReviewFlashcard,
): WordWithTranslations => ({
  ...mapBaseCard(card),
  stage: card.stage,
  nextReview: card.nextReview,
});
