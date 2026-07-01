import type { WordWithTranslations } from "@/src/types/boxes";
import { isAnswerOnlyCard } from "@/src/utils/flashcardDirection";

const makeCard = (
  overrides: Partial<WordWithTranslations> = {}
): WordWithTranslations => ({
  id: 1,
  text: "front",
  translations: ["back"],
  flipped: true,
  type: "text",
  ...overrides,
});

describe("isAnswerOnlyCard", () => {
  it.each([
    ["normal text card", makeCard(), false],
    [
      "image-only card",
      makeCard({ text: "", imageFront: "front.svg" }),
      true,
    ],
    ["explicit answer-only card", makeCard({ answerOnly: true }), true],
    ["true/false card", makeCard({ type: "true_false" }), true],
    ["know/don't-know card", makeCard({ type: "know_dont_know" }), true],
  ])("classifies %s", (_name, card, expected) => {
    expect(isAnswerOnlyCard(card as WordWithTranslations)).toBe(expected);
  });

  it("does not classify an empty card without an image as answer-only", () => {
    expect(isAnswerOnlyCard(makeCard({ text: "" }))).toBe(false);
  });
});
