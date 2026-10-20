import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  StyleSheet, View, type LayoutChangeEvent, type LayoutRectangle,
} from "react-native";
import Animated, {
  Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming,
} from "react-native-reanimated";
import { useThemeSettings } from "@/src/contexts/SettingsContext";

export function useTabIndicatorLayout(keys: readonly string[]) {
  const signature = JSON.stringify(keys);
  const [measurements, setMeasurements] = useState<Record<string, LayoutRectangle>>({});
  const [size, setSize] = useState({ width: 0, height: 0 });
  const frames: Record<string, LayoutRectangle> = {};
  for (const key of keys) {
    const frame = measurements[key];
    if (frame?.width > 0 && frame.height > 0) frames[key] = frame;
  }
  const onTabLayout = useCallback((key: string, event: LayoutChangeEvent) => {
    const frame = event.nativeEvent.layout;
    setMeasurements((previous) => {
      const old = previous[key];
      if (old && old.x === frame.x && old.y === frame.y &&
          old.width === frame.width && old.height === frame.height) return previous;
      return { ...previous, [key]: frame };
    });
  }, []);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((previous) => previous.width === width && previous.height === height ? previous : { width, height });
  }, []);
  // Geometry changes snap into place; only selection changes travel between tabs.
  const layoutKey = JSON.stringify([signature, size, keys.map((key) => frames[key])]);
  return { frames, layoutKey, onLayout, onTabLayout };
}

type Props = {
  frame: LayoutRectangle;
  layoutKey: string;
  selectionKey: string;
  testID: string;
  backgroundTestID?: string;
  lineTestID?: string;
  reduceMotion?: boolean;
};

export function TabSelectionIndicator({
  frame, layoutKey, selectionKey, testID, backgroundTestID, lineTestID, reduceMotion = false,
}: Props) {
  const { colors, theme } = useThemeSettings();
  const x = useSharedValue(frame.x);
  const y = useSharedValue(frame.y);
  const width = useSharedValue(frame.width);
  const height = useSharedValue(frame.height);
  const previous = useRef<{ layoutKey: string; selectionKey: string } | null>(null);

  useLayoutEffect(() => {
    const snap = reduceMotion || previous.current === null ||
      previous.current.layoutKey !== layoutKey || previous.current.selectionKey === selectionKey;
    const config = {
      duration: 220,
      easing: Easing.inOut(Easing.ease),
      reduceMotion: ReduceMotion.System,
    };
    x.value = snap ? frame.x : withTiming(frame.x, config);
    y.value = snap ? frame.y : withTiming(frame.y, config);
    width.value = snap ? frame.width : withTiming(frame.width, config);
    height.value = snap ? frame.height : withTiming(frame.height, config);
    previous.current = { layoutKey, selectionKey };
  }, [frame.x, frame.y, frame.width, frame.height, layoutKey, selectionKey, reduceMotion, x, y, width, height]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: width.value,
    height: height.value,
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));

  return (
    <Animated.View
      testID={testID}
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.frame, animatedStyle]}
    >
      <View testID={backgroundTestID} style={[styles.background, {
        backgroundColor: colors.my_green, opacity: theme === "dark" ? 0.14 : 0.08,
      }]} />
      <View testID={lineTestID} style={[styles.line, { backgroundColor: colors.my_green }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: { position: "absolute", top: 0, left: 0, alignItems: "center" },
  background: { ...StyleSheet.absoluteFillObject, borderRadius: 16 },
  line: { position: "absolute", bottom: -6, width: 20, height: 3, borderRadius: 2 },
});
