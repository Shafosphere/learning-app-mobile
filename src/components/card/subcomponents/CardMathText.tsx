import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
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

const splitMathForWrap = (value: string): string[] => {
  const chunks: string[] = [];
  let buffer = "";
  let bracesDepth = 0;
  let parenDepth = 0;
  let bracketDepth = 0;

  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    const previous = i > 0 ? value[i - 1] : "";

    buffer += char;

    if (char === "{" && previous !== "\\") bracesDepth += 1;
    if (char === "}" && previous !== "\\") bracesDepth = Math.max(0, bracesDepth - 1);
    if (char === "(" && previous !== "\\") parenDepth += 1;
    if (char === ")" && previous !== "\\") parenDepth = Math.max(0, parenDepth - 1);
    if (char === "[" && previous !== "\\") bracketDepth += 1;
    if (char === "]" && previous !== "\\")
      bracketDepth = Math.max(0, bracketDepth - 1);

    const topLevel = bracesDepth === 0 && parenDepth === 0 && bracketDepth === 0;
    const breakableOperator = char === "+" || char === "-" || char === "=";
    if (topLevel && breakableOperator) {
      chunks.push(buffer.trimEnd());
      buffer = "";
    }
  }

  if (buffer.trim().length > 0) {
    chunks.push(buffer.trim());
  }

  return chunks.filter((chunk) => chunk.length > 0);
};

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
    () => [textStyle, styles.leftAlignedText, styles.inlineText],
    [textStyle],
  );
  const shouldUseHorizontalScroll = useMemo(
    () =>
      isMathOnly &&
      segments.some(
        (segment) => segment.type === "math" && segment.value.trim().length > 30,
      ),
    [isMathOnly, segments],
  );
  const splitMathMap = useMemo(() => {
    const map = new Map<number, string[]>();
    segments.forEach((segment, index) => {
      if (segment.type !== "math" || segment.display) return;
      if (!shouldUseHorizontalScroll) return;
      const split = splitMathForWrap(segment.value);
      if (split.length > 1) {
        map.set(index, split);
      }
    });
    return map;
  }, [segments, shouldUseHorizontalScroll]);
  const canWrapLongMath = splitMathMap.size > 0;

  if (!hasMath) {
    return (
      <Text style={[textStyle, styles.wrapText]} onLayout={onLayout}>
        {text}
      </Text>
    );
  }

  const content = (
    <View
      style={[
        styles.row,
        hasMath && styles.rowWithMath,
        isMathOnly && styles.rowMathOnly,
        shouldUseHorizontalScroll && !canWrapLongMath && styles.rowNoWrap,
      ]}
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
        const mathValue = segment.value.replace(/\\\\(?=[A-Za-z])/g, "\\");
        const splitMath = splitMathMap.get(index);

        if (splitMath) {
          return (
            <View key={`mw-${index}`} style={styles.splitMathGroup}>
              {splitMath.map((part, partIndex) => (
                <MathJaxSvg
                  key={`m-${index}-${partIndex}`}
                  fontSize={fontSize}
                  color={color}
                  style={styles.inlineMath}
                >
                  {`\\(${part.replace(/\\\\(?=[A-Za-z])/g, "\\")}\\)`}
                </MathJaxSvg>
              ))}
            </View>
          );
        }

        return (
          <MathJaxSvg
            key={`m-${index}`}
            fontSize={fontSize}
            color={color}
            style={styles.inlineMath}
          >
            {`${wrapper}${mathValue}${closer}`}
          </MathJaxSvg>
        );
      })}
    </View>
  );

  if (shouldUseHorizontalScroll && !canWrapLongMath) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {content}
      </ScrollView>
    );
  }

  return content;
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
  rowNoWrap: {
    flexWrap: "nowrap",
  },
  leftAlignedText: {
    textAlign: "left",
  },
  inlineText: {
    // Avoid full-width text segments breaking each word onto its own line.
    width: undefined,
    alignSelf: "auto",
    flexShrink: 1,
  },
  wrapText: {
    alignSelf: "stretch",
    flexShrink: 1,
    maxWidth: "100%",
  },
  inlineMath: {
    alignSelf: "center",
  },
  splitMathGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  scrollContent: {
    minWidth: "100%",
    justifyContent: "center",
  },
});
