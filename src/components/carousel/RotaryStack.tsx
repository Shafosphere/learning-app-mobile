import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Animated, Text, View } from "react-native";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export type RotaryStackHandle = {
  spin: () => void;
  isAnimating: () => boolean;
};

interface RotaryStackProps {
  items?: string[];
  height?: number; // height of the carousel window
}

const useStyles = createThemeStylesHook((colors) => ({
  container: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  window: {
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    // border styling for visibility
    // backgroundColor: colors.lightbg,
    // borderColor: colors.my_green,
    // borderWidth: 3,
    // borderRadius: 8,
  },
  cardBase: {
    position: "absolute",
    left: 12,
    right: 12,
    paddingLeft: 12,
    height: 56,
    borderRadius: 8,
    backgroundColor: colors.lightbg,
    justifyContent: "center",
  },
  cardText: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.headline,
    textTransform: "uppercase",
  },
  cardMiddle: {
    borderWidth: 3,
    borderColor: colors.my_green,
  },
}));

// Slot configuration roughly mirroring the web CSS
// index: 0=top-bot, 1=top, 2=middle, 3=bottom, 4=bottom-bot
const SLOT_CONFIG = [
  { translateY: -70, scale: 0.5, opacity: 0 },
  { translateY: -40, scale: 0.8, opacity: 0.8 },
  { translateY: 0, scale: 1, opacity: 1 },
  { translateY: 40, scale: 0.8, opacity: 0.8 },
  { translateY: 70, scale: 0.3, opacity: 0 },
] as const;

const DEFAULT_ITEMS = ["ALPHA", "BRAVO", "CHARLIE", "DELTA", "ECHO", "FOXTROT"];

function useInterpolatedStyle(
  anim: Animated.Value,
  fromSlot: number,
  toSlot: number
) {
  const from = SLOT_CONFIG[fromSlot];
  const to = SLOT_CONFIG[toSlot];
  return {
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [from.translateY, to.translateY],
        }),
      },
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [from.scale, to.scale],
        }),
      },
    ],
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [from.opacity, to.opacity],
    }),
  } as const;
}

type Card = { key: string; text: string | null; slot: number };

const RotaryStack = forwardRef<RotaryStackHandle, RotaryStackProps>(
  ({ items = DEFAULT_ITEMS, height = 160 }, ref) => {
    const styles = useStyles();

    // Normalize items – avoid empty array
    const data = useMemo(
      () => (items.length > 0 ? items : DEFAULT_ITEMS),
      [items]
    );

    // animated value for a single step
    const anim = useRef(new Animated.Value(1)).current;
    const [animating, setAnimating] = useState(false);
    // snapshot of previous slots to animate from
    const prevSlotsRef = useRef<Record<string, number> | null>(null);

    // pointer for what to inject next into bottom-bot after a spin
    const [nextIndex, setNextIndex] = useState(3); // 0->middle,1->bottom,2->bottom-bot seeded

    // Cards with their current slots
    const [cards, setCards] = useState<Card[]>(() => [
      { key: "c0", text: null, slot: 0 },
      { key: "c1", text: null, slot: 1 },
      { key: "c2", text: data[0] ?? null, slot: 2 },
      { key: "c3", text: data[1] ?? null, slot: 3 },
      { key: "c4", text: data[2] ?? null, slot: 4 },
    ]);

    // Reinitialize when items change
    useEffect(() => {
      setCards([
        { key: "c0", text: null, slot: 0 },
        { key: "c1", text: null, slot: 1 },
        { key: "c2", text: data[0] ?? null, slot: 2 },
        { key: "c3", text: data[1] ?? null, slot: 3 },
        { key: "c4", text: data[2] ?? null, slot: 4 },
      ]);
      setNextIndex(3);
      anim.setValue(1);
      setAnimating(false);
    }, [data, anim]);

    const spin = () => {
      if (animating) return;
      setAnimating(true);
      // snapshot current slots
      prevSlotsRef.current = Object.fromEntries(
        cards.map((c) => [c.key, c.slot])
      );
      // advance logical slots immediately; content unchanged for smoothness
      setCards((prev) => prev.map((c) => ({ ...c, slot: (c.slot + 1) % 5 })));
      // animate from prev -> current
      anim.setValue(0);
      Animated.timing(anim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // after animation completes, only inject new data into bottom-bot
        setCards((prev) => {
          const updated = [...prev];
          const idx = updated.findIndex((c) => c.slot === 4);
          if (idx !== -1) {
            const text = data[nextIndex % data.length] ?? null;
            updated[idx] = { ...updated[idx], text };
          }
          return updated;
        });
        setNextIndex((i) => (i + 1) % data.length);
        prevSlotsRef.current = null;
        setAnimating(false);
      });
    };

    useImperativeHandle(ref, () => ({
      spin,
      isAnimating: () => animating,
    }));

    return (
      <View style={styles.container}>
        <View style={[styles.window, { height }]}>
          {cards.map((card) => {
            const prevSlot = prevSlotsRef.current?.[card.key] ?? card.slot;
            const interpStyle = useInterpolatedStyle(anim, prevSlot, card.slot);
            return (
              <Animated.View
                key={card.key}
                style={[styles.cardBase, interpStyle]}
                pointerEvents="none"
              >
                {!!card.text && (
                  <Text style={styles.cardText}>{card.text}</Text>
                )}
              </Animated.View>
            );
          })}
        </View>
      </View>
    );
  }
);

export default RotaryStack;
