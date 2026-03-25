import type { WordWithTranslations } from "@/src/types/boxes";

type ExplanationStateParams = {
  selectedItem: WordWithTranslations | null | undefined;
  result: boolean | null;
  showCorrectionInputs?: boolean;
};

const getExplanationText = (
  selectedItem: WordWithTranslations | null | undefined,
): string => {
  return typeof selectedItem?.explanation === "string"
    ? selectedItem.explanation.trim()
    : "";
};

const shouldExplanationBePending = ({
  selectedItem,
  result,
}: ExplanationStateParams): boolean => {
  if (!selectedItem || result === null) {
    return false;
  }

  if (selectedItem.type === "true_false") {
    return result === false;
  }

  if (selectedItem.type === "know_dont_know") {
    return true;
  }

  return true;
};

export const getExplanationState = ({
  selectedItem,
  result,
  showCorrectionInputs = false,
}: ExplanationStateParams) => {
  const explanationText = getExplanationText(selectedItem);
  const hasExplanation = explanationText.length > 0;
  const isExplanationPending =
    hasExplanation && shouldExplanationBePending({ selectedItem, result });
  const isExplanationVisible = isExplanationPending && !showCorrectionInputs;

  return {
    explanationText,
    hasExplanation,
    isExplanationPending,
    isExplanationVisible,
  };
};
