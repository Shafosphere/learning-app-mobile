import { useMemo } from "react";
import { View } from "react-native";
import { useStyles } from "../card-styles";
import type { ResponsiveFlashcardMetrics } from "../responsiveCardWidth";
import { CardMathText, isMathOnlyText } from "./CardMathText";

type CardExplanationProps = {
  explanation: string;
  textColorOverride?: string;
  cardMetrics: ResponsiveFlashcardMetrics;
};

export function CardExplanation({
  explanation,
  textColorOverride,
  cardMetrics,
}: CardExplanationProps) {
  const styles = useStyles();
  const mathOnly = useMemo(() => isMathOnlyText(explanation), [explanation]);
  const textStyle = useMemo(
    () => [
      styles.empty,
      {
        fontSize: cardMetrics.fontSize,
        lineHeight: cardMetrics.lineHeight,
      },
      textColorOverride ? { color: textColorOverride } : null,
    ],
    [cardMetrics.fontSize, cardMetrics.lineHeight, styles, textColorOverride]
  );

  return (
    <View style={mathOnly ? styles.explanationOuterMathOnly : null}>
      <View
        style={[
          styles.explanationContainer,
          mathOnly && styles.explanationContainerMathOnly,
        ]}
      >
        <CardMathText text={explanation} textStyle={textStyle} />
      </View>
    </View>
  );
}
