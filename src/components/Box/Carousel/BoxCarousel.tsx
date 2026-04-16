// BoxCarousel.tsx
import { BoxesState } from "@/src/types/boxes";
import { CoachmarkAnchor } from "@edwardloopez/react-native-coachmark";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Animated,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
    type NativeScrollEvent,
    type NativeSyntheticEvent,
} from "react-native";
import BoxSkin from "../Skin/BoxSkin";
import { useBoxCarouselStyles } from "./BoxCarousel.styles";

type Face = "smile" | "happy" | "surprised";
type FaceState = Partial<Record<keyof BoxesState, Face>>;

interface BoxesProps {
    boxes: BoxesState;
    activeBox: keyof BoxesState | null;
    handleSelectBox: (name: keyof BoxesState) => void;
    hideBoxZero?: boolean;
    onBoxLongPress?: (name: keyof BoxesState) => void;
    disabled?: boolean;
    countOverrides?: Partial<Record<keyof BoxesState, number>>;
}

export default function BoxCarousel({
    boxes,
    activeBox,
    handleSelectBox,
    hideBoxZero = false,
    onBoxLongPress,
    disabled = false,
    countOverrides,
}: BoxesProps) {
  const styles = useBoxCarouselStyles();
  const { width } = useWindowDimensions();
  const BOX_SKIN_HEIGHT = 122;
  const ACTIVE_BOX_SCALE = 2.05;
  const ACTIVE_BOX_LIFT = 12;
  const BOX_STAGE_VERTICAL_PADDING = 40;
  const BOX_STAGE_HEIGHT = Math.ceil(
    BOX_SKIN_HEIGHT * ACTIVE_BOX_SCALE +
      ACTIVE_BOX_LIFT * 2 +
      BOX_STAGE_VERTICAL_PADDING
  );

    const items = useMemo(() => {
        const keys = Object.keys(boxes ?? {}) as (keyof BoxesState)[];
        const filtered = hideBoxZero ? keys.filter((k) => k !== "boxZero") : keys;
        return filtered.map((key) => ({
            key,
            count: countOverrides?.[key] ?? boxes[key]?.length ?? 0,
        }));
    }, [boxes, countOverrides, hideBoxZero]);

    const baseSize = Math.min(150, Math.max(120, width * 0.34));
    const itemGap = baseSize * 0.5;
    const itemWidth = baseSize + itemGap;
    const spacerWidth = Math.max((width - itemWidth) / 2, 0);
    const defaultIndex = useMemo(() => {
        if (!items.length) return 0;
        const boxOneIdx = items.findIndex((item) => item.key === "boxOne");
        if (boxOneIdx >= 0) {
            return boxOneIdx;
        }
        return Math.max(0, Math.floor(items.length / 2));
    }, [items]);

    const initialIndex = useMemo(() => {
        if (!items.length) return 0;
        if (!activeBox) return defaultIndex;
        const idx = items.findIndex((i) => i.key === activeBox);
        return idx >= 0 ? idx : defaultIndex;
    }, [activeBox, defaultIndex, items]);

    const scrollX = useRef(new Animated.Value(initialIndex * itemWidth)).current;
    const flatListRef =
        useRef<Animated.FlatList<{ key: keyof BoxesState; count: number }>>(null);
    const lastSelectedRef = useRef<keyof BoxesState | null>(activeBox);
    const prevItemWidthRef = useRef(itemWidth);
    const [activeIndex, setActiveIndex] = useState(initialIndex);
    const [scrollOffset, setScrollOffset] = useState(initialIndex * itemWidth);
    const [faces, setFaces] = useState<FaceState>({});
    const prevActiveIndexRef = useRef<number | null>(null);
    const faceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const longPressTriggeredRef = useRef(false);

    useEffect(() => {
        const widthChanged = prevItemWidthRef.current !== itemWidth;
        prevItemWidthRef.current = itemWidth;

        if (!items.length) return;
        if (!widthChanged && activeBox && activeBox === lastSelectedRef.current)
            return;

        const targetIdx = activeBox
            ? items.findIndex((i) => i.key === activeBox)
            : defaultIndex;
        const resolvedIdx = targetIdx >= 0 ? targetIdx : defaultIndex;

        flatListRef.current?.scrollToOffset({
            offset: resolvedIdx * itemWidth,
            animated: false,
        });
        scrollX.setValue(resolvedIdx * itemWidth);
        setActiveIndex(resolvedIdx);
        setScrollOffset(resolvedIdx * itemWidth);
        lastSelectedRef.current = activeBox ?? null;
    }, [activeBox, defaultIndex, itemWidth, items, scrollX]);

    const handleMomentumEnd = (
        event: NativeSyntheticEvent<NativeScrollEvent>
    ) => {
        if (disabled) {
            return;
        }
        const offsetX = event.nativeEvent.contentOffset.x;
        const rawIndex = Math.round(offsetX / itemWidth);
        const clamped = Math.max(0, Math.min(rawIndex, items.length - 1));
        const item = items[clamped];
        if (item && item.key !== activeBox) {
            lastSelectedRef.current = item.key;
            handleSelectBox(item.key);
        }
        setActiveIndex(clamped);
    };

    const scrollToIndex = (index: number, shouldNotify = true) => {
        if (disabled) {
            return;
        }
        const clamped = Math.max(0, Math.min(index, items.length - 1));
        flatListRef.current?.scrollToOffset({
            offset: clamped * itemWidth,
            animated: true,
        });
        if (shouldNotify) {
            const item = items[clamped];
            if (item && item.key !== activeBox) handleSelectBox(item.key);
        }
        if (items[clamped]) {
            lastSelectedRef.current = items[clamped].key;
        }
        setActiveIndex(clamped);
    };

    useEffect(() => {
        setFaces((prev) => {
            const next: FaceState = {};
            items.forEach((item, idx) => {
                next[item.key] = prev[item.key] ?? (idx === activeIndex ? "happy" : "smile");
            });
            return next;
        });
    }, [items, activeIndex]);

    useEffect(() => {
        if (!items.length) return;

        const currentKey = items[activeIndex]?.key;
        if (!currentKey) return;

        if (prevActiveIndexRef.current === null) {
            setFaces((prev) => ({ ...prev, [currentKey]: "happy" }));
            prevActiveIndexRef.current = activeIndex;
            return;
        }
        if (prevActiveIndexRef.current === activeIndex) {
            return;
        }

        const previousIdx = prevActiveIndexRef.current;
        const previousKey = previousIdx !== null ? items[previousIdx]?.key : null;

        if (previousKey && previousKey !== currentKey) {
            setFaces((prev) => ({ ...prev, [previousKey]: "smile" }));
        }

        if (faceTimerRef.current) {
            clearTimeout(faceTimerRef.current);
        }

        setFaces((prev) => ({ ...prev, [currentKey]: "surprised" }));
        faceTimerRef.current = setTimeout(() => {
            setFaces((prev) => ({ ...prev, [currentKey]: "happy" }));
        }, 500);

        prevActiveIndexRef.current = activeIndex;

        return () => {
            if (faceTimerRef.current) {
                clearTimeout(faceTimerRef.current);
            }
        };
    }, [activeIndex, items]);

    useEffect(() => {
        return () => {
            if (faceTimerRef.current) {
                clearTimeout(faceTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        // Ensure transient surprised faces do not linger after major layout/card changes.
        setFaces((prev) => {
            const next: FaceState = {};
            items.forEach((item, idx) => {
                const isCurrent = idx === activeIndex;
                const face = prev[item.key];
                next[item.key] = face === "surprised" ? (isCurrent ? "happy" : "smile") : (face ?? (isCurrent ? "happy" : "smile"));
            });
            return next;
        });
    }, [activeIndex, items]);

    if (!items.length) {
        return <View style={styles.container} />;
    }
    const activeCount = items[activeIndex]?.count ?? 0;
    const boxOneIndex = items.findIndex((item) => item.key === "boxOne");
    const boxTwoIndex = items.findIndex((item) => item.key === "boxTwo");
    const shouldShowPromotionAnchor = boxOneIndex >= 0 && boxTwoIndex >= 0;
    const promotionArrowLeft =
        shouldShowPromotionAnchor
            ? spacerWidth +
              ((boxOneIndex + boxTwoIndex + 1) * itemWidth) / 2 -
              scrollOffset -
              0.5
            : 0;

    return (
        <View style={styles.container}>
            <View style={styles.listContainer}>
                <Animated.FlatList
                    ref={flatListRef}
                    data={items}
                    keyExtractor={(item) => String(item.key)}
                    horizontal
                    removeClippedSubviews={false}
                    scrollEnabled={!disabled}
                    showsHorizontalScrollIndicator={false}
                    bounces={false}
                    snapToInterval={itemWidth}
                    snapToAlignment="start"
                    decelerationRate="fast"
                    onMomentumScrollEnd={handleMomentumEnd}
                    onScroll={Animated.event(
                        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                        {
                            useNativeDriver: false,
                            listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
                                setScrollOffset(event.nativeEvent.contentOffset.x);
                            },
                        }
                    )}
                    scrollEventThrottle={16}
                    getItemLayout={(_, index) => ({
                        length: itemWidth,
                        offset: itemWidth * index,
                        index,
                    })}
                    initialScrollIndex={initialIndex}
                    contentContainerStyle={{
                        paddingHorizontal: spacerWidth,
                        paddingVertical: 14,
                        alignItems: "center",
                    }}
                    renderItem={({ item, index }) => {
                        const inputRange = [
                            (index - 1) * itemWidth,
                            index * itemWidth,
                            (index + 1) * itemWidth,
                        ];
                        const scale = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.9, 2.05, 0.9],
                            extrapolate: "clamp",
                        });
                        const translateY = scrollX.interpolate({
                            inputRange,
                            outputRange: [14, -12, 14],
                            extrapolate: "clamp",
                        });
                        const isActive = index === activeIndex;
                        const face =
                            faces[item.key] ?? (isActive ? "happy" : "smile");

                        return (
                            <View
                                style={[styles.itemContainer, { width: itemWidth }]}
                            >
                                <Animated.View
                                    style={[
                                        styles.boxStage,
                                        {
                                            height: BOX_STAGE_HEIGHT,
                                            transform: [{ scale }, { translateY }],
                                        },
                                    ]}
                                >
                                    {item.key === "boxOne" || item.key === "boxTwo" ? (
                                        <CoachmarkAnchor
                                            id={
                                                item.key === "boxOne"
                                                    ? "flashcards-box-one"
                                                    : "flashcards-box-two"
                                            }
                                            shape="rect"
                                            radius={24}
                                        >
                                            <View collapsable={false}>
                                                <TouchableOpacity
                                                    activeOpacity={1}
                                                    disabled={disabled}
                                                    onPressIn={() => {
                                                        if (disabled) return;
                                                        longPressTriggeredRef.current = false;
                                                    }}
                                                    onLongPress={() => {
                                                        if (disabled) return;
                                                        longPressTriggeredRef.current = true;
                                                        onBoxLongPress?.(item.key);
                                                    }}
                                                    delayLongPress={400}
                                                    onPress={() => {
                                                        if (longPressTriggeredRef.current) {
                                                            longPressTriggeredRef.current = false;
                                                            return;
                                                        }
                                                        scrollToIndex(index);
                                                    }}
                                                >
                                                    <BoxSkin
                                                        wordCount={item.count}
                                                        face={face}
                                                        isActive={isActive}
                                                        isCaro={false}
                                                    />
                                                </TouchableOpacity>
                                            </View>
                                        </CoachmarkAnchor>
                                    ) : (
                                        <TouchableOpacity
                                            activeOpacity={1}
                                            disabled={disabled}
                                            onPressIn={() => {
                                                if (disabled) return;
                                                longPressTriggeredRef.current = false;
                                            }}
                                            onLongPress={() => {
                                                if (disabled) return;
                                                longPressTriggeredRef.current = true;
                                                onBoxLongPress?.(item.key);
                                            }}
                                            delayLongPress={400}
                                            onPress={() => {
                                                if (longPressTriggeredRef.current) {
                                                    longPressTriggeredRef.current = false;
                                                    return;
                                                }
                                                scrollToIndex(index);
                                            }}
                                        >
                                            <BoxSkin
                                                wordCount={item.count}
                                                face={face}
                                                isActive={isActive}
                                                isCaro={false}
                                            />
                                        </TouchableOpacity>
                                    )}
                                </Animated.View>
                            </View>
                        );
                    }}
                />
                {shouldShowPromotionAnchor ? (
                    <CoachmarkAnchor
                        id="flashcards-promotion-arrow-anchor"
                        shape="rect"
                        radius={12}
                        style={[
                            styles.hiddenPromotionAnchor,
                            { left: promotionArrowLeft, width: 1, height: 1 },
                        ]}
                    >
                        <View />
                    </CoachmarkAnchor>
                ) : null}
            </View>
            <View style={styles.activeCounterWrap}>
                {items[activeIndex]?.key === "boxOne" ? (
                    <CoachmarkAnchor
                        id="flashcards-box-one-count"
                        shape="rect"
                        radius={12}
                    >
                        <Text style={[styles.number, styles.numberUpdate]}>
                            {activeCount}
                        </Text>
                    </CoachmarkAnchor>
                ) : (
                    <Text style={[styles.number, styles.numberUpdate]}>
                        {activeCount}
                    </Text>
                )}
            </View>
        </View>
    );
}
