import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import TextTicker from "react-native-text-ticker";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";

const MARQUEE_DELAY_MS = 800;
const MARQUEE_SPEED_PER_PIXEL_MS = 20;
const MIN_DURATION_MS = 4000;
const REPEAT_SPACER_PX = 14;

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
    <View style={containerStyle} pointerEvents="none">
      <TextTicker
        style={[textStyle, { flexShrink: 0 }]}
        animationType="auto"
        duration={marqueeDuration + REPEAT_SPACER_PX}
        repeatSpacer={REPEAT_SPACER_PX}
        marqueeDelay={MARQUEE_DELAY_MS}
        loop
        useNativeDriver
      >
        {text}
      </TextTicker>
    </View>
  );
}

