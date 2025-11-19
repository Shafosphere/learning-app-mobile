import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Animated, Text, View, Easing, Pressable } from "react-native";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import Octicons from "@expo/vector-icons/Octicons";

export type RotaryStackItem = {
  text: string;
  showMultiAnswerHint?: boolean;
};

type SpinParams = {
  injectItem?: RotaryStackItem | null;
  targetSlot?: 0 | 4;
};

export type RotaryStackHandle = {
  spin: (params?: SpinParams) => void;
  isAnimating: () => boolean;
};

interface RotaryStackProps {
  items?: RotaryStackItem[];
  height?: number;
  middleStyle?: any;
  onMiddleIconPress?: () => RotaryStackItem | null;
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
  },
  cardBase: {
    position: "absolute",
    // left: 12,
    // right: 12,
    width: "100%",
    paddingHorizontal: 18,
    height: 56,
    borderRadius: 8,
    backgroundColor: colors.secondBackground,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardText: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.headline,
    textTransform: "uppercase",
    flex: 1,
  },
  cardMiddle: {
    backgroundColor: colors.secondBackground,
    width: "100%",
    zIndex: 100,
    // paddingVertical: 14,
    paddingHorizontal: 18,
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
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: 12,
  },
  cardIconWrapper: {
    width: 32,
    alignItems: "flex-end",
    justifyContent: "center",
  },
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

const DEFAULT_ITEMS: RotaryStackItem[] = [
  { text: "ALPHA" },
  { text: "BRAVO" },
  { text: "CHARLIE" },
  { text: "DELTA" },
  { text: "ECHO" },
  { text: "FOXTROT" },
];

function getInterpolatedStyle(
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

type Card = { key: string; item: RotaryStackItem | null; slot: number };

const buildInitialCards = (data: RotaryStackItem[]): Card[] => {
  const total = data.length;
  const getFromStart = (index: number) =>
    index >= 0 && index < total ? data[index] ?? null : null;
  const getFromEnd = (indexFromEnd: number) => {
    const index = total - 1 - indexFromEnd;
    return index >= 0 && index < total ? data[index] ?? null : null;
  };

  return [
    { key: "c0", item: getFromStart(2), slot: 0 }, // słowo ukryte nad górnym slotem
    { key: "c1", item: getFromStart(1), slot: 1 }, // slot górny
    { key: "c2", item: getFromStart(0), slot: 2 }, // slot środkowy
    { key: "c3", item: total >= 4 ? getFromEnd(0) : null, slot: 3 }, // slot dolny
    { key: "c4", item: total >= 5 ? getFromEnd(1) : null, slot: 4 }, // ukryty pod spodem
  ];
};

const RotaryStack = forwardRef<RotaryStackHandle, RotaryStackProps>(
  (
    { items = DEFAULT_ITEMS, height = 160, middleStyle, onMiddleIconPress },
    ref
  ) => {
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

    // pointer for what to inject next into top-bot after a spin
    const [nextIndex, setNextIndex] = useState(3); // 0->middle,1->top,2->top-bot already seeded

    // Cards with their current slots
    const [cards, setCards] = useState<Card[]>(() => buildInitialCards(data));

    // Reinitialize when items change
    useEffect(() => {
      setCards(buildInitialCards(data));
      setNextIndex(3);
      anim.setValue(1);
      setAnimating(false);
    }, [data, anim]);

    const spin = (params?: SpinParams) => {
      const { injectItem, targetSlot = 0 } = params ?? {};
      if (targetSlot !== 0 && targetSlot !== 4) {
        // keep API defensive – ignore unsupported slots
        return;
      }
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
        // after animation completes, only inject new data into top-bot
        setCards((prev) => {
          const updated = [...prev];
          const idx = updated.findIndex((c) => c.slot === targetSlot);
          if (idx !== -1) {
            const fallbackItem =
              data.length > 0 ? data[nextIndex % data.length] ?? null : null;
            const itemToUse =
              injectItem !== undefined ? injectItem : fallbackItem;
            updated[idx] = { ...updated[idx], item: itemToUse };
          }
          return updated;
        });
        if (injectItem === undefined && data.length > 0) {
          setNextIndex((i) => (i + 1) % data.length);
        }
        prevSlotsRef.current = null;
        setAnimating(false);
      });
    };

    useImperativeHandle(ref, () => ({
      spin,
      isAnimating: () => animating,
    }));

    const handleMiddleIconPress = useCallback(() => {
      if (!onMiddleIconPress) {
        return;
      }

      const updatedItem = onMiddleIconPress();
      if (!updatedItem) {
        return;
      }

      setCards((prev) =>
        prev.map((card) =>
          card.slot === 2 ? { ...card, item: updatedItem } : card
        )
      );
    }, [onMiddleIconPress]);

    return (
      <View style={styles.container}>
        <View style={[styles.window, { height }]}>
          {cards.map((card) => {
            const prevSlot = prevSlotsRef.current?.[card.key] ?? card.slot;
            const interpStyle = getInterpolatedStyle(anim, prevSlot, card.slot);
            // Border overlay opacity for smooth fade in/out on middle slot
            const middleBorderOpacity =
              prevSlot === 2 && card.slot !== 2
                ? anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })
                : prevSlot !== 2 && card.slot === 2
                ? anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] })
                : card.slot === 2
                ? 1
                : 0;
            const showIcon =
              card.slot === 2 && !!card.item?.showMultiAnswerHint;
            const canPressIcon = showIcon && !!onMiddleIconPress;
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
                pointerEvents={showIcon ? "auto" : "none"}
              >
                {(prevSlot === 2 || card.slot === 2) && (
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.cardMiddleBorder,
                      { opacity: middleBorderOpacity },
                    ]}
                  />
                )}
                <View style={styles.cardContent}>
                  {!!card.item?.text && (
                    <Text style={styles.cardText} numberOfLines={1}>
                      {card.item.text}
                    </Text>
                  )}
                  {showIcon && (
                    <Pressable
                      style={styles.cardIconWrapper}
                      onPress={handleMiddleIconPress}
                      disabled={!canPressIcon}
                      hitSlop={8}
                    >
                      <Octicons
                        name="discussion-duplicate"
                        size={24}
                        color="black"
                      />
                    </Pressable>
                  )}
                </View>
              </Animated.View>
            );
          })}
        </View>
      </View>
    );
  }
);

RotaryStack.displayName = "RotaryStack";

export default RotaryStack;
