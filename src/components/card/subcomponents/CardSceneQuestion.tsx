import type { FlashcardsImageSize } from "@/src/contexts/SettingsContext";
import type { DatePattern } from "@/src/utils/dateInput";
import React from "react";
import type { TextInput } from "react-native";

import type { FocusTarget } from "../card-types";
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
  isMainAnswerNumeric: boolean;
  isMainAnswerDate: boolean;
  mainDatePattern?: DatePattern | null;
  focusTarget: FocusTarget;
  requestFocus: (target: FocusTarget) => void;
  canToggleTranslations: boolean;
  next: () => void;
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
      isMainAnswerNumeric={props.isMainAnswerNumeric}
      isMainAnswerDate={props.isMainAnswerDate}
      mainDatePattern={props.mainDatePattern}
      focusTarget={props.focusTarget}
      requestFocus={props.requestFocus}
      canToggleTranslations={props.canToggleTranslations}
      next={props.next}
      typoDiff={props.typoDiff}
      textColorOverride={props.textColorOverride}
    />
  );
}
