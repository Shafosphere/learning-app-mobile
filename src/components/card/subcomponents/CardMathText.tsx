import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MathJaxSvg } from "react-native-mathjax-html-to-svg";

const DEFAULT_FONT_SIZE = 16;

type Segment = {
  type: "text" | "math";
  value: string;
  display: boolean;
};

type CardMathTextProps = {
  text: string;
  textStyle?: any;
  colorOverride?: string;
  onLayout?: (event: any) => void;
};

const hasMathDelimiter = (text: string) =>
  text.includes("$") || text.includes("\\(") || text.includes("\\[");

const parseSegments = (text: string): Segment[] => {
  if (!hasMathDelimiter(text)) {
    return [{ type: "text", value: text, display: false }];
  }

  const segments: Segment[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const nextDollar = text.indexOf("$", cursor);
    if (nextDollar === -1) {
      const tail = text.slice(cursor);
      if (tail) {
        segments.push({ type: "text", value: tail, display: false });
      }
      break;
    }

    if (nextDollar > cursor) {
      segments.push({
        type: "text",
        value: text.slice(cursor, nextDollar),
        display: false,
      });
    }

    const isDouble = text[nextDollar + 1] === "$";
    const delimiter = isDouble ? "$$" : "$";
    const mathStart = nextDollar + delimiter.length;
    const mathEnd = text.indexOf(delimiter, mathStart);

    if (mathEnd === -1) {
      segments.push({
        type: "text",
        value: text.slice(nextDollar),
        display: false,
      });
      break;
    }

    const mathValue = text.slice(mathStart, mathEnd);
    segments.push({ type: "math", value: mathValue, display: isDouble });
    cursor = mathEnd + delimiter.length;
  }

  if (segments.length === 0) {
    return [{ type: "text", value: text, display: false }];
  }

  return segments;
};

const splitTextSegment = (value: string): Segment[] =>
  value
    .split(/(\s+)/)
    .filter(Boolean)
    .map((chunk) => ({ type: "text" as const, value: chunk, display: false }));

export const hasMathSegments = (text: string) =>
  parseSegments(text).some((segment) => segment.type === "math");

export const isMathOnlyText = (text: string) => {
  const segments = parseSegments(text);
  return (
    segments.length > 0 &&
    segments.every(
      (segment) =>
        segment.type === "math" ||
        (segment.type === "text" && segment.value.trim().length === 0),
    )
  );
};

export function CardMathText({
  text,
  textStyle,
  colorOverride,
  onLayout,
}: CardMathTextProps) {
  const segments = useMemo(() => parseSegments(text), [text]);
  const hasMath = useMemo(() => hasMathSegments(text), [text]);
  const isMathOnly = useMemo(() => isMathOnlyText(text), [text]);
  const wrappedSegments = useMemo(
    () =>
      hasMath
        ? segments.flatMap((segment) =>
            segment.type === "text" ? splitTextSegment(segment.value) : [segment],
          )
        : segments,
    [hasMath, segments],
  );
  const flattenedStyle = useMemo(
    () => (StyleSheet.flatten(textStyle) || {}) as any,
    [textStyle],
  );
  const fontSize =
    typeof flattenedStyle.fontSize === "number"
      ? flattenedStyle.fontSize
      : DEFAULT_FONT_SIZE;
  const color = colorOverride ?? flattenedStyle.color ?? "#000";
  const adjustedTextStyle = useMemo(
    () => [textStyle, styles.leftAlignedText],
    [textStyle],
  );

  if (!hasMath) {
    return (
      <Text style={[textStyle, styles.wrapText]} onLayout={onLayout}>
        {text}
      </Text>
    );
  }

  return (
    <View
      style={[styles.row, hasMath && styles.rowWithMath, isMathOnly && styles.rowMathOnly]}
      onLayout={onLayout}
    >
      {wrappedSegments.map((segment, index) => {
        if (segment.type === "text") {
          return (
            <Text key={`t-${index}`} style={adjustedTextStyle}>
              {segment.value}
            </Text>
          );
        }

        const wrapper = segment.display ? "\\[" : "\\(";
        const closer = segment.display ? "\\]" : "\\)";

        return (
          <MathJaxSvg
            key={`m-${index}`}
            fontSize={fontSize}
            color={color}
            style={styles.inlineMath}
          >
            {`${wrapper}${segment.value}${closer}`}
          </MathJaxSvg>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  rowWithMath: {
    alignSelf: "stretch",
    width: "100%",
  },
  rowMathOnly: {
    justifyContent: "center",
  },
  leftAlignedText: {
    textAlign: "left",
  },
  wrapText: {
    alignSelf: "stretch",
    flexShrink: 1,
    maxWidth: "100%",
  },
  inlineMath: {
    alignSelf: "center",
  },
});
