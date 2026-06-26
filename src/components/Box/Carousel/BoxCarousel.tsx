// BoxCarousel.tsx
import { useDeviceLayout } from "@/src/hooks/useDeviceLayout";
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
import { resolveBoxFace, type BoxFacesByBox } from "../Skin/boxFaces";
import { useBoxCarouselStyles } from "./BoxCarousel.styles";

interface BoxesProps {
    boxes: BoxesState;
    activeBox: keyof BoxesState | null;
    handleSelectBox: (name: keyof BoxesState) => void;
    hideBoxZero?: boolean;
    onBoxLongPress?: (name: keyof BoxesState) => void;
    disabled?: boolean;
    countOverrides?: Partial<Record<keyof BoxesState, number>>;
    faces?: BoxFacesByBox;
    layoutWidth?: number;
    bottomClearance?: number;
}

export default function BoxCarousel({
    boxes,
    activeBox,
    handleSelectBox,
    hideBoxZero = false,
    onBoxLongPress,
    disabled = false,
    countOverrides,
    faces,
    layoutWidth,
    bottomClearance = 0,
}: BoxesProps) {
  const styles = useBoxCarouselStyles();
  const { width } = useWindowDimensions();
  const { isSmallPhoneLayout } = useDeviceLayout();
  const effectiveLayoutWidth = layoutWidth ?? width;
  const BOX_SKIN_HEIGHT = 122;
  const ACTIVE_BOX_SCALE = isSmallPhoneLayout ? 1.3 : 2.05;
  const INACTIVE_BOX_SCALE = isSmallPhoneLayout ? 0.72 : 0.9;
  const ACTIVE_BOX_LIFT = isSmallPhoneLayout ? 2 : 12;
  const INACTIVE_BOX_LIFT = isSmallPhoneLayout ? 4 : 14;
  const BOX_STAGE_VERTICAL_PADDING = isSmallPhoneLayout ? 6 : 40;
  const LIST_VERTICAL_PADDING = isSmallPhoneLayout ? 4 : 14;
  const ACTIVE_COUNTER_WRAP_STYLE = isSmallPhoneLayout
    ? { minHeight: 36, marginTop: -4 }
    : null;
  const ACTIVE_COUNTER_NUMBER_STYLE = isSmallPhoneLayout
    ? { fontSize: 30, lineHeight: 34 }
    : null;
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

    const baseSize = isSmallPhoneLayout
        ? Math.min(118, Math.max(92, effectiveLayoutWidth * 0.3))
        : Math.min(150, Math.max(120, effectiveLayoutWidth * 0.34));
    const itemGap = baseSize * 0.5;
    const itemWidth = baseSize + itemGap;
    const spacerWidth = Math.max((effectiveLayoutWidth - itemWidth) / 2, 0);
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
        <View
            style={[
                styles.container,
                bottomClearance > 0 ? { paddingBottom: bottomClearance } : null,
            ]}
        >
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
                        paddingVertical: LIST_VERTICAL_PADDING,
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
                            outputRange: [
                                INACTIVE_BOX_SCALE,
                                ACTIVE_BOX_SCALE,
                                INACTIVE_BOX_SCALE,
                            ],
                            extrapolate: "clamp",
                        });
                        const translateY = scrollX.interpolate({
                            inputRange,
                            outputRange: [
                                INACTIVE_BOX_LIFT,
                                -ACTIVE_BOX_LIFT,
                                INACTIVE_BOX_LIFT,
                            ],
                            extrapolate: "clamp",
                        });
                        const isActive = index === activeIndex;
                        const face =
                            faces?.[item.key] ??
                            resolveBoxFace({
                                isActive,
                            });

                        const boxContent =
                            item.key === "boxOne" || item.key === "boxTwo" ? (
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
                            );

                        return (
                            <View style={[styles.itemContainer, { width: itemWidth }]}>
                                <View
                                    style={[
                                        styles.boxStage,
                                        { height: BOX_STAGE_HEIGHT },
                                    ]}
                                >
                                    <Animated.View
                                        style={{
                                            transform: [{ scale }, { translateY }],
                                        }}
                                    >
                                        {boxContent}
                                    </Animated.View>
                                </View>
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
            <View style={[styles.activeCounterWrap, ACTIVE_COUNTER_WRAP_STYLE]}>
                {items[activeIndex]?.key === "boxOne" ? (
                    <CoachmarkAnchor
                        id="flashcards-box-one-count"
                        shape="rect"
                        radius={12}
                    >
                        <Text
                            style={[
                                styles.number,
                                styles.numberUpdate,
                                ACTIVE_COUNTER_NUMBER_STYLE,
                            ]}
                        >
                            {activeCount}
                        </Text>
                    </CoachmarkAnchor>
                ) : (
                    <Text
                        style={[
                            styles.number,
                            styles.numberUpdate,
                            ACTIVE_COUNTER_NUMBER_STYLE,
                        ]}
                    >
                        {activeCount}
                    </Text>
                )}
            </View>
        </View>
    );
}
