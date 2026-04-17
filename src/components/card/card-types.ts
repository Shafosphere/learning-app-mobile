import { WordWithTranslations } from "@/src/types/boxes";

export type CardCorrectionType = {
  awers: string;
  rewers: string;
  input1: string;
  input2?: string;
  mode?: "demote" | "intro";
  cardId?: number;
  answerOnly?: boolean;
  promptText?: string;
  promptImageUri?: string | null;
  reversed?: boolean;
  word?: WordWithTranslations;
};

export type CardDisplayMode =
  | "empty"
  | "question"
  | "true_false"
  | "explanation"
  | "correction";

export type FocusTarget =
  | "none"
  | "main"
  | "correction1"
  | "correction2"
  | "hint";

export type CardProps = {
  coachmarkId?: string;
  selectedItem: WordWithTranslations | null;
  reversed?: boolean;
  answer: string;
  setAnswer: React.Dispatch<React.SetStateAction<string>>;
  setResult: React.Dispatch<React.SetStateAction<boolean | null>>;
  result: boolean | null;
  correction: CardCorrectionType | null;
  wrongInputChange: (which: 1 | 2, value: string) => void;
  introMode?: boolean;
  setCorrectionRewers?: (value: string) => void;
  confirm: (selectedTranslation?: string, answerOverride?: string) => void;
  onHintUpdate?: (
    cardId: number,
    hintFront: string | null,
    hintBack: string | null,
  ) => void;
  isFocused?: boolean;
  backgroundColorOverride?: string;
  textColorOverride?: string;
  hideHints?: boolean;
  isBetweenCards?: boolean;
  disableLayoutAnimation?: boolean;
  focusRequestToken?: number;
  showExplanationEnabled?: boolean;
  explanationOnlyOnWrong?: boolean;
  isExplanationVisible?: boolean;
  isExplanationPending?: boolean;
};
