type CorrectionFieldSource = {
  answerOnly?: boolean;
  reversed?: boolean;
};

export function getCorrectionFieldRequirements(
  correction: CorrectionFieldSource
) {
  return {
    awers: correction.reversed,
    rewers: !correction.reversed || Boolean(correction.answerOnly),
  };
}
