import type { FlashcardsImageSize } from "@/src/contexts/SettingsContext";
import type { DatePattern } from "@/src/utils/dateInput";
import type { MutableRefObject } from "react";
import type { ScrollView, TextInput } from "react-native";

import type { CardCorrectionType } from "../card-types";
import type { FocusTarget } from "../card-types";
import { CardCorrection } from "./CardCorrection";

type CardSceneCorrectionProps = {
  correction: CardCorrectionType;
  promptText: string;
  promptImageUri?: string | null;
  correctionAwers: string;
  correctionRewers: string;
  answerOnly: boolean;
  showAwersInput: boolean;
  showRewersInput: boolean;
  allowMultilinePrompt: boolean;
  input1Ref: MutableRefObject<TextInput | null>;
  input2Ref: MutableRefObject<TextInput | null>;
  input1ScrollRef: MutableRefObject<ScrollView | null>;
  input2ScrollRef: MutableRefObject<ScrollView | null>;
  handleCorrectionInput1Change: (text: string) => void;
  wrongInputChange: (which: 1 | 2, value: string) => void;
  suggestionProps: any;
  isIntroMode: boolean;
  renderOverlayText: (value: string, expected: string) => React.ReactNode;
  input1ContentWidth: number;
  input2ContentWidth: number;
  setInput1LayoutWidth: (width: number) => void;
  setInput2LayoutWidth: (width: number) => void;
  focusTarget: FocusTarget;
  requestFocus: (target: FocusTarget) => void;
  onCorrection1Completed: () => void;
  isCorrectionInput1Numeric: boolean;
  isCorrectionInput1Date: boolean;
  correctionInput1DatePattern?: DatePattern | null;
  isCorrectionInput2Numeric: boolean;
  isCorrectionInput2Date: boolean;
  correctionInput2DatePattern?: DatePattern | null;
  previousCorrectionInput2: MutableRefObject<string>;
  canToggleTranslations: boolean;
  next: () => void;
  input1LayoutWidth: number;
  input2LayoutWidth: number;
  imageSizeMode: FlashcardsImageSize;
  textColorOverride?: string;
};

export function CardSceneCorrection(props: CardSceneCorrectionProps) {
  return (
    <CardCorrection
      correction={{ ...props.correction, input2: props.correction.input2 ?? "" }}
      promptText={props.promptText}
      promptImageUri={props.promptImageUri}
      correctionAwers={props.correctionAwers}
      correctionRewers={props.correctionRewers}
      answerOnly={props.answerOnly}
      showAwersInput={props.showAwersInput}
      showRewersInput={props.showRewersInput}
      allowMultilinePrompt={props.allowMultilinePrompt}
      input1Ref={props.input1Ref}
      input2Ref={props.input2Ref}
      input1ScrollRef={props.input1ScrollRef}
      input2ScrollRef={props.input2ScrollRef}
      handleCorrectionInput1Change={props.handleCorrectionInput1Change}
      wrongInputChange={props.wrongInputChange}
      suggestionProps={props.suggestionProps}
      isIntroMode={props.isIntroMode}
      renderOverlayText={props.renderOverlayText}
      input1ContentWidth={props.input1ContentWidth}
      input2ContentWidth={props.input2ContentWidth}
      setInput1LayoutWidth={props.setInput1LayoutWidth}
      setInput2LayoutWidth={props.setInput2LayoutWidth}
      focusTarget={props.focusTarget}
      requestFocus={props.requestFocus}
      onCorrection1Completed={props.onCorrection1Completed}
      isCorrectionInput1Numeric={props.isCorrectionInput1Numeric}
      isCorrectionInput1Date={props.isCorrectionInput1Date}
      correctionInput1DatePattern={props.correctionInput1DatePattern}
      isCorrectionInput2Numeric={props.isCorrectionInput2Numeric}
      isCorrectionInput2Date={props.isCorrectionInput2Date}
      correctionInput2DatePattern={props.correctionInput2DatePattern}
      previousCorrectionInput2={props.previousCorrectionInput2}
      canToggleTranslations={props.canToggleTranslations}
      next={props.next}
      input1LayoutWidth={props.input1LayoutWidth}
      input2LayoutWidth={props.input2LayoutWidth}
      imageSizeMode={props.imageSizeMode}
      textColorOverride={props.textColorOverride}
    />
  );
}
