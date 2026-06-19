import type { FlashcardsImageSize } from "@/src/contexts/SettingsContext";

import type { ResponsiveFlashcardMetrics } from "../responsiveCardWidth";
import { CardTrueFalse } from "./CardTrueFalse";

type CardSceneTrueFalseProps = {
  promptText: string;
  promptImageUri: string | null;
  allowMultilinePrompt: boolean;
  imageSizeMode: FlashcardsImageSize | "dynamic";
  cardMetrics: ResponsiveFlashcardMetrics;
};

export function CardSceneTrueFalse(props: CardSceneTrueFalseProps) {
  return (
    <CardTrueFalse
      promptText={props.promptText}
      promptImageUri={props.promptImageUri}
      allowMultilinePrompt={props.allowMultilinePrompt}
      onAnswer={() => undefined}
      showButtons={false}
      imageSizeMode={
        props.imageSizeMode === "dynamic"
          ? "dynamic"
          : (props.imageSizeMode as FlashcardsImageSize)
      }
      cardMetrics={props.cardMetrics}
    />
  );
}
