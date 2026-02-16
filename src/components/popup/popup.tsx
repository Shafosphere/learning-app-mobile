import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  Platform,
  StatusBar,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useStyles } from "./popup-styles";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type PopupColor = "calm" | "angry" | "disoriented";

interface PopupProps {
  message: string;
  color: PopupColor;
  duration: number;
  onHide: () => void;
  anchorX?: number | null;
}

const EXIT_ANIMATION_MS = 220;
const NAVBAR_HEIGHT = 45;
const POPUP_GAP = 12;
const SCREEN_PADDING = 12;
const TAIL_SIZE = 18;
const TAIL_INSET_MIN = 14;
// Shift bubble ~20% more to the right vs previous setup (0.3 -> 0.1)
const BUBBLE_ANCHOR_RATIO = 0.1;
const FALLBACK_BUBBLE_WIDTH = 220;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export default function Popup({
  message,
  color,
  duration,
  onHide,
  anchorX,
}: PopupProps) {
  const styles = useStyles();
  const variantStyle = styles[color];
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-18)).current;
  const scale = useRef(new Animated.Value(0.94)).current;
  const [bubbleWidth, setBubbleWidth] = useState<number>(FALLBACK_BUBBLE_WIDTH);
  const resolvedAnchorX = anchorX ?? screenWidth / 2;
  const maxBubbleWidth = Math.min(320, Math.max(120, screenWidth - SCREEN_PADDING * 2));
  const resolvedBubbleWidth = Math.min(bubbleWidth, maxBubbleWidth);
  const minBubbleLeft = SCREEN_PADDING;
  const maxBubbleLeft = Math.max(
    SCREEN_PADDING,
    screenWidth - SCREEN_PADDING - resolvedBubbleWidth
  );
  const bubbleLeft = clamp(
    resolvedAnchorX - resolvedBubbleWidth * BUBBLE_ANCHOR_RATIO,
    minBubbleLeft,
    maxBubbleLeft
  );
  const tailMinLeft = bubbleLeft + TAIL_INSET_MIN;
  const tailMaxLeft = Math.max(
    tailMinLeft,
    bubbleLeft + resolvedBubbleWidth - TAIL_INSET_MIN - TAIL_SIZE
  );
  const tailLeft = clamp(resolvedAnchorX - TAIL_SIZE / 2, tailMinLeft, tailMaxLeft);
  const tailLeftLocal = tailLeft - bubbleLeft;
  const topOffset = useMemo(() => {
    const statusBarHeight =
      Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0;
    const topPadding = Math.max(statusBarHeight, insets.top);
    return topPadding + NAVBAR_HEIGHT + POPUP_GAP;
  }, [insets.top]);

  useEffect(() => {
    const entryAnimation = Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        damping: 16,
        stiffness: 180,
        mass: 0.6,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        damping: 16,
        stiffness: 180,
        mass: 0.6,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    entryAnimation.start();

    const exitDelay = Math.max(duration - EXIT_ANIMATION_MS, 0);
    const exitTimeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: EXIT_ANIMATION_MS,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -12,
          duration: EXIT_ANIMATION_MS,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.96,
          duration: EXIT_ANIMATION_MS,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => {
        onHide();
      });
    }, exitDelay);

    return () => {
      entryAnimation.stop();
      clearTimeout(exitTimeout);
    };
  }, [duration, onHide, opacity, scale, translateY]);

  const handleBubbleLayout = (event: LayoutChangeEvent) => {
    const measuredWidth = event.nativeEvent.layout.width;
    if (!Number.isFinite(measuredWidth) || measuredWidth <= 0) return;
    setBubbleWidth((current) =>
      Math.abs(current - measuredWidth) < 0.5 ? current : measuredWidth
    );
  };

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.container,
        {
          top: topOffset,
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      <View style={[styles.bubbleGroup, { left: bubbleLeft }]}>
        <View style={[styles.tail, variantStyle, { left: tailLeftLocal }]} />
        <View
          style={[styles.bubble, variantStyle, { maxWidth: maxBubbleWidth }]}
          onLayout={handleBubbleLayout}
        >
          <Text style={styles.text}>{message}</Text>
        </View>
      </View>
    </Animated.View>
  );
}
