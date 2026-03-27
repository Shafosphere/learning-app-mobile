import { CardExplanation } from "./CardExplanation";

type CardSceneExplanationProps = {
  explanation: string;
  textColorOverride?: string;
};

export function CardSceneExplanation(props: CardSceneExplanationProps) {
  return (
    <CardExplanation
      explanation={props.explanation}
      textColorOverride={props.textColorOverride}
    />
  );
}
