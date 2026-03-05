import { memo, useCallback, useMemo, useRef, useState } from "react";
import {
  PanResponder,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

export type TrackSliderRainbowStop = {
  offset: string;
  color: string;
};

export type TrackSliderProps = {
  value: number;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  disabled?: boolean;
  onValueChange: (value: number) => void;
  onSlidingComplete?: (value: number) => void;
  trackHeight?: number;
  thumbSize?: number;
  thumbBorderWidth?: number;
  trackBorderRadius?: number;
  mode?: "solid" | "rainbow";
  trackColor?: string;
  fillColor?: string;
  thumbColor?: string;
  thumbBorderColor?: string;
  rainbowStops?: TrackSliderRainbowStop[];
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const DEFAULT_RAINBOW_STOPS: TrackSliderRainbowStop[] = [
  { offset: "0%", color: "#FF0000" },
  { offset: "17%", color: "#FFFF00" },
  { offset: "33%", color: "#00FF00" },
  { offset: "50%", color: "#00FFFF" },
  { offset: "67%", color: "#0000FF" },
  { offset: "83%", color: "#FF00FF" },
  { offset: "100%", color: "#FF0000" },
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

function TrackSliderComponent({
  value,
  minimumValue = 0,
  maximumValue = 1,
  step = 0.01,
  disabled = false,
  onValueChange,
  onSlidingComplete,
  trackHeight = 12,
  thumbSize = 28,
  thumbBorderWidth = 2,
  trackBorderRadius = 999,
  mode = "solid",
  trackColor = "#D9DDE3",
  fillColor = "#22C55E",
  thumbColor = "#FFFFFF",
  thumbBorderColor = "#22C55E",
  rainbowStops = DEFAULT_RAINBOW_STOPS,
  style,
  testID,
}: TrackSliderProps) {
  const trackRef = useRef<View | null>(null);
  const [trackLayout, setTrackLayout] = useState<{
    pageX: number;
    width: number;
  } | null>(null);
  const gradientId = useMemo(
    () => `track-slider-rainbow-${Math.random().toString(36).slice(2, 10)}`,
    []
  );

  const clampToStep = useCallback(
    (input: number) => {
      const clamped = clamp(input, minimumValue, maximumValue);
      if (!step) return clamped;
      const stepped = Math.round(clamped / step) * step;
      return clamp(stepped, minimumValue, maximumValue);
    },
    [maximumValue, minimumValue, step]
  );

  const updateFromPageX = useCallback(
    (pageX: number, finalize = false) => {
      if (!trackLayout) return;
      const relative = pageX - trackLayout.pageX;
      const boundedPx = clamp(relative, 0, Math.max(trackLayout.width, 1));
      const ratio = trackLayout.width === 0 ? 0 : boundedPx / trackLayout.width;
      const raw = minimumValue + ratio * (maximumValue - minimumValue);
      const nextValue = clampToStep(raw);
      onValueChange(nextValue);
      if (finalize) {
        onSlidingComplete?.(nextValue);
      }
    },
    [
      clampToStep,
      maximumValue,
      minimumValue,
      onSlidingComplete,
      onValueChange,
      trackLayout,
    ]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderGrant: (evt) => {
          if (disabled) return;
          updateFromPageX(evt.nativeEvent.pageX);
        },
        onPanResponderMove: (evt) => {
          if (disabled) return;
          updateFromPageX(evt.nativeEvent.pageX);
        },
        onPanResponderRelease: (evt) => {
          if (disabled) return;
          updateFromPageX(evt.nativeEvent.pageX, true);
        },
        onPanResponderTerminate: (evt) => {
          if (disabled) return;
          updateFromPageX(evt.nativeEvent.pageX, true);
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [disabled, updateFromPageX]
  );

  const handleLayout = useCallback(() => {
    trackRef.current?.measure((_, __, width, ___, pageX) => {
      if (width) {
        setTrackLayout({ pageX, width });
      }
    });
  }, []);

  const clampedValue = clamp(value, minimumValue, maximumValue);
  const percent =
    maximumValue === minimumValue
      ? 0
      : (clampedValue - minimumValue) / (maximumValue - minimumValue);
  const thumbOffset = (trackLayout?.width ?? 0) * percent - thumbSize / 2;
  const wrapperHeight = Math.max(44, thumbSize + 16);
  const trackRadius = trackBorderRadius || trackHeight / 2;

  return (
    <View
      ref={trackRef}
      testID={testID}
      onLayout={handleLayout}
      style={[styles.wrapper, { height: wrapperHeight }, disabled && styles.disabled, style]}
      {...panResponder.panHandlers}
      accessibilityRole="adjustable"
      accessibilityValue={{
        min: Math.round(minimumValue),
        max: Math.round(maximumValue),
        now: Math.round(clampedValue),
      }}
    >
      <View
        pointerEvents="none"
        style={[
          styles.trackBase,
          {
            height: trackHeight,
            borderRadius: trackRadius,
            top: (wrapperHeight - trackHeight) / 2,
            backgroundColor: trackColor,
          },
        ]}
      />

      {mode === "rainbow" ? (
        <View
          pointerEvents="none"
          style={[
            styles.trackBase,
            {
              height: trackHeight,
              borderRadius: trackRadius,
              top: (wrapperHeight - trackHeight) / 2,
              overflow: "hidden",
            },
          ]}
        >
          <Svg width="100%" height="100%" style={styles.absolute}>
            <Defs>
              <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                {rainbowStops.map((stop) => (
                  <Stop key={`${gradientId}-${stop.offset}`} offset={stop.offset} stopColor={stop.color} />
                ))}
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gradientId})`} />
          </Svg>
        </View>
      ) : (
        <View
          pointerEvents="none"
          style={[
            styles.fill,
            {
              height: trackHeight,
              borderRadius: trackRadius,
              top: (wrapperHeight - trackHeight) / 2,
              width: `${percent * 100}%`,
              backgroundColor: fillColor,
            },
          ]}
        />
      )}

      <View
        pointerEvents="none"
        style={[
          styles.thumb,
          {
            width: thumbSize,
            height: thumbSize,
            borderRadius: thumbSize / 2,
            borderWidth: thumbBorderWidth,
            borderColor: thumbBorderColor,
            backgroundColor: thumbColor,
            top: (wrapperHeight - thumbSize) / 2,
            transform: [{ translateX: thumbOffset }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    justifyContent: "center",
    overflow: "visible",
    width: "100%",
  },
  disabled: {
    opacity: 0.35,
  },
  trackBase: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  fill: {
    position: "absolute",
    left: 0,
  },
  thumb: {
    position: "absolute",
    left: 0,
    elevation: 3,
    shadowColor: "#00000033",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  absolute: {
    position: "absolute",
    left: 0,
    top: 0,
  },
});

export const TrackSlider = memo(TrackSliderComponent);
export default TrackSlider;
