import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const DURATION = 1360;
// Easel slides in → artist hops beside it → curls and beard settle.
const BEATS = [0, 140, 320, 480, 620, 790, 980, 1180, DURATION];

export function useCourseMaterialsEntrance(ready: boolean) {
  const reduceMotion = useReducedMotion();
  const elapsed = useSharedValue(reduceMotion ? DURATION : 0);

  useFocusEffect(useCallback(() => {
    cancelAnimation(elapsed);
    elapsed.value = reduceMotion ? DURATION : 0;
    if (ready && !reduceMotion) {
      elapsed.value = withSequence(ReduceMotion.System,
        ...BEATS.slice(1).map((beat, index) => withTiming(beat, {
          duration: beat - BEATS[index],
          easing: Easing.inOut(Easing.quad),
          reduceMotion: ReduceMotion.System,
        })),
      );
    }
    return () => cancelAnimation(elapsed);
  }, [elapsed, ready, reduceMotion]));

  const easelAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(elapsed.value, [0, 140, 320], [0, 0.6, 1], Extrapolation.CLAMP),
    transform: [
      { translateX: interpolate(elapsed.value, BEATS, [66, 48, -5, 2, 0, 0, 0, 0, 0], Extrapolation.CLAMP) },
      { rotate: `${interpolate(elapsed.value, BEATS, [12, 9, -4, 2, -1, 0, 0, 0, 0], Extrapolation.CLAMP)}deg` },
    ],
  }));
  const artistAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(elapsed.value, [140, 260, 320], [0, 0.7, 1], Extrapolation.CLAMP),
    transform: [
      { translateX: interpolate(elapsed.value, BEATS, [-48, -48, -28, 2, 0, 0, 0, 0, 0], Extrapolation.CLAMP) },
      { translateY: interpolate(elapsed.value, BEATS, [12, 12, -24, 5, -5, 0, 0, 0, 0], Extrapolation.CLAMP) },
      { rotate: `${interpolate(elapsed.value, BEATS, [-8, -8, 5, -3, 1, 0, 0, 0, 0], Extrapolation.CLAMP)}deg` },
      { scaleX: interpolate(elapsed.value, BEATS, [1, 1.06, 0.96, 1.07, 0.99, 1, 1, 1, 1], Extrapolation.CLAMP) },
      { scaleY: interpolate(elapsed.value, BEATS, [1, 0.94, 1.05, 0.93, 1.02, 1, 1, 1, 1], Extrapolation.CLAMP) },
    ],
  }));
  const hairAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(elapsed.value, BEATS, [0, 0, -5, -9, 3, -2, 0, 0, 0], Extrapolation.CLAMP) },
      { rotate: `${interpolate(elapsed.value, BEATS, [0, 0, -3, 4, -2, 1, 0, 0, 0], Extrapolation.CLAMP)}deg` },
    ],
  }));
  const beardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(elapsed.value, BEATS, [0, 0, 3, -4, 3, -1, 0, 0, 0], Extrapolation.CLAMP) },
      { rotate: `${interpolate(elapsed.value, BEATS, [0, 0, 3, -5, 3, -1, 0, 0, 0], Extrapolation.CLAMP)}deg` },
    ],
  }));
  return { easelAnimatedStyle, artistAnimatedStyle, hairAnimatedStyle, beardAnimatedStyle };
}
