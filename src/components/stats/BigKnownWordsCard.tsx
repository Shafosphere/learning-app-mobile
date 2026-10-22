import { statsTileStyle } from "./statsTileStyle";
import BoxSkin from "@/src/components/Box/Skin/BoxSkin";
import { useNavbarStatsSnapshot } from "@/src/contexts/NavbarStatsContext";
import { Image as ExpoImage } from "expo-image";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, AppState, Easing, Image, ImageBackground, StyleSheet, Text, View, type LayoutRectangle } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

const STAR_SOURCE = require("@/assets/illustrations/streak/gwiazdka.svg");
const STAR_SLOT_SIZE = 32;
const STAR_COLUMNS = 5;
const STAR_ROWS = 2;
// All artwork and measurements share this coordinate system.
const CARD_WIDTH = 372;
const CARD_HEIGHT = 180;

type Star = {
  id: number;
  x: number;
  y: number;
  rotation: number;
  opacity: number;
  height: number;
  drift: number;
  duration: number;
  delay: number;
};

function overlapsNumber(star: Star, width: number, height: number, bounds: LayoutRectangle) {
  const angle = Math.abs(star.rotation) * Math.PI / 180;
  const starWidth = star.height * (110 / 120);
  const radiusX = (starWidth * Math.cos(angle) + star.height * Math.sin(angle)) / 2;
  const radiusY = (star.height * Math.cos(angle) + starWidth * Math.sin(angle)) / 2;
  const x = star.x * width;
  const y = star.y * height;
  // Include the full animation path and a small gap around the actual text.
  return x + radiusX > bounds.x - 2 &&
    x - radiusX < bounds.x + bounds.width + 2 &&
    y + radiusY + Math.max(0, star.drift) > bounds.y - 2 &&
    y - radiusY + Math.min(0, star.drift) < bounds.y + bounds.height + 2;
}

function generateStars(width: number, height: number, exclusion: LayoutRectangle): Star[] {
  const cells = Array.from({ length: STAR_COLUMNS * STAR_ROWS }, (_, id) => id);
  // Shuffle the placement order so no side always gets priority.
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }

  const stars: Star[] = [];
  for (const id of cells) {
    const appearance = {
      id,
      rotation: (Math.random() < 0.5 ? -1 : 1) * (15 + Math.random() * 20),
      opacity: 0.25 + Math.random() * 0.75,
      height: 16 + Math.random() * 8,
      drift: (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 2),
      duration: 2200 + Math.random() * 1400,
      delay: Math.random() * 1500,
    };
    let position: { x: number; y: number } | null = null;
    let bestDistance = -1;
    // Keep one star per cell, rejecting close neighbours when possible.
    // A bounded search always finishes, even on a very narrow card.
    for (let attempt = 0; attempt < 240; attempt++) {
      const candidate = {
        x: attempt < 40 ? ((id % STAR_COLUMNS) + Math.random()) / STAR_COLUMNS : Math.random(),
        y: attempt < 40 ? (Math.floor(id / STAR_COLUMNS) + Math.random()) / STAR_ROWS : Math.random(),
      };
      if (overlapsNumber({ ...appearance, ...candidate }, width, height, exclusion)) continue;
      const distance = Math.min(
        ...stars.map((star) =>
          Math.hypot((candidate.x - star.x) * width, (candidate.y - star.y) * height)
        )
      );
      if (distance > bestDistance) {
        position = candidate;
        bestDistance = distance;
      }
      if (distance >= 48) break;
    }
    if (position) stars.push({ ...appearance, ...position });
  }
  return stars;
}

