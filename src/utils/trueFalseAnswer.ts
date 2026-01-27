type ConfirmFn = (selectedTranslation?: string, answerOverride?: string) => void;

interface TrueFalseHandlerOptions {
  setAnswer: (value: string) => void;
  confirm: ConfirmFn;
  passChoiceAsSelectedTranslation?: boolean;
}

export const makeTrueFalseHandler = ({
  setAnswer,
  confirm,
  passChoiceAsSelectedTranslation = false,
}: TrueFalseHandlerOptions) => {
  return (value: boolean) => {
    const choice = value ? "true" : "false";
    setAnswer(choice);
    if (passChoiceAsSelectedTranslation) {
      confirm(choice, choice);
      return;
    }
    confirm(undefined, choice);
  };
};
