import React, { useEffect, useRef, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  FeBlend,
  FeColorMatrix,
  FeGaussianBlur,
  Filter,
  G,
  Path,
} from "react-native-svg";

type FlameLayer = "back" | "mid" | "core";

type Flame = {
  x: number;
  baseY: number;
  heightBase: number;
  widthBase: number;
  layer: FlameLayer;
  seed: number;
  speed: number;
  color: string;
  opacity: number;
  path: string;
  flicker: number;
};

type Spark = {
  x: number;
  y: number;
  size: number;
  speedY: number;
  life: number;
  decay: number;
};

const layerStyles: Record<FlameLayer, { color: string; opacity: number }> = {
  back: { color: "#991b1b", opacity: 0.7 },
  mid: { color: "#ea580c", opacity: 0.8 },
  core: { color: "#facc15", opacity: 0.9 },
};

const DEFAULT_WIDTH = 440;
const DEFAULT_HEIGHT = 220;

// Simple layered noise used by the HTML prototype.
const noise = (t: number, offset: number) =>
  Math.sin(t + offset) +
  Math.sin(t * 2.3 + offset * 2) * 0.5 +
  Math.sin(t * 4.7 + offset * 3) * 0.2;

const createFlames = (width: number, height: number): Flame[] => {
  const baseY = height + 20;
  const next: Flame[] = [];

  const addFlames = (count: number, layer: FlameLayer, heightBase: number, widthBase: number) => {
    for (let i = 0; i < count; i++) {
      const seed = Math.random() * 1000;
      const speed = 0.5 + Math.random() * 0.5;
      const { color, opacity } = layerStyles[layer];

      next.push({
        x: Math.random() * width,
        baseY,
        heightBase,
        widthBase,
        layer,
        seed,
        speed,
        color,
        opacity,
        path: "",
        flicker: opacity,
      });
    }
  };

  addFlames(15, "back", 150, 80);
  addFlames(12, "mid", 120, 60);
  addFlames(8, "core", 90, 40);

  return next;
};

const createSparks = (width: number, height: number): Spark[] => {
  const sparks: Spark[] = [];
  for (let i = 0; i < 30; i++) {
    sparks.push({
      x: Math.random() * width,
      y: height,
      size: Math.random() * 2 + 1,
      speedY: Math.random() * 2 + 1,
      life: 1,
      decay: Math.random() * 0.02 + 0.01,
    });
  }
  return sparks;
};

const advanceFlame = (flame: Flame, time: number) => {
  const t = time * flame.speed + flame.seed;

  const hVar = noise(t, 0) * 20;
  const wVar = noise(t, 10) * 10;

  const currentH = flame.heightBase + hVar;
  const currentW = flame.widthBase + wVar;

  const tipX = flame.x + noise(t, 20) * 30;
  const tipY = flame.baseY - currentH;

  const cp1Y = flame.baseY - currentH * 0.25;
  const cp1LeftX = flame.x - currentW * 0.6 + noise(t, 30) * 10;
  const cp1RightX = flame.x + currentW * 0.6 + noise(t, 40) * 10;

  const cp2Y = flame.baseY - currentH * 0.75;
  const cp2LeftX = tipX - currentW * 0.3 + noise(t, 50) * 15;
  const cp2RightX = tipX + currentW * 0.3 + noise(t, 60) * 15;

  const baseLeftX = flame.x - currentW * 0.5 + noise(t, 70) * 5;
  const baseRightX = flame.x + currentW * 0.5 + noise(t, 80) * 5;

  flame.path = `
      M ${baseLeftX} ${flame.baseY}
      C ${cp1LeftX} ${cp1Y}, ${cp2LeftX} ${cp2Y}, ${tipX} ${tipY}
      C ${cp2RightX} ${cp2Y}, ${cp1RightX} ${cp1Y}, ${baseRightX} ${flame.baseY}
      Z
    `;

  const flicker = 0.1 * noise(t * 5, 90);
  flame.flicker = Math.max(0, flame.opacity + flicker);
};

const advanceSpark = (spark: Spark, width: number, height: number) => {
  spark.y -= spark.speedY;
  spark.life -= spark.decay;
  spark.x += Math.sin(spark.y * 0.1) * 0.5;

  if (spark.life <= 0) {
    spark.x = Math.random() * width;
    spark.y = height;
    spark.size = Math.random() * 2 + 1;
    spark.speedY = Math.random() * 2 + 1;
    spark.life = 1;
    spark.decay = Math.random() * 0.02 + 0.01;
  }
};

export const OrganicFireEffect: React.FC = () => {
  const [size, setSize] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
  const [ready, setReady] = useState(false);
  const [, forceRender] = useState(0);

  const flamesRef = useRef<Flame[]>([]);
  const sparksRef = useRef<Spark[]>([]);
  const rafRef = useRef<number | null>(null);
  const timeRef = useRef(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setSize({ width, height });
      setReady(true);
    }
  };

  useEffect(() => {
    if (!ready) return undefined;

    flamesRef.current = createFlames(size.width, size.height);
    sparksRef.current = createSparks(size.width, size.height);
    timeRef.current = 0;

    const animate = () => {
      timeRef.current += 0.02;

      flamesRef.current.forEach((flame) => advanceFlame(flame, timeRef.current));
      sparksRef.current.forEach((spark) => advanceSpark(spark, size.width, size.height));

      forceRender((value) => value + 1); // Forces a re-render with updated paths
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [ready, size.height, size.width]);

  return (
    <View style={styles.container} pointerEvents="none" onLayout={handleLayout}>
      {ready ? (
        <Svg width="100%" height="100%" viewBox={`0 0 ${size.width} ${size.height}`} preserveAspectRatio="none">
          <Defs>
            <Filter id="fireBlur">
              <FeGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
              <FeColorMatrix
                in="blur"
                type="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
                result="goo"
              />
              <FeBlend in="SourceGraphic" in2="goo" />
            </Filter>
          </Defs>

          <G filter="url(#fireBlur)">
            {flamesRef.current.map((flame, index) => (
              <Path key={`flame-${index}`} d={flame.path} fill={flame.color} fillOpacity={flame.flicker} />
            ))}
          </G>

          {sparksRef.current.map((spark, index) => (
            <Circle
              key={`spark-${index}`}
              cx={spark.x}
              cy={spark.y}
              r={spark.size}
              fill="#fbbf24"
              opacity={spark.life}
            />
          ))}
        </Svg>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
});
