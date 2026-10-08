import type { FlashcardsImageSize } from "@/src/contexts/SettingsContext";
import type { DatePattern } from "@/src/utils/dateInput";
import React from "react";
import type { TextInput } from "react-native";

import type { ResponsiveFlashcardMetrics } from "../responsiveCardWidth";
import type { FocusTarget, InlineCardAction } from "../card-types";
import { CardInput } from "./CardInput";

type CardSceneQuestionProps = {
  inlineAction?: InlineCardAction;
  promptText: string;
  promptImageUri: string | null;
  allowMultilinePrompt: boolean;
  imageSizeMode: FlashcardsImageSize;
  answer: string;
  emptyAnswerSubmitWarning: boolean;
  handleAnswerChange: (val: string) => void;
  mainInputRef: React.MutableRefObject<TextInput | null>;
  suggestionProps: any;
  handleConfirm: () => void;
  letterHintPrefix?: string;
  isMainAnswerNumeric: boolean;
  isMainAnswerDate: boolean;
  mainDatePattern?: DatePattern | null;
  focusTarget: FocusTarget;
  requestFocus: (target: FocusTarget) => void;
  onMainInputFocus?: () => void;
  onMainInputBlur?: () => void;
  canToggleTranslations: boolean;
  next: () => void;
  typoDiff: any;
  textColorOverride?: string;
  cardMetrics: ResponsiveFlashcardMetrics;
};

export function CardSceneQuestion(props: CardSceneQuestionProps) {
  return (
    <CardInput
      inlineAction={props.inlineAction}
      promptText={props.promptText}
      emptyAnswerSubmitWarning={props.emptyAnswerSubmitWarning}
      allowMultilinePrompt={props.allowMultilinePrompt}
      promptImageUri={props.promptImageUri}
      imageSizeMode={props.imageSizeMode}
      answer={props.answer}
      setAnswer={props.handleAnswerChange}
      mainInputRef={props.mainInputRef}
      suggestionProps={props.suggestionProps}
      handleConfirm={props.handleConfirm}
      letterHintPrefix={props.letterHintPrefix}
      isMainAnswerNumeric={props.isMainAnswerNumeric}
      isMainAnswerDate={props.isMainAnswerDate}
      mainDatePattern={props.mainDatePattern}
      focusTarget={props.focusTarget}
      requestFocus={props.requestFocus}
      onMainInputFocus={props.onMainInputFocus}
      onMainInputBlur={props.onMainInputBlur}
      canToggleTranslations={props.canToggleTranslations}
      next={props.next}
      typoDiff={props.typoDiff}
      textColorOverride={props.textColorOverride}
      cardMetrics={props.cardMetrics}
    />
  );
}
