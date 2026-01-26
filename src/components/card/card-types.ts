import { WordWithTranslations } from "@/src/types/boxes";

export type CardCorrectionType = {
  awers: string;
  rewers: string;
  input1: string;
  input2?: string;
  mode?: "demote" | "intro";
  cardId?: number;
};

export type CardProps = {
  selectedItem: WordWithTranslations | null;
  reversed?: boolean;
  answer: string;
  setAnswer: React.Dispatch<React.SetStateAction<string>>;
  setResult: React.Dispatch<React.SetStateAction<boolean | null>>;
  result: boolean | null;
  correction: CardCorrectionType | null;
  wrongInputChange: (which: 1 | 2, value: string) => void;
  onDownload: () => Promise<void>;
  downloadDisabled?: boolean;
  introMode?: boolean;
  setCorrectionRewers?: (value: string) => void;
  confirm: (selectedTranslation?: string, answerOverride?: string) => void;
  onHintUpdate?: (
    cardId: number,
    hintFront: string | null,
    hintBack: string | null,
  ) => void;
  hideActions?: boolean;
  isFocused?: boolean;
  backgroundColorOverride?: string;
  textColorOverride?: string;
  hideHints?: boolean;
};
