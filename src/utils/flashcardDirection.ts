import type { WordWithTranslations } from "@/src/types/boxes";

type DirectionalCard = Pick<
  WordWithTranslations,
  "answerOnly" | "imageBack" | "imageFront" | "text" | "type"
>;

export function isAnswerOnlyCard(
  card: DirectionalCard | null | undefined
): boolean {
  if (!card) return false;
  if (card.type === "true_false" || card.type === "know_dont_know") {
    return true;
  }
  if (card.answerOnly) return true;

  const hasTextPrompt = Boolean(card.text?.trim());
  const hasImagePrompt = Boolean(card.imageFront || card.imageBack);
  return !hasTextPrompt && hasImagePrompt;
}
