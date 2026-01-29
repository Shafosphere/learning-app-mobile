import React, { useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import Animated, {
  SharedValue,
  useAnimatedProps,
  useFrameCallback,
  useSharedValue
} from "react-native-reanimated";
import Svg, {
  Circle,
  G,
  Path
} from "react-native-svg";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type FlameLayer = "back" | "mid" | "core";

type FlameConfig = {
  x: number;
  baseY: number;
  heightBase: number;
  widthBase: number;
  layer: FlameLayer;
  seed: number;
  speed: number;
  color: string;
  opacity: number;
};

type SparkConfig = {
  initialX: number;
  initialY: number;
  size: number;
  speedY: number;
  decay: number;
  offset: number;
};

const layerStyles: Record<FlameLayer, { color: string; opacity: number }> = {
  back: { color: "#ef4444", opacity: 0.4 }, // Brighter red, lower opacity
  mid: { color: "#f97316", opacity: 0.5 }, // Brighter orange
  core: { color: "#fef08a", opacity: 0.7 }, // Brighter yellow
};

const DEFAULT_WIDTH = 440;
const DEFAULT_HEIGHT = 220;

// Worklet-safe noise function
const noise = (t: number, offset: number) => {
  "worklet";
  return (
    Math.sin(t + offset) +
    Math.sin(t * 2.3 + offset * 2) * 0.5 +
    Math.sin(t * 4.7 + offset * 3) * 0.2
  );
};

const FlameComponent = ({
  config,
  time,
}: {
  config: FlameConfig;
  time: SharedValue<number>;
}) => {
  const animatedProps = useAnimatedProps(() => {
    const t = time.value * config.speed + config.seed;

    const hVar = noise(t, 0) * 20;
    const wVar = noise(t, 10) * 10;

    const currentH = config.heightBase + hVar;
    const currentW = config.widthBase + wVar;

    const tipX = config.x + noise(t, 20) * 30;
    const tipY = config.baseY - currentH;

    const cp1Y = config.baseY - currentH * 0.25;
    const cp1LeftX = config.x - currentW * 0.6 + noise(t, 30) * 10;
    const cp1RightX = config.x + currentW * 0.6 + noise(t, 40) * 10;

    const cp2Y = config.baseY - currentH * 0.75;
    const cp2LeftX = tipX - currentW * 0.3 + noise(t, 50) * 15;
    const cp2RightX = tipX + currentW * 0.3 + noise(t, 60) * 15;

    const baseLeftX = config.x - currentW * 0.5 + noise(t, 70) * 5;
    const baseRightX = config.x + currentW * 0.5 + noise(t, 80) * 5;

    const d = `
      M ${baseLeftX} ${config.baseY}
      C ${cp1LeftX} ${cp1Y}, ${cp2LeftX} ${cp2Y}, ${tipX} ${tipY}
      C ${cp2RightX} ${cp2Y}, ${cp1RightX} ${cp1Y}, ${baseRightX} ${config.baseY}
      Z
    `;

    const flicker = 0.1 * noise(t * 5, 90);
    const fillOpacity = Math.max(0, config.opacity + flicker);

    return {
      d,
      fillOpacity,
    };
  });

  return <AnimatedPath animatedProps={animatedProps} fill={config.color} />;
};

const SparkComponent = ({
  config,
  time,
  height,
}: {
  config: SparkConfig;
  time: SharedValue<number>;
  height: number;
}) => {
  const animatedProps = useAnimatedProps(() => {
    // Simulate continuous movement based on time
    // We use modulo to loop the spark's life
    const lifeCycle = 200; // Arbitrary cycle length
    const t = (time.value * 10 + config.offset) % lifeCycle;

    // Normalized life from 1 to 0
    const progress = t / lifeCycle;

    // Reset position logic simulated by modulo
    // y goes from height to height - distance
    const distance = config.speedY * 100; // Scale speed to distance
    const currentY = height - (progress * distance);

    // X sway
    const currentX = config.initialX + Math.sin(currentY * 0.1) * 5;

    // Opacity fades out as it goes up
    const opacity = 1 - progress;

    return {
      cx: currentX,
      cy: currentY,
      opacity: Math.max(0, opacity),
    };
  });

  return (
    <AnimatedCircle
      r={config.size}
      fill="#fbbf24"
      animatedProps={animatedProps}
    />
  );
};

export const OrganicFireEffect: React.FC = () => {
  const [size, setSize] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
  const [ready, setReady] = useState(false);
  const time = useSharedValue(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setSize({ width, height });
      setReady(true);
    }
  };

  useFrameCallback((frameInfo) => {
    if (!ready) return;
    // Increment time based on frame duration to keep consistent speed
    // frameInfo.timeSincePreviousFrame is in ms
    const dt = (frameInfo.timeSincePreviousFrame ?? 16) / 1000;
    time.value += dt;
  });

  const flames = useMemo(() => {
    const baseY = size.height + 20;
    const list: FlameConfig[] = [];

    const addFlames = (count: number, layer: FlameLayer, heightBase: number, widthBase: number) => {
      let spread = 1.0;
      if (layer === "core") spread = 0.6; // Increased spread for core
      if (layer === "mid") spread = 0.85;  // Increased spread for mid
      if (layer === "back") spread = 1.0; // Full width

      // Calculate the total width covered by this layer
      const layerWidth = size.width * spread;
      const startX = (size.width - layerWidth) / 2;

      // Calculate step size to distribute flames evenly
      // If count is 1, place in center. If > 1, distribute across layerWidth.
      const step = count > 1 ? layerWidth / (count - 1) : 0;

      for (let i = 0; i < count; i++) {
        const { color, opacity } = layerStyles[layer];

        // Base position: evenly distributed
        let baseX = size.width / 2; // Default center
        if (count > 1) {
          baseX = startX + i * step;
        }

        // Add small random jitter so they aren't perfectly grid-aligned
        // Jitter is +/- 10% of the step size
        const jitter = (Math.random() - 0.5) * (step * 0.4);

        list.push({
          x: baseX + jitter,
          baseY,
          heightBase,
          widthBase,
          layer,
          seed: Math.random() * 1000,
          speed: 0.5 + Math.random() * 0.5,
          color,
          opacity,
        });
      }
    };

    addFlames(8, "back", 150, 80);
    addFlames(6, "mid", 120, 60);
    addFlames(7, "core", 90, 40);

    return list;
  }, [size.width, size.height]);

  const sparks = useMemo(() => {
    const list: SparkConfig[] = [];
    for (let i = 0; i < 10; i++) {
      list.push({
        initialX: Math.random() * size.width,
        initialY: size.height,
        size: Math.random() * 2 + 1,
        speedY: Math.random() * 2 + 1,
        decay: Math.random() * 0.02 + 0.01,
        offset: Math.random() * 1000,
      });
    }
    return list;
  }, [size.width, size.height]);

  return (
    <View style={styles.container} pointerEvents="none" onLayout={handleLayout}>
      {ready && (
        <Svg width="100%" height="100%" viewBox={`0 0 ${size.width} ${size.height}`} preserveAspectRatio="none">
          <G>
            {flames.map((config, index) => (
              <FlameComponent key={`flame-${index}`} config={config} time={time} />
            ))}
          </G>

          {sparks.map((config, index) => (
            <SparkComponent
              key={`spark-${index}`}
              config={config}
              time={time}
              height={size.height}
            />
          ))}
        </Svg>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
});
