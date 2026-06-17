import { BoxesState } from "@/src/types/boxes";
import { CoachmarkAnchor } from "@edwardloopez/react-native-coachmark";
import React, { useRef, useState } from "react";
import {
    Pressable,
    ScrollView,
    Text,
    View,
    useWindowDimensions,
    type LayoutChangeEvent,
} from "react-native";
import { useTranslation } from "react-i18next";
import BoxSkin from "../Skin/BoxSkin";
import { resolveBoxFace, type BoxFacesByBox } from "../Skin/boxFaces";
import { useBoxListStyles } from "./BoxList.styles";

const BOX_SKIN_WIDTH = 115;
const BOX_SKIN_HEIGHT = 122;
const HORIZONTAL_BOX_SCALE = 1.2;
const GRID_BOX_SCALE = 1.2;
const BOX_ITEM_WIDTH = 164;
const GRID_BOX_ITEM_WIDTH = 150;
const BOX_ITEM_HEIGHT = 210;
const HORIZONTAL_VIEWPORT_SCREEN_INSET = 24;

const BOX_NUMBERS: Record<keyof BoxesState, number> = {
    boxZero: 0,
    boxOne: 1,
    boxTwo: 2,
    boxThree: 3,
    boxFour: 4,
    boxFive: 5,
};

interface BoxesProps {
    boxes: BoxesState;
    activeBox: keyof BoxesState | null;
    handleSelectBox: (name: keyof BoxesState) => void;
    hideBoxZero?: boolean;
    onBoxLongPress?: (name: keyof BoxesState) => void;
    disabled?: boolean;
    countOverrides?: Partial<Record<keyof BoxesState, number>>;
    countsCoachmarkId?: string;
    faces?: BoxFacesByBox;
    horizontalScroll?: boolean;
    maxColumns?: number;
}

