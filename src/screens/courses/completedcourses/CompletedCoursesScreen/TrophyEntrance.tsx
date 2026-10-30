import { useState } from "react";
import { StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { useTrophyEntrance } from "./useTrophyEntrance";

export function TrophyEntrance({ ready, size = 160 }: { ready: boolean; size?: number }) {
  const [trophyLoaded, setTrophyLoaded] = useState(false);
  const [crackLoaded, setCrackLoaded] = useState(false);
  const { trophyAnimatedStyle, crackAnimatedStyle, impactAnimatedStyle } = useTrophyEntrance(
    ready && trophyLoaded && crackLoaded,
  );

  return (
    <Animated.View style={[styles.illustration, { width: size * 1.5, height: size * (190 / 160) }, impactAnimatedStyle]} pointerEvents="none" accessible={false}>
      <Animated.Image
        source={require("@/assets/ui/achievements/wyrwa2.png")}
        style={[styles.crack, { top: size * (15 / 160), width: size * 1.5, height: size * 1.5 }, crackAnimatedStyle]}
        accessible={false}
        onLoad={() => setCrackLoaded(true)}
        testID="completed-courses-crack"
      />
      <Animated.Image
        source={require("@/assets/ui/achievements/trophy.png")}
        style={[styles.trophy, { width: size, height: size }, trophyAnimatedStyle]}
        accessible={false}
        onLoad={() => setTrophyLoaded(true)}
        testID="completed-courses-trophy"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  illustration: {
    width: 240,
    height: 190,
    alignItems: "center",
    overflow: "visible",
  },
  crack: {
    position: "absolute",
    top: 15,
    width: 240,
    height: 240,
    resizeMode: "contain",
  },
  trophy: {
    width: 160,
    height: 160,
    resizeMode: "contain",
    // Rock around the visible base rather than the transparent image edge.
    transformOrigin: "50% 93%",
  },
});
