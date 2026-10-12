import { Text } from "react-native";
import { getAnswerGhostSuffix } from "@/src/utils/answerComparison";
import { splitGraphemes } from "@/src/utils/graphemes";
import { useStyles } from "../card-styles";
import type { ResponsiveFlashcardMetrics } from "../responsiveCardWidth";

/** Shared overlay for introduction, correction and partial letter hints. */
type GhostAnswerTextProps = {
  value: string;
  expected: string;
  cardMetrics: ResponsiveFlashcardMetrics;
  textColorOverride?: string;
  ignoreDiacritics?: boolean;
  ignoreBoundaryPunctuation?: boolean;
};

export function GhostAnswerText({
  value,
  expected,
  cardMetrics,
  textColorOverride,
  ignoreDiacritics = false,
  ignoreBoundaryPunctuation = false,
}: GhostAnswerTextProps) {
  const styles = useStyles();
  const typedChars = splitGraphemes(value);
  const suffix = getAnswerGhostSuffix(value, expected, { ignoreDiacritics, ignoreBoundaryPunctuation });
  const displayedChars = ignoreBoundaryPunctuation
    ? [...typedChars, ...splitGraphemes(suffix)]
    : splitGraphemes(expected);
  return (
    <>
      {displayedChars.map((char, index) => (
        <Text
          key={`ghost-${index}`}
          style={[
            styles.overlayCharText,
            { fontSize: cardMetrics.fontSize, lineHeight: cardMetrics.lineHeight },
            styles.overlayExpectedSuffix,
            textColorOverride ? { color: textColorOverride, opacity: 0.38 } : null,
            index < typedChars.length ? { opacity: 0 } : null,
          ]}
        >
          {char === " " ? "\u00A0" : char}
        </Text>
      ))}
    </>
  );
}