export default function BoxList({
    boxes,
    activeBox,
    handleSelectBox,
    hideBoxZero = false,
    onBoxLongPress,
    disabled = false,
    countOverrides,
    countsCoachmarkId,
    faces,
    horizontalScroll = false,
    maxColumns,
}: BoxesProps) {
    const styles = useBoxListStyles();
    const { t } = useTranslation();
    const { width: windowWidth } = useWindowDimensions();
    const longPressTriggeredRef = useRef(false);
    const [measuredBoxItems, setMeasuredBoxItems] = useState<
        Partial<Record<keyof BoxesState, { x: number; y: number; width: number; height: number }>>
    >({});
    const [containerLayout, setContainerLayout] = useState<{
        width: number;
        height: number;
    } | null>(null);
    const [measuredCounts, setMeasuredCounts] = useState<
        Partial<Record<keyof BoxesState, { x: number; y: number; width: number; height: number }>>
    >({});
    const [measuredPressables, setMeasuredPressables] = useState<
        Partial<Record<keyof BoxesState, { x: number; y: number }>>
    >({});

    const entries = Object.entries(boxes) as [
        keyof BoxesState,
        BoxesState[keyof BoxesState]
    ][];
    const displayedEntries = hideBoxZero
        ? entries.filter(([boxName]) => boxName !== "boxZero")
        : entries;
    const effectiveHorizontalViewportWidth = Math.max(
        BOX_ITEM_WIDTH,
        windowWidth - HORIZONTAL_VIEWPORT_SCREEN_INSET
    );
    const horizontalSidePadding = horizontalScroll
        ? Math.max(0, (effectiveHorizontalViewportWidth - BOX_ITEM_WIDTH) / 2)
        : 0;
    const gridColumns =
        !horizontalScroll && maxColumns != null
            ? Math.max(1, Math.floor(maxColumns))
            : null;
    const gridWidth = gridColumns ? GRID_BOX_ITEM_WIDTH * gridColumns : undefined;
    const boxOneLayout = measuredBoxItems.boxOne;
    const boxTwoLayout = measuredBoxItems.boxTwo;
    const shouldRenderPromotionAnchor = boxOneLayout != null && boxTwoLayout != null;
    const promotionArrowLeft = shouldRenderPromotionAnchor
        ? boxOneLayout.x +
          boxOneLayout.width +
          (boxTwoLayout.x - (boxOneLayout.x + boxOneLayout.width)) / 2 -
          0.5
        : 0;
    const promotionArrowTop = shouldRenderPromotionAnchor
        ? Math.min(boxOneLayout.y, boxTwoLayout.y) - 10
        : 0;

    const handleMeasuredBoxItemLayout =
        (boxName: keyof BoxesState) => (event: LayoutChangeEvent) => {
            const { x, y, width, height } = event.nativeEvent.layout;
            setMeasuredBoxItems((prev) => {
                const current = prev[boxName];
                if (
                    current &&
                    current.x === x &&
                    current.y === y &&
                    current.width === width &&
                    current.height === height
                ) {
                    return prev;
                }
                return {
                    ...prev,
                    [boxName]: { x, y, width, height },
                };
            });
        };

    const handleMeasuredCountLayout =
        (boxName: keyof BoxesState) => (event: LayoutChangeEvent) => {
            const { x, y, width, height } = event.nativeEvent.layout;
            setMeasuredCounts((prev) => {
                const current = prev[boxName];
                if (
                    current &&
                    current.x === x &&
                    current.y === y &&
                    current.width === width &&
                    current.height === height
                ) {
                    return prev;
                }
                return {
                    ...prev,
                    [boxName]: { x, y, width, height },
                };
            });
        };
    const handleMeasuredPressableLayout =
        (boxName: keyof BoxesState) => (event: LayoutChangeEvent) => {
            const { x, y } = event.nativeEvent.layout;
            setMeasuredPressables((prev) => {
                const current = prev[boxName];
                if (current && current.x === x && current.y === y) {
                    return prev;
                }
                return {
                    ...prev,
                    [boxName]: { x, y },
                };
            });
        };

    const countRects = displayedEntries
        .map(([boxName]) => {
            const itemLayout = measuredBoxItems[boxName];
            const countLayout = measuredCounts[boxName];
            const pressableLayout = measuredPressables[boxName];
            if (!itemLayout || !countLayout || !pressableLayout) {
                return null;
            }

            return {
                x: itemLayout.x + pressableLayout.x + countLayout.x,
                y: itemLayout.y + pressableLayout.y + countLayout.y,
                width: countLayout.width,
                height: countLayout.height,
            };
        })
        .filter((value): value is { x: number; y: number; width: number; height: number } => value != null);
    const countsAnchorFrame =
        countRects.length > 0
            ? {
                left: Math.min(...countRects.map((rect) => rect.x)) - 4,
                top: Math.min(...countRects.map((rect) => rect.y)) - 4,
                right: Math.max(...countRects.map((rect) => rect.x + rect.width)) + 4,
                bottom: Math.max(...countRects.map((rect) => rect.y + rect.height)) + 4,
            }
            : null;

    const renderBoxItem = ([boxName, words]: [
        keyof BoxesState,
        BoxesState[keyof BoxesState]
    ]) => {
        const wordCount = countOverrides?.[boxName] ?? words.length;
        const isActive = activeBox === boxName;
        const currentFace =
            faces?.[boxName] ??
            resolveBoxFace({
                isActive,
            });
        const boxNumber = BOX_NUMBERS[boxName];
        const accessibilityLabel = t("flashcards.card.box.accessibilityLabel", {
            box: boxNumber,
            count: wordCount,
        });
        const boxSkin = (
            <BoxSkin
                wordCount={wordCount}
                face={currentFace}
                isActive={activeBox === boxName}
                isCaro={false}
            />
        );
        const boxScale = horizontalScroll
            ? HORIZONTAL_BOX_SCALE
            : gridColumns
              ? GRID_BOX_SCALE
              : 1;
        const scaledBoxSkin = boxScale !== 1 ? (
            <View
                style={{
                    width: BOX_SKIN_WIDTH * boxScale,
                    height: BOX_SKIN_HEIGHT * boxScale,
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <View style={{ transform: [{ scale: boxScale }] }}>
                    {boxSkin}
                </View>
            </View>
        ) : (
            boxSkin
        );

        return (
            <View
                key={boxName}
                testID={`box-list-item-${boxName}`}
                style={[
                    horizontalScroll ? styles.horizontalBoxItem : null,
                    gridColumns ? styles.gridBoxItem : null,
                ]}
                onLayout={handleMeasuredBoxItemLayout(boxName)}
            >
                <Pressable
                    disabled={disabled}
                    onLayout={handleMeasuredPressableLayout(boxName)}
                    onPressIn={() => {
                        if (disabled) return;
                        longPressTriggeredRef.current = false;
                    }}
                    onLongPress={() => {
                        if (disabled) return;
                        longPressTriggeredRef.current = true;
                        onBoxLongPress?.(boxName);
                    }}
                    delayLongPress={400}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={accessibilityLabel}
                    accessibilityState={{
                        selected: isActive,
                        disabled,
                    }}
                    onPress={() => {
                        if (disabled) {
                            return;
                        }
                        if (longPressTriggeredRef.current) {
                            longPressTriggeredRef.current = false;
                            return;
                        }
                        handleSelectBox(boxName);
                    }}
                >
                    {boxName === "boxOne" || boxName === "boxTwo" ? (
                        <CoachmarkAnchor
                            id={
                                boxName === "boxOne"
                                    ? "flashcards-box-one"
                                    : "flashcards-box-two"
                            }
                            shape="rect"
                            radius={24}
                        >
                            <View collapsable={false}>
                                {scaledBoxSkin}
                            </View>
                        </CoachmarkAnchor>
                    ) : (
                        scaledBoxSkin
                    )}
                    {boxName === "boxOne" ? (
                        <CoachmarkAnchor
                            id="flashcards-box-one-count"
                            shape="rect"
                            radius={12}
                        >
                            <Text
                                style={styles.boxWords}
                                onLayout={handleMeasuredCountLayout(boxName)}
                            >
                                {wordCount}
                            </Text>
                        </CoachmarkAnchor>
                    ) : (
                        <Text
                            style={styles.boxWords}
                            onLayout={handleMeasuredCountLayout(boxName)}
                        >
                            {wordCount}
                        </Text>
                    )}
                </Pressable>
            </View>
        );
    };

    const handleContainerLayout = (event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        setContainerLayout((current) => {
            if (
                current &&
                current.width === width &&
                current.height === height
            ) {
                return current;
            }
            return { width, height };
        });
    };

    const coachmarkAnchors = (
        <>
            {shouldRenderPromotionAnchor ? (
                <CoachmarkAnchor
                    id="flashcards-promotion-arrow-anchor"
                    shape="rect"
                    radius={12}
                    pointerEvents="none"
                    style={[
                        styles.hiddenPromotionAnchor,
                        {
                            left: promotionArrowLeft,
                            top: promotionArrowTop,
                            width: 1,
                            height: 1,
                        },
                    ]}
                >
                    <View pointerEvents="none" />
                </CoachmarkAnchor>
            ) : null}
            {countsCoachmarkId && countsAnchorFrame && containerLayout ? (
                <CoachmarkAnchor
                    id={countsCoachmarkId}
                    shape="rect"
                    radius={12}
                    pointerEvents="none"
                    style={[
                        styles.hiddenCountsAnchor,
                        {
                            left: Math.max(0, countsAnchorFrame.left),
                            top: Math.max(0, countsAnchorFrame.top),
                            width: Math.min(
                                containerLayout.width,
                                countsAnchorFrame.right - countsAnchorFrame.left
                            ),
                            height: Math.min(
                                containerLayout.height,
                                countsAnchorFrame.bottom - countsAnchorFrame.top
                            ),
                        },
                    ]}
                >
                    <View pointerEvents="none" />
                </CoachmarkAnchor>
            ) : null}
        </>
    );

    const boxesRow = (
        <View
            style={[styles.containerTop, gridWidth ? { maxWidth: gridWidth } : null]}
            onLayout={handleContainerLayout}
        >
            {displayedEntries.map(renderBoxItem)}
            {coachmarkAnchors}
        </View>
    );

    return (
        <View style={styles.container}>
            {horizontalScroll ? (
                <View
                    style={[
                        styles.containerTopHorizontal,
                        { width: effectiveHorizontalViewportWidth },
                    ]}
                    onLayout={handleContainerLayout}
                >
                    <ScrollView
                        horizontal
                        style={styles.horizontalScrollViewport}
                        showsHorizontalScrollIndicator={false}
                        bounces={false}
                        scrollEnabled={!disabled}
                        nestedScrollEnabled
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.horizontalScrollContent}>
                            <View
                                style={[
                                    styles.horizontalDebugHeader,
                                    { width: horizontalSidePadding, height: BOX_ITEM_HEIGHT },
                                ]}
                            />
                            {displayedEntries.map(renderBoxItem)}
                            <View
                                style={[
                                    styles.horizontalDebugFooter,
                                    { width: horizontalSidePadding, height: BOX_ITEM_HEIGHT },
                                ]}
                            />
                            {coachmarkAnchors}
                        </View>
                    </ScrollView>
                </View>
            ) : (
                boxesRow
            )}
        </View>
    );
}
