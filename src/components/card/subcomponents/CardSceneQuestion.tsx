import type { FlashcardsImageSize } from "@/src/contexts/SettingsContext";
import type { DatePattern } from "@/src/utils/dateInput";
import React from "react";
import type { TextInput } from "react-native";

import { CardInput } from "./CardInput";

type CardSceneQuestionProps = {
  promptText: string;
  promptImageUri: string | null;
  allowMultilinePrompt: boolean;
  imageSizeMode: FlashcardsImageSize;
  answer: string;
  handleAnswerChange: (val: string) => void;
  mainInputRef: React.MutableRefObject<TextInput | null>;
  suggestionProps: any;
  handleConfirm: () => void;
  shouldUseHangulKeyboardMain: boolean;
  isMainAnswerNumeric: boolean;
  isMainAnswerDate: boolean;
  mainDatePattern?: DatePattern | null;
  setIsMainInputFocused: (focused: boolean) => void;
  setHangulTarget: (target: "main" | "correction1" | null) => void;
  canToggleTranslations: boolean;
  next: () => void;
  hangulTarget: "main" | "correction1" | null;
  typoDiff: any;
  textColorOverride?: string;
};

export function CardSceneQuestion(props: CardSceneQuestionProps) {
  return (
    <CardInput
      promptText={props.promptText}
      allowMultilinePrompt={props.allowMultilinePrompt}
      promptImageUri={props.promptImageUri}
      imageSizeMode={props.imageSizeMode}
      answer={props.answer}
      setAnswer={props.handleAnswerChange}
      mainInputRef={props.mainInputRef}
      suggestionProps={props.suggestionProps}
      handleConfirm={props.handleConfirm}
      shouldUseHangulKeyboardMain={props.shouldUseHangulKeyboardMain}
      isMainAnswerNumeric={props.isMainAnswerNumeric}
      isMainAnswerDate={props.isMainAnswerDate}
      mainDatePattern={props.mainDatePattern}
      setIsMainInputFocused={props.setIsMainInputFocused}
      setHangulTarget={props.setHangulTarget}
      canToggleTranslations={props.canToggleTranslations}
      next={props.next}
      hangulTarget={props.hangulTarget}
      typoDiff={props.typoDiff}
      textColorOverride={props.textColorOverride}
    />
  );
}
