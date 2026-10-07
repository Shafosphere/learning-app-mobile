import type { BoxesState, WordWithTranslations } from "@/src/types/boxes";

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

// Preserve the original recall order without box zero. With intro, box one recalls the front.
export function isStudyCardReversed(
  card: WordWithTranslations | null | undefined,
  box: keyof BoxesState | null,
  boxZeroEnabled: boolean,
): boolean {
  if (!card?.flipped || !box || isAnswerOnlyCard(card)) return false;
  return boxZeroEnabled
    ? box === "boxOne" || box === "boxThree" || box === "boxFive"
    : box === "boxTwo" || box === "boxFour";
}
