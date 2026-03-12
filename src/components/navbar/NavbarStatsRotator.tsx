import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import {
  type NavbarStatKey,
  useNavbarStats,
} from "@/src/contexts/NavbarStatsContext";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutUp,
  ZoomIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useStyles } from "./navbar-styles";

type NavbarStatsRotatorProps = {
  onPress: () => void;
};

const SPARKLE_DOTS = [
  { x: 2, y: 10, color: "#FFD166" },
  { x: 15, y: 2, color: "#00EBC7" },
  { x: 26, y: 12, color: "#FF5470" },
  { x: 38, y: 4, color: "#FFD166" },
  { x: 30, y: 18, color: "#00EBC7" },
  { x: 12, y: 20, color: "#FF5470" },
] as const;

const getCountFor = (
  statKey: NavbarStatKey,
  stats: {
    masteredCount: number;
    streakDays: number;
    promotionsCount: number;
  },
) => {
  if (statKey === "mastered") return stats.masteredCount;
  if (statKey === "streak") return stats.streakDays;
  return stats.promotionsCount;
};

const getStatLabel = (statKey: NavbarStatKey) => {
  if (statKey === "mastered") return "Opanowane fiszki";
  if (statKey === "streak") return "Daily streak";
  return "Skoki";
};

const getStatAccent = (
  statKey: NavbarStatKey,
  colors: ReturnType<typeof useSettings>["colors"],
) => {
  if (statKey === "mastered") return colors.my_yellow;
  if (statKey === "streak") return colors.my_red;
  return colors.my_green;
};

const renderStatIcon = (
  statKey: NavbarStatKey,
  color: string,
  size: number,
) => {
  if (statKey === "mastered") {
    return <Ionicons name="trophy-outline" size={size} color={color} />;
  }
  if (statKey === "streak") {
    return <MaterialIcons name="local-fire-department" size={size} color={color} />;
  }
  return <Ionicons name="trending-up-outline" size={size} color={color} />;
};

