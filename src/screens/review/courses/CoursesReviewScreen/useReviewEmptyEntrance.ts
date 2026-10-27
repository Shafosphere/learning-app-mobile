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

const DURATION = 1500;
// Hold → anticipation → release → overshoot → diminishing recoil → rest.
// One playhead keeps the box's reaction in sync with the clock on the UI thread.
const BEATS = [0, 180, 360, 440, 650, 790, 960, 1130, 1290, DURATION];

export function useReviewEmptyEntrance(ready: boolean) {
  const reduceMotion = useReducedMotion();
  const elapsed = useSharedValue(reduceMotion ? DURATION : 0);

  useFocusEffect(useCallback(() => {
    cancelAnimation(elapsed);
    elapsed.value = reduceMotion ? DURATION : 0;

    if (ready && !reduceMotion) {
      elapsed.value = withSequence(ReduceMotion.System,
        ...BEATS.slice(1).map((beat, index) => withTiming(beat, {
          duration: beat - BEATS[index],
          easing: index === 0 ? Easing.linear
            : index === 2 ? Easing.in(Easing.cubic)
            : index === 3 ? Easing.out(Easing.cubic)
            : Easing.inOut(Easing.quad),
          reduceMotion: ReduceMotion.System,
        })),
      );
    }

    return () => cancelAnimation(elapsed);
  }, [elapsed, ready, reduceMotion]));

  const boxAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(elapsed.value, BEATS, [0, 0, 0, 0, 0, 0.6, -0.35, 0.15, 0, 0], Extrapolation.CLAMP)}deg` },
      { scaleX: interpolate(elapsed.value, BEATS, [1, 1, 1.1, 0.94, 1.015, 1.045, 0.985, 1.008, 1, 1], Extrapolation.CLAMP) },
      { scaleY: interpolate(elapsed.value, BEATS, [1, 1, 0.9, 1.055, 1, 0.96, 1.008, 0.995, 1, 1], Extrapolation.CLAMP) },
    ],
  }));

  const clockAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(elapsed.value, BEATS, [90, 90, 94, 84, -3, 10, -2, 1, 0, 0], Extrapolation.CLAMP) },
      // Rise straight out of the center, then sway right → left → rest.
      { rotate: `${interpolate(elapsed.value, BEATS, [0, 0, 0, 0, 0, 4, -2.5, 1, 0, 0], Extrapolation.CLAMP)}deg` },
      { scaleX: interpolate(elapsed.value, BEATS, [0.28, 0.28, 0.36, 0.66, 0.94, 1.08, 0.98, 1.025, 1, 1], Extrapolation.CLAMP) },
      { scaleY: interpolate(elapsed.value, BEATS, [0.28, 0.28, 0.2, 0.62, 1.01, 0.93, 1.01, 0.995, 1, 1], Extrapolation.CLAMP) },
    ],
  }));

  return { boxAnimatedStyle, clockAnimatedStyle };
}
