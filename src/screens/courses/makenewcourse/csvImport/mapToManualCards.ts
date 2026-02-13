import {
  normalizeAnswers,
  type ManualCard,
  type ManualCardType,
} from "@/src/hooks/useManualCardsForm";
import type { CsvAnalysisResult } from "./types";

const parseBackAnswers = (value: string): string[] => {
  const normalized = value.trim();
  if (!normalized) return [];
  const chunks = normalized
    .split(/[;,|\n]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return normalizeAnswers(chunks.length > 0 ? chunks : [normalized]);
};

const mapType = (value: ManualCardType): ManualCardType => value;

export const mapAnalysisToManualCards = async (
  analysis: CsvAnalysisResult
): Promise<ManualCard[]> => {
  const cards = await Promise.all(
    analysis.validRows.map(async (row, index) => {
      const type = mapType(row.mappedType);
      const imageFront = await analysis.resolveImage(row.frontImageName);
      const imageBack = await analysis.resolveImage(row.backImageName);

      const card: ManualCard = {
        id: `csv-${Date.now()}-${index}`,
        front: row.frontText,
        answers: [""],
        flipped: row.flip,
        answerOnly: false,
        type,
        hintFront: "",
        hintBack: "",
        imageFront,
        imageBack,
        explanation: row.explanation,
      };

      if (type === "know_dont_know") {
        card.answerOnly = true;
        card.flipped = false;
        card.answers = [];
        card.explanation = row.explanation || row.backText || null;
      } else if (type === "true_false") {
        card.answers = [row.tfAnswer ? "true" : "false"];
      } else {
        card.answers = parseBackAnswers(row.backText);
      }

      return card;
    })
  );

  return cards.filter(
    (card) =>
      card.front.trim().length > 0 ||
      card.answers.some((answer) => answer.trim().length > 0) ||
      Boolean(card.imageFront) ||
      Boolean(card.imageBack)
  );
};