export default function NavbarStatsRotator({
  onPress,
}: NavbarStatsRotatorProps) {
  const styles = useStyles();
  const { colors } = useSettings();
  const {
    stats,
    activeStatKey,
    currentBurst,
    acknowledgeCurrentBurst,
  } = useNavbarStats();
  const reduceMotion = useReducedMotion();
  const [sparkleVisible, setSparkleVisible] = useState(false);
  const currentValue = getCountFor(activeStatKey, stats);
  const popScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0.94);
  const previousCountsRef = useRef<Record<NavbarStatKey, number>>({
    mastered: stats.masteredCount,
    streak: stats.streakDays,
    promotions: stats.promotionsCount,
  });

  const glowColor = useMemo(
    () =>
      currentBurst
        ? getStatAccent(currentBurst.pinKey, colors)
        : getStatAccent(activeStatKey, colors),
    [activeStatKey, colors, currentBurst],
  );

  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: popScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  useEffect(() => {
    const lastCounts = previousCountsRef.current;
    const previousValue = lastCounts[activeStatKey] ?? 0;
    const nextValue = getCountFor(activeStatKey, stats);

    if (nextValue > previousValue) {
      popScale.value = 1;
      popScale.value = withSequence(
        withTiming(1.1, {
          duration: reduceMotion ? 120 : 150,
          easing: Easing.out(Easing.quad),
        }),
        withTiming(1, {
          duration: reduceMotion ? 120 : 220,
          easing: Easing.out(Easing.cubic),
        }),
      );
    }

    previousCountsRef.current = {
      mastered: stats.masteredCount,
      streak: stats.streakDays,
      promotions: stats.promotionsCount,
    };
  }, [
    activeStatKey,
    popScale,
    reduceMotion,
    stats.masteredCount,
    stats.promotionsCount,
    stats.streakDays,
    stats,
  ]);

  useEffect(() => {
    if (!currentBurst) {
      return;
    }

    const targetOpacity =
      currentBurst.comboCount >= 3
        ? 0.22
        : currentBurst.comboCount === 2
          ? 0.16
          : 0.1;

    glowOpacity.value = 0;
    glowScale.value = 0.94;
    glowOpacity.value = withSequence(
      withTiming(targetOpacity, {
        duration: reduceMotion ? 120 : 180,
        easing: Easing.out(Easing.quad),
      }),
      withTiming(0, {
        duration: reduceMotion ? 160 : 360,
        easing: Easing.inOut(Easing.quad),
      }),
    );
    glowScale.value = withSequence(
      withTiming(1, {
        duration: reduceMotion ? 120 : 220,
        easing: Easing.out(Easing.cubic),
      }),
      withTiming(1.02, {
        duration: reduceMotion ? 120 : 260,
        easing: Easing.out(Easing.quad),
      }),
    );

    if (currentBurst.comboCount >= 3 && !reduceMotion) {
      setSparkleVisible(true);
      const sparkleTimer = setTimeout(() => {
        setSparkleVisible(false);
      }, 420);

      return () => {
        clearTimeout(sparkleTimer);
      };
    }

    setSparkleVisible(false);
    return;
  }, [currentBurst, glowOpacity, glowScale, reduceMotion]);

  useEffect(() => {
    if (!currentBurst) {
      return;
    }

    if (currentBurst.comboCount >= 2) {
      void (async () => {
        try {
          if (currentBurst.comboCount >= 3) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            return;
          }
          await Haptics.selectionAsync();
        } catch {
          // Haptics support is optional.
        }
      })();
    }

    const durationMs =
      reduceMotion || currentBurst.comboCount < 2 ? 1000 : 1220;
    const timer = setTimeout(() => {
      acknowledgeCurrentBurst();
    }, durationMs);

    return () => {
      clearTimeout(timer);
    };
  }, [acknowledgeCurrentBurst, currentBurst, reduceMotion]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.iconButton,
        styles.counterButton,
        pressed && styles.iconButtonPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${getStatLabel(activeStatKey)}: ${currentValue}. Przejdź do statystyk`}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.counterGlow,
          {
            backgroundColor: glowColor,
          },
          glowStyle,
        ]}
      />

      <View style={styles.counterContentWrap}>
        <View style={styles.counterAnimatedSlot}>
          <Animated.View
            key={activeStatKey}
            entering={
              reduceMotion
                ? FadeIn.duration(140)
                : FadeInDown.duration(220).easing(Easing.out(Easing.cubic))
            }
            exiting={
              reduceMotion
                ? FadeOut.duration(100)
                : FadeOutUp.duration(180).easing(Easing.inOut(Easing.cubic))
            }
            style={styles.counterAnimatedInner}
          >
            <Animated.View style={[styles.counterNumberWrap, popStyle]}>
              <Text style={styles.counterValueText} allowFontScaling>
                {currentValue}
              </Text>
            </Animated.View>
            <View style={styles.counterIconWrap}>
              {renderStatIcon(activeStatKey, getStatAccent(activeStatKey, colors), 14)}
            </View>
          </Animated.View>
        </View>
      </View>

      <View pointerEvents="none" style={styles.counterBurstViewport}>
        <View style={styles.counterBurstLayer}>
          {currentBurst
            ? currentBurst.keys.map((statKey, index) => {
                const accent = getStatAccent(statKey, colors);

                return (
                  <Animated.View
                    key={`${currentBurst.id}-${statKey}`}
                    entering={
                      reduceMotion
                        ? FadeIn.duration(120).delay(index * 70)
                        : FadeInDown.duration(220)
                            .delay(index * 80)
                            .easing(Easing.out(Easing.cubic))
                    }
                    exiting={
                      reduceMotion
                        ? FadeOut.duration(120)
                        : FadeOutUp.duration(180).easing(Easing.inOut(Easing.quad))
                    }
                    style={[
                      styles.counterBurstPill,
                      {
                        borderColor: accent,
                      },
                    ]}
                  >
                    <Text style={styles.counterBurstText}>+1</Text>
                    <View style={styles.counterIconWrap}>
                      {renderStatIcon(statKey, accent, 12)}
                    </View>
                  </Animated.View>
                );
              })
            : null}
        </View>
      </View>

      {sparkleVisible && currentBurst?.sparkle && !reduceMotion ? (
        <View pointerEvents="none" style={styles.counterSparkleLayer}>
          {SPARKLE_DOTS.map((dot, index) => (
            <Animated.View
              key={`${currentBurst.id}-sparkle-${index}`}
              entering={ZoomIn.duration(180).delay(index * 36)}
              exiting={FadeOut.duration(140).delay(index * 20)}
              style={[
                styles.counterSparkleDot,
                {
                  left: dot.x,
                  top: dot.y,
                  backgroundColor: dot.color,
                },
              ]}
            />
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}
