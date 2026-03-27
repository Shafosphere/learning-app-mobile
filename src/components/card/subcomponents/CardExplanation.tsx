import { useMemo } from "react";
import { View } from "react-native";
import { useStyles } from "../card-styles";
import { CardMathText, isMathOnlyText } from "./CardMathText";

type CardExplanationProps = {
  explanation: string;
  textColorOverride?: string;
};

export function CardExplanation({
  explanation,
  textColorOverride,
}: CardExplanationProps) {
  const styles = useStyles();
  const mathOnly = useMemo(() => isMathOnlyText(explanation), [explanation]);
  const textStyle = useMemo(
    () => [
      styles.empty,
      textColorOverride ? { color: textColorOverride } : null,
    ],
    [styles, textColorOverride]
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
