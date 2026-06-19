import type { ResponsiveFlashcardMetrics } from "../responsiveCardWidth";
import { CardExplanation } from "./CardExplanation";

type CardSceneExplanationProps = {
  explanation: string;
  textColorOverride?: string;
  cardMetrics: ResponsiveFlashcardMetrics;
};

export function CardSceneExplanation(props: CardSceneExplanationProps) {
  return (
    <CardExplanation
      explanation={props.explanation}
      textColorOverride={props.textColorOverride}
      cardMetrics={props.cardMetrics}
    />
  );
}