const styles = StyleSheet.create({
  frame: {
    ...statsTileStyle,
    width: "100%",
    aspectRatio: CARD_WIDTH / CARD_HEIGHT,
    overflow: "hidden",
  },
  container: {
    ...statsTileStyle,
    position: "absolute",
    top: 0,
    left: 0,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    transformOrigin: "top left",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  decoration: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  stars: {
    ...StyleSheet.absoluteFillObject,
  },
  starSlot: {
    position: "absolute",
    width: STAR_SLOT_SIZE,
    height: STAR_SLOT_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  mascot: {
    position: "absolute",
    right: 12,
    marginRight: "-3%",
    bottom: 3,
    transform: [{ rotate: "8deg" }, { scaleX: -1 }],
  },
  trophy: {
    position: "absolute",
    right: 110,
    bottom: 30,
    width: 110,
    height: 130,
    marginRight: "-8%",
    transform: [{ rotate: "-10deg" }, { scale: 1.2 }],
  },
  bigNumber: {
    alignSelf: "flex-start",
    marginLeft: "5%",
    width: "50%",
    paddingHorizontal: 12,
    textAlign: "center",
    fontSize: 64,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});

function FloatingStar({ star, animate }: { star: Star; animate: boolean }) {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    translateY.setValue(0);
    if (!animate) return;

    const timing = (toValue: number) => Animated.timing(translateY, {
      toValue,
      duration: star.duration,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: true,
      isInteraction: false,
    });
    const animation = Animated.sequence([
      Animated.delay(star.delay),
      Animated.loop(Animated.sequence([timing(star.drift), timing(0)])),
    ]);
    animation.start();
    return () => animation.stop();
  }, [animate, star, translateY]);

  return (
    <View
      style={[
        styles.starSlot,
        {
          left: `${star.x * 100}%`,
          top: `${star.y * 100}%`,
          transform: [
            { translateX: -STAR_SLOT_SIZE / 2 },
            { translateY: -STAR_SLOT_SIZE / 2 },
          ],
        },
      ]}
    >
      <Animated.View style={{ transform: [{ translateY }] }}>
        <ExpoImage
          source={STAR_SOURCE}
          contentFit="contain"
          accessible={false}
          style={{
            width: star.height * (110 / 120),
            height: star.height,
            opacity: star.opacity,
            transform: [{ rotate: `${star.rotation}deg` }],
          }}
        />
      </Animated.View>
    </View>
  );
}

const BigKnownWordsCard: React.FC = () => {
  const stats = useNavbarStatsSnapshot();
  const [frameWidth, setFrameWidth] = useState(CARD_WIDTH);
  const scale = frameWidth / CARD_WIDTH;
  const [stars, setStars] = useState<Star[] | null>(null);
  const [cardLayout, setCardLayout] = useState<LayoutRectangle | null>(null);
  const [numberLayout, setNumberLayout] = useState<LayoutRectangle | null>(null);
  const [numberLine, setNumberLine] = useState<(LayoutRectangle & { value: number }) | null>(null);
  const exclusion = useMemo(() => {
    if (!numberLayout || !numberLine || numberLine.value !== stats.masteredCount) return null;
    return {
      x: numberLayout.x + numberLine.x,
      y: numberLayout.y + numberLine.y,
      width: numberLine.width,
      height: numberLine.height,
    };
  }, [numberLayout, numberLine, stats.masteredCount]);
  const reduceMotion = useReducedMotion();
  const [appActive, setAppActive] = useState(AppState.currentState === "active");

  useEffect(() => {
    if (!cardLayout || !exclusion) return;
    setStars((current) =>
      current && current.every((star) => !overlapsNumber(star, cardLayout.width, cardLayout.height, exclusion))
        ? current
        : generateStars(cardLayout.width, cardLayout.height, exclusion)
    );
  }, [cardLayout, exclusion]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      setAppActive(state === "active");
    });
    return () => subscription.remove();
  }, []);

  return (
    <View
      style={[styles.frame, { borderRadius: statsTileStyle.borderRadius * scale }]}
      pointerEvents="none"
      onLayout={({ nativeEvent: { layout } }) => {
        if (layout.width > 0) setFrameWidth(layout.width);
      }}
    >
      <ImageBackground
        source={require("@/assets/illustrations/streak/streak.png")}
        resizeMode="cover"
        style={[styles.container, { transform: [{ scale }] }]}
      >
        <View
          style={styles.stars}
          onLayout={({ nativeEvent: { layout } }) => {
            if (layout.width > 0 && layout.height > 0) {
              setCardLayout(layout);
            }
          }}
          pointerEvents="none"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {cardLayout && exclusion && stars?.filter((star) =>
            !overlapsNumber(star, cardLayout.width, cardLayout.height, exclusion)
          ).map((star) => (
            <FloatingStar key={star.id} star={star} animate={appActive && !reduceMotion} />
          ))}
        </View>
        <Image
          source={require("@/assets/illustrations/streak/lewyrog.png")}
          resizeMode="stretch"
          style={styles.decoration}
          accessible={false}
        />
        <Image
          source={require("@/assets/illustrations/streak/prawodol.png")}
          resizeMode="stretch"
          style={styles.decoration}
          accessible={false}
        />
        <View style={styles.mascot} pointerEvents="none">
          <BoxSkin
            wordCount={40}
            face="happy"
            showFace
            accessible={false}
            cardVariant="logo"
          />
        </View>
        <Image
          source={require("@/assets/illustrations/streak/prawyrog.png")}
          resizeMode="stretch"
          style={styles.decoration}
          accessible={false}
        />
        <Image
          source={require("@/assets/illustrations/streak/gora.png")}
          resizeMode="stretch"
          style={styles.decoration}
          accessible={false}
        />
        <Image
          source={require("@/assets/illustrations/puchar.png")}
          resizeMode="contain"
          style={styles.trophy}
          accessible={false}
        />
        <Text
          style={styles.bigNumber}
          numberOfLines={1}
          adjustsFontSizeToFit
          onLayout={({ nativeEvent: { layout } }) => setNumberLayout(layout)}
          onTextLayout={({ nativeEvent: { lines } }) => {
            const line = lines[0];
            if (line) setNumberLine({
              x: line.x,
              y: line.y,
              width: line.width,
              height: line.height,
              value: stats.masteredCount,
            });
          }}
        >
          {stats.masteredCount}
        </Text>
      </ImageBackground>
    </View>
  );
};

export default BigKnownWordsCard;
