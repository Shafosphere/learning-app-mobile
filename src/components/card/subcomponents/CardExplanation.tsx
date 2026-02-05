import { useEffect, useMemo } from "react";
import { View } from "react-native";
import { useStyles } from "../card-styles";
import { CardMathText, isMathOnlyText } from "./CardMathText";

type CardExplanationProps = {
  explanation: string;
  onPromptLayout?: (height: number) => void;
  onInputLayout?: (height: number) => void;
  textColorOverride?: string;
};

export function CardExplanation({
  explanation,
  onPromptLayout,
  onInputLayout,
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

  useEffect(() => {
    // No input area in explanation-only view.
    onInputLayout?.(0);
  }, [onInputLayout]);

  return (
    <View style={mathOnly ? styles.explanationOuterMathOnly : null}>
      <View
        style={[
          styles.explanationContainer,
          mathOnly && styles.explanationContainerMathOnly,
        ]}
        onLayout={(event) => {
          onPromptLayout?.(event.nativeEvent.layout.height);
        }}
      >
        <CardMathText text={explanation} textStyle={textStyle} />
      </View>
    </View>
  );
}
