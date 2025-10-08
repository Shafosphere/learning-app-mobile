import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type ConfettiProps = {
  generateConfetti: boolean;
  piecesPerBatch?: number;
  batchIntervalMs?: number;
  fallDurationMs?: number;
  colors?: readonly string[];
  style?: StyleProp<ViewStyle>;
};

type ConfettiPiece = {
  id: string;
  animated: Animated.Value;
  color: string;
  startX: number;
  drift: number;
  size: number;
  rotateStart: number;
  rotateDelta: number;
};

const DEFAULT_COLORS: readonly string[] = [
  "#FFC700",
  "#FF6384",
  "#36A2EB",
  "#4BC0C0",
  "#FF9F40",
  "#9966FF",
  "#FF4D4D",
];

export default function Confetti({
  generateConfetti,
  piecesPerBatch = 5,
  batchIntervalMs = 240,
  fallDurationMs = 3600,
  colors,
  style,
}: ConfettiProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);
  const pendingRemovalsRef = useRef<Set<string>>(new Set());
  const removalFrameRef = useRef<number | null>(null);
  const { width, height } = useWindowDimensions();

  const palette = useMemo(() => {
    return colors?.length ? colors : DEFAULT_COLORS;
  }, [colors]);

  const flushPendingRemovals = useCallback(() => {
    removalFrameRef.current = null;
    if (!isMountedRef.current) {
      pendingRemovalsRef.current.clear();
      return;
    }
    if (pendingRemovalsRef.current.size === 0) return;
    const removals = new Set(pendingRemovalsRef.current);
    pendingRemovalsRef.current.clear();
    setPieces((current) => current.filter((piece) => !removals.has(piece.id)));
  }, []);

  const queueRemoval = useCallback((id: string) => {
    if (!isMountedRef.current) return;
    pendingRemovalsRef.current.add(id);
    if (removalFrameRef.current == null) {
      removalFrameRef.current = requestAnimationFrame(flushPendingRemovals);
    }
  }, [flushPendingRemovals]);

  const spawnBatch = useCallback(() => {
    if (width <= 0 || height <= 0) return;

    const created = Array.from({ length: piecesPerBatch }).map<ConfettiPiece>(
      () => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const animated = new Animated.Value(0);
        const startX = Math.random() * width;
        const drift = (Math.random() - 0.5) * width * 0.35;
        const size = 6 + Math.random() * 8;
        const color = palette[Math.floor(Math.random() * palette.length)];
        const rotateStart = Math.random() * 360;
        const rotateDelta = (Math.random() - 0.5) * 720;
        const duration = fallDurationMs + Math.random() * 600;
        const delay = Math.random() * 220;

        Animated.timing(animated, {
          toValue: 1,
          duration,
          delay,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) {
            queueRemoval(id);
          }
        });

        return {
          id,
          animated,
          color,
          startX,
          drift,
          size,
          rotateStart,
          rotateDelta,
        };
      }
    );

    setPieces((current) => [...current, ...created]);
  }, [
    queueRemoval,
    fallDurationMs,
    palette,
    piecesPerBatch,
    width,
    height,
  ]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (removalFrameRef.current != null) {
        cancelAnimationFrame(removalFrameRef.current);
        removalFrameRef.current = null;
      }
      pendingRemovalsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (generateConfetti) {
      spawnBatch();
      intervalRef.current = setInterval(spawnBatch, batchIntervalMs);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [batchIntervalMs, generateConfetti, spawnBatch]);

  if (!generateConfetti && pieces.length === 0) {
    return null;
  }

  return (
    <View pointerEvents="none" style={[styles.wrapper, style]}>
      {pieces.map((piece) => {
        const translateY = piece.animated.interpolate({
          inputRange: [0, 1],
          outputRange: [-40, height + 60],
        });
        const translateX = piece.animated.interpolate({
          inputRange: [0, 1],
          outputRange: [0, piece.drift],
        });
        const rotateZ = piece.animated.interpolate({
          inputRange: [0, 1],
          outputRange: [
            `${piece.rotateStart}deg`,
            `${piece.rotateStart + piece.rotateDelta}deg`,
          ],
        });
        const opacity = piece.animated.interpolate({
          inputRange: [0, 0.1, 0.9, 1],
          outputRange: [0, 1, 1, 0],
        });

        return (
          <Animated.View
            key={piece.id}
            style={[
              styles.piece,
              {
                left: piece.startX,
                width: piece.size,
                height: piece.size * 1.4,
                backgroundColor: piece.color,
                opacity,
                transform: [
                  { translateY },
                  { translateX },
                  { rotateZ },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  piece: {
    position: "absolute",
    top: -40,
    // borderRadius: 6,
  },
});
