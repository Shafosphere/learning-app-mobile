import type { FlashcardsImageSize } from "@/src/contexts/SettingsContext";
import React from "react";
import { Text } from "react-native";
import { useStyles } from "../card-styles";
import type { CardProps } from "../card-types";
import { CardCorrection } from "./CardCorrection";
import { CardInput } from "./CardInput";
import { CardTrueFalse } from "./CardTrueFalse";

interface CardContentResolverProps {
  // Props derived from main Card logic or passed through
  correction: CardProps["correction"];
  result: CardProps["result"];
  isIntroMode: boolean;
  selectedItem: CardProps["selectedItem"];
  promptText: string;
  promptImageUri: string | null;
  promptImageSizeMode: FlashcardsImageSize | "dynamic";
  correctionAwers: string;
  correctionRewers: string;
  answerOnly: boolean;
  shouldCorrectAwers: boolean;
  shouldCorrectRewers: boolean;
  useLargeLayout: boolean;
  layoutHandlers?: {
    onPromptLayout?: (height: number) => void;
    onInputLayout?: (height: number) => void;
  };
  correctionInput1Ref: React.MutableRefObject<any>;
  correctionInput2Ref: React.MutableRefObject<any>;
  input1ScrollRef: React.MutableRefObject<any>;
  input2ScrollRef: React.MutableRefObject<any>;
  handleCorrectionInput1Change: (t: string) => void;
  wrongInputChange: CardProps["wrongInputChange"];
  suggestionProps: any;
  renderOverlayText: (value: string, expected: string) => React.ReactNode;
  input1ContentWidth: number;
  input2ContentWidth: number;
  setInput1LayoutWidth: any;
  setInput2LayoutWidth: any;
  focusWithDelay: any;
  setIsCorrectionInput1Focused: any;
  setHangulTarget: any;
  shouldUseHangulKeyboardCorrection1: boolean;
  previousCorrectionInput2: React.MutableRefObject<string>;
  canToggleTranslations: boolean;
  next: () => void;
  input1LayoutWidth: number;
  input2LayoutWidth: number;
  noopTrueFalseAnswer: (val: boolean) => void;
  answer: string;
  handleAnswerChange: (val: string) => void;
  mainInputRef: React.MutableRefObject<any>;
  handleConfirm: () => void;
  shouldUseHangulKeyboardMain: boolean;
  setIsMainInputFocused: any;
  hangulTarget: any;
  typoDiff: any;
  textColorOverride?: string;
}

export const CardContentResolver = (props: CardContentResolverProps) => {
  const styles = useStyles();
  const {
    correction,
    result,
    isIntroMode,
    selectedItem,
    promptText,
    promptImageUri,
    promptImageSizeMode,
    correctionAwers,
    correctionRewers,
    answerOnly,
    shouldCorrectAwers,
    shouldCorrectRewers,
    useLargeLayout,
    layoutHandlers,
    correctionInput1Ref,
    correctionInput2Ref,
    input1ScrollRef,
    input2ScrollRef,
    handleCorrectionInput1Change,
    wrongInputChange,
    suggestionProps,
    renderOverlayText,
    input1ContentWidth,
    input2ContentWidth,
    setInput1LayoutWidth,
    setInput2LayoutWidth,
    focusWithDelay,
    setIsCorrectionInput1Focused,
    setHangulTarget,
    shouldUseHangulKeyboardCorrection1,
    previousCorrectionInput2,
    canToggleTranslations,
    next,
    input1LayoutWidth,
    input2LayoutWidth,
    noopTrueFalseAnswer,
    answer,
    handleAnswerChange,
    mainInputRef,
    handleConfirm,
    shouldUseHangulKeyboardMain,
    setIsMainInputFocused,
    hangulTarget,
    typoDiff,
    textColorOverride,
  } = props;

  const showCorrection = correction && (result === false || isIntroMode);
  const showTrueFalse = !showCorrection && selectedItem?.type === "true_false";
  const showInput = !showCorrection && !showTrueFalse && selectedItem;
  const showEmpty = !showCorrection && !showTrueFalse && !showInput;

  return (
    <>
      {showCorrection && (
        <CardCorrection
          correction={{
            ...correction!,
            input2: correction!.input2 ?? "",
          }}
          promptText={promptText}
          promptImageUri={promptImageUri}
          imageSizeMode={promptImageSizeMode}
          correctionAwers={correctionAwers}
          correctionRewers={correctionRewers}
          answerOnly={answerOnly}
          showAwersInput={shouldCorrectAwers}
          showRewersInput={shouldCorrectRewers}
          allowMultilinePrompt={useLargeLayout}
          onPromptLayout={layoutHandlers?.onPromptLayout}
          onInputLayout={layoutHandlers?.onInputLayout}
          input1Ref={correctionInput1Ref}
          input2Ref={correctionInput2Ref}
          input1ScrollRef={input1ScrollRef}
          input2ScrollRef={input2ScrollRef}
          handleCorrectionInput1Change={handleCorrectionInput1Change}
          wrongInputChange={wrongInputChange}
          suggestionProps={suggestionProps}
          isIntroMode={isIntroMode}
          renderOverlayText={renderOverlayText}
          input1ContentWidth={input1ContentWidth}
          input2ContentWidth={input2ContentWidth}
          setInput1LayoutWidth={setInput1LayoutWidth}
          setInput2LayoutWidth={setInput2LayoutWidth}
          focusWithDelay={focusWithDelay}
          setIsCorrectionInput1Focused={setIsCorrectionInput1Focused}
          setHangulTarget={setHangulTarget}
          shouldUseHangulKeyboardCorrection1={
            shouldUseHangulKeyboardCorrection1
          }
          previousCorrectionInput2={previousCorrectionInput2}
          canToggleTranslations={canToggleTranslations}
          next={next}
          input1LayoutWidth={input1LayoutWidth}
          input2LayoutWidth={input2LayoutWidth}
          textColorOverride={textColorOverride}
        />
      )}
      {showTrueFalse && (
        <CardTrueFalse
          promptText={promptText}
          promptImageUri={promptImageUri}
          allowMultilinePrompt={useLargeLayout}
          onAnswer={noopTrueFalseAnswer}
          showButtons={false}
        />
      )}
      {showInput && (
        <CardInput
          promptText={promptText}
          allowMultilinePrompt={useLargeLayout}
          onPromptLayout={layoutHandlers?.onPromptLayout}
          onInputLayout={layoutHandlers?.onInputLayout}
          promptImageUri={promptImageUri}
          imageSizeMode={promptImageSizeMode}
          answer={answer}
          setAnswer={handleAnswerChange}
          mainInputRef={mainInputRef}
          suggestionProps={suggestionProps}
          handleConfirm={handleConfirm}
          shouldUseHangulKeyboardMain={shouldUseHangulKeyboardMain}
          setIsMainInputFocused={setIsMainInputFocused}
          setHangulTarget={setHangulTarget}
          canToggleTranslations={canToggleTranslations}
          next={next}
          hangulTarget={hangulTarget}
          typoDiff={typoDiff}
          textColorOverride={textColorOverride}
        />
      )}
      {showEmpty && (
        <Text style={styles.empty}>Wybierz pudełko z słowkami</Text>
      )}
    </>
  );
};
