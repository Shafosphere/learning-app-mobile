import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { useWindowDimensions } from "react-native";
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

const DURATION = 7400;
// Pause → accelerating fall → hard contact → damped rocking → crater fade.
const IMPACT = 580;
const BEATS = [0, 140, IMPACT, 615, 680, 840, 1060, 1320, 1950, DURATION];

export function useTrophyEntrance(ready: boolean) {
  const { height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const elapsed = useSharedValue(reduceMotion ? DURATION : 0);

  useFocusEffect(useCallback(() => {
    cancelAnimation(elapsed);
    elapsed.value = reduceMotion ? DURATION : 0;

    if (ready && !reduceMotion) {
      // Both images share one UI-thread playhead: the crack starts at contact,
      // even when the JS thread is busy loading the course list.
      elapsed.value = withSequence(ReduceMotion.System,
        ...BEATS.slice(1).map((beat, index) => withTiming(beat, {
          duration: beat - BEATS[index],
          easing: beat === DURATION
            ? Easing.linear
            : beat === IMPACT
            ? Easing.in(Easing.cubic)
            : beat <= 680 ? Easing.linear : Easing.inOut(Easing.quad),
          reduceMotion: ReduceMotion.System,
        })),
      );
    }

    return () => cancelAnimation(elapsed);
  }, [elapsed, ready, reduceMotion]));

  const trophyAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(elapsed.value, [0, 140, 160], [0, 0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(elapsed.value, [0, 140, IMPACT, DURATION], [-height - 160, -height - 160, 0, 0], Extrapolation.CLAMP) },
      { rotate: `${interpolate(elapsed.value, BEATS, [-2, -2, 0, 0, 0.9, -0.55, 0.2, 0, 0, 0], Extrapolation.CLAMP)}deg` },
    ],
  }));

  const crackAnimatedStyle = useAnimatedStyle(() => ({
    opacity: elapsed.value < IMPACT
      ? 0
      : interpolate(elapsed.value, [1950, DURATION], [1, 0], Extrapolation.CLAMP),
  }));

  // A brief ground vibration sells the weight while the rigid trophy stays put.
  const impactAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(elapsed.value, [0, IMPACT, 600, 630, 665, 710, 770, 840, DURATION], [0, 0, -3, 2, -1.5, 0.75, -0.3, 0, 0], Extrapolation.CLAMP) },
      { translateY: interpolate(elapsed.value, [0, IMPACT, 600, 630, 665, 710, 770, 840, DURATION], [0, 0, 2, -1, 0.7, -0.3, 0.1, 0, 0], Extrapolation.CLAMP) },
    ],
  }));

  return { trophyAnimatedStyle, crackAnimatedStyle, impactAnimatedStyle };
}
