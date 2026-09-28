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
const GRID_VIEWPORT_HORIZONTAL_INSET = 48;
const MAX_GRID_BOX_ITEM_WIDTH = 210;
const MAX_GRID_BOX_SCALE = 1.55;
const GRID_BOX_VERTICAL_EXTRA = 44;
export const CLASSIC_BOX_WIDTH = BOX_SKIN_WIDTH;
export const PREFERRED_CLASSIC_COLUMNS = 3;

const BOX_NUMBERS: Record<keyof BoxesState, number> = {
    boxZero: 0,
    boxOne: 1,
    boxTwo: 2,
    boxThree: 3,
    boxFour: 4,
    boxFive: 5,
};

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

export type ClassicBoxLayout = {
    columns: number;
    scale: number;
    itemWidth: number;
};

export function getClassicBoxLayout(availableWidth: number): ClassicBoxLayout {
    const requiredWidth = CLASSIC_BOX_WIDTH * PREFERRED_CLASSIC_COLUMNS;
    const scale = Math.min(1, Math.max(0, availableWidth / requiredWidth));

    return {
        columns: PREFERRED_CLASSIC_COLUMNS,
        scale,
        itemWidth: CLASSIC_BOX_WIDTH * scale,
    };
}

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
    layoutWidth?: number;
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
    layoutWidth,
}: BoxesProps) {
    const styles = useBoxListStyles();
    const { t } = useTranslation();
    const { width: windowWidth } = useWindowDimensions();
    const longPressTriggeredRef = useRef(false);
    const [viewportWidth, setViewportWidth] = useState<number | null>(null);
    const [rowOffsets, setRowOffsets] = useState<Record<number, { x: number; y: number }>>({});
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
    const explicitGrid = maxColumns != null;
    // Explicit tablet grids own their max width; responsive classic grids use
    // the outer viewport width so phone insets are accounted for without
    // feeding the grid's own maxWidth back into its sizing.
    const effectiveLayoutWidth = explicitGrid
        ? layoutWidth ?? viewportWidth ?? windowWidth
        : viewportWidth ?? layoutWidth ?? windowWidth;
    const classicLayout = getClassicBoxLayout(effectiveLayoutWidth);
    const shouldUseHorizontalScroll = horizontalScroll;
    const effectiveHorizontalViewportWidth = Math.max(
        BOX_ITEM_WIDTH,
        effectiveLayoutWidth
    );
    const horizontalSidePadding = shouldUseHorizontalScroll
        ? Math.max(0, (effectiveHorizontalViewportWidth - BOX_ITEM_WIDTH) / 2)
        : 0;
    const gridColumns =
        !shouldUseHorizontalScroll
            ? explicitGrid
                ? Math.max(1, Math.floor(maxColumns))
                : classicLayout.columns
            : null;
    const availableGridWidth = Math.max(
        0,
        effectiveLayoutWidth - GRID_VIEWPORT_HORIZONTAL_INSET
    );
    const gridItemWidth = gridColumns
        ? explicitGrid
            ? clamp(
                availableGridWidth / gridColumns,
                GRID_BOX_ITEM_WIDTH,
                MAX_GRID_BOX_ITEM_WIDTH
            )
            : classicLayout.itemWidth
        : GRID_BOX_ITEM_WIDTH;
    const gridBoxScale = gridColumns
        ? explicitGrid
            ? clamp(
                (gridItemWidth / GRID_BOX_ITEM_WIDTH) * GRID_BOX_SCALE,
                GRID_BOX_SCALE,
                MAX_GRID_BOX_SCALE
            )
            : classicLayout.scale
        : GRID_BOX_SCALE;
    const gridItemMinHeight =
        Math.ceil(BOX_SKIN_HEIGHT * gridBoxScale) + GRID_BOX_VERTICAL_EXTRA;
    const gridWidth = gridColumns ? gridItemWidth * gridColumns : undefined;
    const gridRows = [];
    if (gridColumns) {
        for (let i = 0; i < displayedEntries.length; i += gridColumns) {
            gridRows.push(displayedEntries.slice(i, i + gridColumns));
        }
    }
    // Item onLayout coordinates are relative to their explicit row. Tutorial
    // anchors need coordinates relative to the entire grid, including row two.
    const getItemLayout = (boxName: keyof BoxesState) => {
        const item = measuredBoxItems[boxName];
        if (!item || !gridColumns) return item;
        const index = displayedEntries.findIndex(([name]) => name === boxName);
        const offset = rowOffsets[Math.floor(index / gridColumns)];
        if (!offset) return undefined;
        return { ...item, x: item.x + offset.x, y: item.y + offset.y };
    };
    const boxOneLayout = getItemLayout("boxOne");
    const boxTwoLayout = getItemLayout("boxTwo");
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
            const itemLayout = getItemLayout(boxName);
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
        const boxScale = shouldUseHorizontalScroll
            ? HORIZONTAL_BOX_SCALE
            : gridColumns
              ? gridBoxScale
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
                    shouldUseHorizontalScroll ? styles.horizontalBoxItem : null,
                    gridColumns ? styles.gridBoxItem : null,
                    gridColumns
                        ? {
                            width: gridItemWidth,
                            minHeight: gridItemMinHeight,
                        }
                        : null,
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
            testID="box-list-grid"
            style={[styles.containerTop, gridWidth ? { maxWidth: gridWidth } : null]}
            onLayout={handleContainerLayout}
        >
            {gridRows.map((row, index) => (
                <View
                    key={row[0][0]}
                    testID={`box-list-row-${index}`}
                    style={styles.gridRow}
                    onLayout={({ nativeEvent: { layout: { x, y } } }) => {
                        setRowOffsets((prev) =>
                            prev[index]?.x === x && prev[index]?.y === y
                                ? prev
                                : { ...prev, [index]: { x, y } }
                        );
                    }}
                >
                    {row.map(renderBoxItem)}
                </View>
            ))}
            {coachmarkAnchors}
        </View>
    );

    return (
        <View
            testID="box-list-viewport"
            style={styles.container}
            onLayout={(event) => {
                const { width } = event.nativeEvent.layout;
                setViewportWidth(width);
            }}
        >
            {shouldUseHorizontalScroll ? (
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
