import type { FlashcardsImageSize } from "@/src/contexts/SettingsContext";
import type { DatePattern } from "@/src/utils/dateInput";
import React from "react";
import type { CardDisplayMode, CardProps } from "../card-types";
import { CardSceneCorrection } from "./CardSceneCorrection";
import { CardSceneEmpty } from "./CardSceneEmpty";
import { CardSceneExplanation } from "./CardSceneExplanation";
import { CardSceneQuestion } from "./CardSceneQuestion";
import { CardSceneTrueFalse } from "./CardSceneTrueFalse";

interface CardContentResolverProps {
  displayMode: CardDisplayMode;
  correction: CardProps["correction"];
  isIntroMode: boolean;
  explanationText: string;
  promptText: string;
  promptImageUri: string | null;
  promptImageSizeMode: FlashcardsImageSize | "dynamic";
  correctionAwers: string;
  correctionRewers: string;
  answerOnly: boolean;
  shouldCorrectAwers: boolean;
  shouldCorrectRewers: boolean;
  isMainAnswerNumeric: boolean;
  isMainAnswerDate: boolean;
  mainDatePattern?: DatePattern | null;
  isCorrectionInput1Numeric: boolean;
  isCorrectionInput1Date: boolean;
  correctionInput1DatePattern?: DatePattern | null;
  isCorrectionInput2Numeric: boolean;
  isCorrectionInput2Date: boolean;
  correctionInput2DatePattern?: DatePattern | null;
  useLargeLayout: boolean;
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
  noopTrueFalseAnswer?: (val: boolean) => void;
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
  const {
    displayMode,
    correction,
    isIntroMode,
    explanationText,
    promptText,
    promptImageUri,
    promptImageSizeMode,
    correctionAwers,
    correctionRewers,
    answerOnly,
    shouldCorrectAwers,
    shouldCorrectRewers,
    isMainAnswerNumeric,
    isMainAnswerDate,
    mainDatePattern,
    isCorrectionInput1Numeric,
    isCorrectionInput1Date,
    correctionInput1DatePattern,
    isCorrectionInput2Numeric,
    isCorrectionInput2Date,
    correctionInput2DatePattern,
    useLargeLayout,
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
    noopTrueFalseAnswer = () => {},
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

  switch (displayMode) {
    case "correction":
      return correction ? (
        <CardSceneCorrection
          correction={correction}
          promptText={promptText}
          promptImageUri={promptImageUri}
          correctionAwers={correctionAwers}
          correctionRewers={correctionRewers}
          answerOnly={answerOnly}
          showAwersInput={shouldCorrectAwers}
          showRewersInput={shouldCorrectRewers}
          allowMultilinePrompt={useLargeLayout}
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
          shouldUseHangulKeyboardCorrection1={shouldUseHangulKeyboardCorrection1}
          isCorrectionInput1Numeric={isCorrectionInput1Numeric}
          isCorrectionInput1Date={isCorrectionInput1Date}
          correctionInput1DatePattern={correctionInput1DatePattern}
          isCorrectionInput2Numeric={isCorrectionInput2Numeric}
          isCorrectionInput2Date={isCorrectionInput2Date}
          correctionInput2DatePattern={correctionInput2DatePattern}
          previousCorrectionInput2={previousCorrectionInput2}
          canToggleTranslations={canToggleTranslations}
          next={next}
          input1LayoutWidth={input1LayoutWidth}
          input2LayoutWidth={input2LayoutWidth}
          imageSizeMode={promptImageSizeMode === "dynamic" ? "dynamic" : promptImageSizeMode}
          textColorOverride={textColorOverride}
        />
      ) : null;
    case "explanation":
      return (
        <CardSceneExplanation
          explanation={explanationText}
          textColorOverride={textColorOverride}
        />
      );
    case "true_false":
      return (
        <CardSceneTrueFalse
          promptText={promptText}
          promptImageUri={promptImageUri}
          allowMultilinePrompt={useLargeLayout}
          imageSizeMode={promptImageSizeMode}
        />
      );
    case "question":
      return (
        <CardSceneQuestion
          promptText={promptText}
          promptImageUri={promptImageUri}
          allowMultilinePrompt={useLargeLayout}
          imageSizeMode={promptImageSizeMode}
          answer={answer}
          handleAnswerChange={handleAnswerChange}
          mainInputRef={mainInputRef}
          suggestionProps={suggestionProps}
          handleConfirm={handleConfirm}
          shouldUseHangulKeyboardMain={shouldUseHangulKeyboardMain}
          isMainAnswerNumeric={isMainAnswerNumeric}
          isMainAnswerDate={isMainAnswerDate}
          mainDatePattern={mainDatePattern}
          setIsMainInputFocused={setIsMainInputFocused}
          setHangulTarget={setHangulTarget}
          canToggleTranslations={canToggleTranslations}
          next={next}
          hangulTarget={hangulTarget}
          typoDiff={typoDiff}
          textColorOverride={textColorOverride}
        />
      );
    case "empty":
    default:
      return <CardSceneEmpty />;
  }
};
