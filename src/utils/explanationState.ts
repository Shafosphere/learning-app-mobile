import type { WordWithTranslations } from "@/src/types/boxes";

type ExplanationStateParams = {
  selectedItem: WordWithTranslations | null | undefined;
  result: boolean | null;
  showCorrectionInputs?: boolean;
  showExplanationEnabled?: boolean;
  explanationOnlyOnWrong?: boolean;
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
  showExplanationEnabled = true,
  explanationOnlyOnWrong = false,
}: ExplanationStateParams): boolean => {
  if (!showExplanationEnabled || !selectedItem || result === null) {
    return false;
  }

  if (!explanationOnlyOnWrong) {
    return true;
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
  showExplanationEnabled = true,
  explanationOnlyOnWrong = false,
}: ExplanationStateParams) => {
  const explanationText = getExplanationText(selectedItem);
  const hasExplanation = showExplanationEnabled && explanationText.length > 0;
  const isExplanationPending =
    hasExplanation &&
    shouldExplanationBePending({
      selectedItem,
      result,
      showExplanationEnabled,
      explanationOnlyOnWrong,
    });
  const isExplanationVisible = isExplanationPending && !showCorrectionInputs;

  return {
    explanationText,
    hasExplanation,
    isExplanationPending,
    isExplanationVisible,
  };
};
