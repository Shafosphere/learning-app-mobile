import { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";
import { useStyles } from "./popup-styles";
import { useSettings } from "@/src/contexts/SettingsContext";

export type PopupColor = "my_green" | "my_red" | "my_yellow";

interface PopupProps {
  message: string;
  color: PopupColor;
  duration: number;
  onHide: () => void;
}

const EXIT_ANIMATION_MS = 220;

export default function Popup({
  message,
  color,
  duration,
  onHide,
}: PopupProps) {
  const styles = useStyles();
  const { colors } = useSettings();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-18)).current;
  const scale = useRef(new Animated.Value(0.94)).current;

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

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      <View style={[styles.tail, { backgroundColor: colors[color] }]} />
      <View style={[styles.bubble, { backgroundColor: colors[color] }]}>
        <Text style={styles.text}>{message}</Text>
      </View>
    </Animated.View>
  );
}
