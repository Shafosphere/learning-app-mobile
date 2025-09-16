import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Animated, Text, View, Easing } from "react-native";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export type RotaryStackHandle = {
  spin: () => void;
  isAnimating: () => boolean;
};

interface RotaryStackProps {
  items?: string[];
  height?: number;
  middleStyle?: any;
}

const useStyles = createThemeStylesHook((colors) => ({
  container: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  window: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    // overflow: "hidden",
    // border styling for visibility
    // backgroundColor: colors.lightbg,
    // borderColor: colors.my_green,
    // borderWidth: 3,
    // borderRadius: 8,
  },
  cardBase: {
    position: "absolute",
    // left: 12,
    // right: 12,
    width: "100%",
    paddingLeft: 12,
    height: 56,
    borderRadius: 8,
    backgroundColor: colors.lightbg,
    justifyContent: "center",
    //  opacity: 0.1,
  },
  cardText: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.headline,
    textTransform: "uppercase",
  },
  cardMiddle: {
    backgroundColor: colors.lightbg,
    width: "100%",
    zIndex: 100,
    // paddingVertical: 14,
    // paddingHorizontal: 18,
    alignContent: "center",
    justifyContent: "center",
    borderRadius: 8,
    height: 65,
    // opacity: 1,
  },
  // Animated border overlay for the middle card
  cardMiddleBorder: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderColor: colors.my_green,
    borderWidth: 3,
    borderRadius: 8,
  },
  cardBottom: {
    // opacity: 0.1,
  },
  cardHidden: {
    // opacity: 0,
  }
}));

// Slot configuration roughly mirroring the web CSS
// index: 0=top-bot, 1=top, 2=middle, 3=bottom, 4=bottom-bot
const SLOT_CONFIG = [
  { translateY: -30, scale: 0.5, opacity: 0 },
  { translateY: -40, scale: 0.8, opacity: 0.8 },
  { translateY: 0, scale: 1, opacity: 1 },
  // Make bottom slot fully transparent so middle→bottom fades out completely
  { translateY: 40, scale: 0.4, opacity: 0 },
  { translateY: 30, scale: 0.1, opacity: 0 },
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

const buildInitialCards = (data: string[]): Card[] => {
  const total = data.length;
  const getText = (offset: number) => {
    if (total === 0) {
      return null;
    }
    // Ta funkcja pomocnicza pozostaje bez zmian
    const index = ((offset % total) + total) % total;
    return data[index] ?? null;
  };

  // Zmieniamy logikę układania kart, aby pasowała do animacji "w dół"
  return [
    { key: "c0", text: getText(2), slot: 0 },   // Następny po następnym
    { key: "c1", text: getText(1), slot: 1 },   // Następny element czeka na górze
    { key: "c2", text: getText(0), slot: 2 },   // Pierwszy, widoczny element
    { key: "c3", text: getText(-1), slot: 3 },  // Ostatni element z listy jest na dole
    { key: "c4", text: getText(-2), slot: 4 },  // Przedostatni element
  ];
};


const RotaryStack = forwardRef<RotaryStackHandle, RotaryStackProps>(
  ({ items = DEFAULT_ITEMS, height = 160, middleStyle }, ref) => {
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
    const [cards, setCards] = useState<Card[]>(() => buildInitialCards(data));

    // Reinitialize when items change
    useEffect(() => {
      setCards(buildInitialCards(data));
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
        // Slightly longer with easing for smoother fade out
        duration: 750,
        easing: Easing.out(Easing.cubic),
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
            // Border overlay opacity for smooth fade in/out on middle slot
            const middleBorderOpacity =
              prevSlot === 2 && card.slot !== 2
                ? anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })
                : prevSlot !== 2 && card.slot === 2
                ? anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] })
                : card.slot === 2
                ? 1
                : 0;
            return (
              <Animated.View
                key={card.key}
                style={[
                  styles.cardBase,
                  interpStyle,
                  // Keep middle layout (height/zIndex), border is animated separately
                  card.slot === 2 && styles.cardMiddle,
                  card.slot === 2 && middleStyle,
                  card.slot === 3 && styles.cardBottom,
                   card.slot === 4 && styles.cardHidden,
                ]}
                pointerEvents="none"
              >
                {(prevSlot === 2 || card.slot === 2) && (
                  <Animated.View
                    pointerEvents="none"
                    style={[styles.cardMiddleBorder, { opacity: middleBorderOpacity }]}
                  />
                )}
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
