import { useMemo, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import TextTicker from "react-native-text-ticker";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";

const MARQUEE_DELAY_MS = 800;
const MARQUEE_SPEED_PER_PIXEL_MS = 20;
const MIN_DURATION_MS = 4000;
const REPEAT_SPACER_PX = 14;
const WIDTH_TOLERANCE_PX = 1;

const styles = StyleSheet.create({
  measurementText: {
    position: "absolute",
    opacity: 0,
    width: 10_000,
  },
});

type CourseTitleMarqueeProps = {
  text: string;
  containerStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function CourseTitleMarquee({
  text,
  containerStyle,
  textStyle,
}: CourseTitleMarqueeProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [textMeasurement, setTextMeasurement] = useState<{
    text: string;
    width: number;
  } | null>(null);
  const shouldAnimate =
    Platform.OS === "web" ||
    (containerWidth > 0 &&
      textMeasurement?.text === text &&
      textMeasurement.width > containerWidth + WIDTH_TOLERANCE_PX);
  const flattenedTextStyle = useMemo(
    () => StyleSheet.flatten(textStyle) || {},
    [textStyle]
  );
  const fontSize =
    typeof flattenedTextStyle.fontSize === "number"
      ? flattenedTextStyle.fontSize
      : 16;
  const avgCharWidthFactor = 0.65;
  const estimatedTextWidth = useMemo(
    () => Math.max(1, Math.ceil(text.length * fontSize * avgCharWidthFactor)),
    [text.length, fontSize]
  );
  const marqueeDuration = useMemo(
    () => Math.max(MIN_DURATION_MS, estimatedTextWidth * MARQUEE_SPEED_PER_PIXEL_MS),
    [estimatedTextWidth]
  );

  return (
    <View
      style={containerStyle}
      pointerEvents="none"
      onLayout={(event) => {
        const layout = event.nativeEvent.layout;
        setContainerWidth(layout.width);
      }}
    >
      {Platform.OS !== "web" ? (
        <Text
          style={[textStyle, styles.measurementText]}
          numberOfLines={1}
          accessible={false}
          onTextLayout={(event) => {
            const lines = event.nativeEvent.lines;
            const width = lines[0]?.width;
            if (width != null) setTextMeasurement({ text, width });
          }}
        >
          {text}
        </Text>
      ) : null}
      <TextTicker
        style={[textStyle, { flexShrink: 1, minWidth: 0 }]}
        animationType="auto"
        duration={marqueeDuration + REPEAT_SPACER_PX}
        repeatSpacer={REPEAT_SPACER_PX}
        marqueeDelay={MARQUEE_DELAY_MS}
        loop
        useNativeDriver
        disabled={!shouldAnimate}
      >
        {text}
      </TextTicker>
    </View>
  );
}
