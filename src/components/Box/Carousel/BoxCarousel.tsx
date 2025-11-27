// BoxCarousel.tsx
import { BoxesState } from "@/src/types/boxes";
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
}

export default function BoxCarousel({
    boxes,
    activeBox,
    handleSelectBox,
    hideBoxZero = false,
}: BoxesProps) {
    const styles = useBoxCarouselStyles();
    const { width } = useWindowDimensions();

    const items = useMemo(() => {
        const keys = Object.keys(boxes ?? {}) as (keyof BoxesState)[];
        const filtered = hideBoxZero ? keys.filter((k) => k !== "boxZero") : keys;
        return filtered.map((key) => ({ key, count: boxes[key]?.length ?? 0 }));
    }, [boxes, hideBoxZero]);

    const baseSize = Math.min(150, Math.max(120, width * 0.34));
    const itemGap = baseSize * 0.5;
    const itemWidth = baseSize + itemGap;
    const spacerWidth = Math.max((width - itemWidth) / 2, 0);

    const initialIndex = useMemo(() => {
        if (!items.length) return 0;
        if (!activeBox) return Math.max(0, Math.floor(items.length / 2));
        const idx = items.findIndex((i) => i.key === activeBox);
        return idx >= 0 ? idx : Math.max(0, Math.floor(items.length / 2));
    }, [activeBox, items]);

    const scrollX = useRef(new Animated.Value(initialIndex * itemWidth)).current;
    const flatListRef =
        useRef<Animated.FlatList<{ key: keyof BoxesState; count: number }>>(null);
    const lastSelectedRef = useRef<keyof BoxesState | null>(activeBox);
    const prevItemWidthRef = useRef(itemWidth);
    const [activeIndex, setActiveIndex] = useState(initialIndex);
    const [faces, setFaces] = useState<FaceState>({});
    const prevActiveIndexRef = useRef<number | null>(null);
    const faceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const widthChanged = prevItemWidthRef.current !== itemWidth;
        prevItemWidthRef.current = itemWidth;

        if (!items.length) return;
        if (!widthChanged && activeBox && activeBox === lastSelectedRef.current)
            return;

        const fallbackIdx = Math.max(0, Math.floor(items.length / 2));
        const targetIdx = activeBox
            ? items.findIndex((i) => i.key === activeBox)
            : fallbackIdx;
        const resolvedIdx = targetIdx >= 0 ? targetIdx : fallbackIdx;

        flatListRef.current?.scrollToOffset({
            offset: resolvedIdx * itemWidth,
            animated: false,
        });
        scrollX.setValue(resolvedIdx * itemWidth);
        setActiveIndex(resolvedIdx);
        lastSelectedRef.current = activeBox ?? null;
    }, [activeBox, itemWidth, items, scrollX]);

    const handleMomentumEnd = (
        event: NativeSyntheticEvent<NativeScrollEvent>
    ) => {
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

    if (!items.length) {
        return <View style={styles.container} />;
    }

    return (
        <View style={styles.container}>
            <Animated.FlatList
                ref={flatListRef}
                data={items}
                keyExtractor={(item) => String(item.key)}
                horizontal
                showsHorizontalScrollIndicator={false}
                bounces={false}
                snapToInterval={itemWidth}
                snapToAlignment="start"
                decelerationRate="fast"
                onMomentumScrollEnd={handleMomentumEnd}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: true }
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
                        outputRange: [0.9, 2.5, 0.9],
                        extrapolate: "clamp",
                    });
                    const translateY = scrollX.interpolate({
                        inputRange,
                        outputRange: [16, -18, 16],
                        extrapolate: "clamp",
                    });
                    const counterTranslateY = scrollX.interpolate({
                        inputRange,
                        outputRange: [0, 28, 0],
                        extrapolate: "clamp",
                    });
                    const isActive = index === activeIndex;
                    const face =
                        faces[item.key] ?? (isActive ? "happy" : "smile");

                    return (
                        <View
                            style={{
                                width: itemWidth,
                                alignItems: "center",
                                justifyContent: "flex-start",
                                paddingVertical: 22,
                            }}
                        >
                            <Animated.View
                                style={{
                                    alignItems: "center",
                                    justifyContent: "center",
                                    transform: [{ scale }, { translateY }],
                                }}
                            >
                                <TouchableOpacity
                                    activeOpacity={1}
                                    onPress={() => scrollToIndex(index)}
                                >
                                    <BoxSkin
                                        wordCount={item.count}
                                        face={face}
                                        isActive={isActive}
                                        isCaro
                                    />
                                </TouchableOpacity>
                            </Animated.View>
                            <Animated.View
                                style={{
                                    alignItems: "center",
                                    marginTop: 14,
                                    minHeight: 32,
                                    transform: [{ translateY: counterTranslateY }],
                                }}
                            >
                                <Text
                                    style={[
                                        styles.number,
                                        styles.numberUpdate,
                                        { opacity: isActive ? 1 : 0.7 },
                                    ]}
                                >
                                    {item.count}
                                </Text>
                            </Animated.View>
                        </View>
                    );
                }}
            />
        </View>
    );
}
