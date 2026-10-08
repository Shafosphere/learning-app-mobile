import { Text } from "react-native";
import { splitGraphemes } from "@/src/utils/graphemes";
import { useStyles } from "../card-styles";
import type { ResponsiveFlashcardMetrics } from "../responsiveCardWidth";

/** Shared overlay for introduction, correction and partial letter hints. */
type GhostAnswerTextProps = {
  value: string;
  expected: string;
  cardMetrics: ResponsiveFlashcardMetrics;
  textColorOverride?: string;
};

export function GhostAnswerText({
  value,
  expected,
  cardMetrics,
  textColorOverride,
}: GhostAnswerTextProps) {
  const styles = useStyles();
  const typedLength = splitGraphemes(value).length;
  return (
    <>
      {splitGraphemes(expected).map((char, index) => (
        <Text
          key={`ghost-${index}`}
          style={[
            styles.overlayCharText,
            { fontSize: cardMetrics.fontSize, lineHeight: cardMetrics.lineHeight },
            styles.overlayExpectedSuffix,
            textColorOverride ? { color: textColorOverride, opacity: 0.38 } : null,
            index < typedLength ? { opacity: 0 } : null,
          ]}
        >
          {char === " " ? "\u00A0" : char}
        </Text>
      ))}
    </>
  );
}
