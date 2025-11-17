import type { SessionStepTemplate } from "@/src/screens/review/minigames/sessionStore";
import { getLetterIndices, type SanitizedWord } from "./minigame-generators";

type EligibilityResolver = (words: SanitizedWord[]) => SanitizedWord[];

export type MinigameRequirement = {
  type: SessionStepTemplate["type"];
  label: string;
  description: string;
  /**
   * Minimum number of distinct words that must satisfy the `eligibleWords` filter.
   * For games where we always pick a fixed amount (e.g. 3 for Input a letter),
   * this matches that value. For "table" it is 0 because it only shows a summary.
   */
  minDistinctWords: number;
  /**
   * Explains how many words we actually select for a single round.
   * Useful for documentation/UIs.
   */
  selectCount?: number;
  /**
   * Function that narrows the list of words that can participate in the game.
   */
  eligibleWords: EligibilityResolver;
  /**
   * Marks helper screens that are not minigames (e.g. summary table).
   */
  isSummary?: boolean;
  /**
   * Additional hints about special requirements.
   */
  notes?: string;
};

const allowAllWords: EligibilityResolver = (words) => words;

const atLeastTwoCharacters: EligibilityResolver = (words) =>
  words.filter((word) => word.term.trim().length >= 2);

const hasReplaceableLetters: EligibilityResolver = (words) =>
  words.filter((word) => getLetterIndices(word.term).length > 0);

const hasTranslations: EligibilityResolver = (words) =>
  words.filter((word) => word.translations.length > 0);

export const MINIGAME_REQUIREMENTS: MinigameRequirement[] = [
  {
    type: "memory",
    label: "Memory game",
    description: "Potrzebuje 4 słówek, by stworzyć planszę do zapamiętania.",
    minDistinctWords: 4,
    selectCount: 4,
    eligibleWords: allowAllWords,
  },
  {
    type: "chooseone",
    label: "Choose one",
    description:
      "Wybiera 1 słowo jako pytanie i potrzebuje innych tłumaczeń jako dystraktorów.",
    minDistinctWords: 1,
    selectCount: 1,
    eligibleWords: hasTranslations,
    notes:
      "W praktyce wymagamy min. 3 unikalnych tłumaczeń w całej puli, aby stworzyć dystraktory.",
  },
  {
    type: "inputaletter",
    label: "Input a letter",
    description:
      "Wybiera 3 słowa z literami, które można ukryć, aby gracz je uzupełnił.",
    minDistinctWords: 3,
    selectCount: 3,
    eligibleWords: hasReplaceableLetters,
  },
  {
    type: "getapair",
    label: "Get a pair",
    description:
      "Potrzebuje 3 słówek z tłumaczeniami oraz dodatkowych tłumaczeń do błędnych par.",
    minDistinctWords: 3,
    selectCount: 3,
    eligibleWords: hasTranslations,
    notes:
      "Do fałszywych par korzysta też z tłumaczeń poziomu (levelTranslations).",
  },
  {
    type: "wrongletter",
    label: "Wrong letter",
    description:
      "Wymaga słowa o długości co najmniej 2 znaków, aby można było wstawić złą literę.",
    minDistinctWords: 1,
    selectCount: 1,
    eligibleWords: atLeastTwoCharacters,
  },
  {
    type: "table",
    label: "Tabela podsumowująca",
    description: "Prezentuje wszystkie słówka po zakończeniu gier.",
    minDistinctWords: 0,
    eligibleWords: allowAllWords,
    isSummary: true,
  },
];

export const getMinigameRequirement = (
  type: SessionStepTemplate["type"]
): MinigameRequirement | undefined =>
  MINIGAME_REQUIREMENTS.find((entry) => entry.type === type);
