import { useEffect, useMemo } from "react";
import { Text, View } from "react-native";
import { useStyles } from "../card-styles";

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
    <View
      style={styles.explanationContainer}
      onLayout={(event) => {
        onPromptLayout?.(event.nativeEvent.layout.height);
      }}
    >
      <Text style={textStyle}>{explanation}</Text>
    </View>
  );
}
