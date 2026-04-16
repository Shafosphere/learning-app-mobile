import { BoxesState } from "@/src/types/boxes";
import { CoachmarkAnchor } from "@edwardloopez/react-native-coachmark";
import React, { useEffect, useRef, useState } from "react";
import { Pressable, Text, View, type LayoutChangeEvent } from "react-native";
import BoxSkin from "../Skin/BoxSkin";
import { useBoxListStyles } from "./BoxList.styles";

interface BoxesProps {
    boxes: BoxesState;
    activeBox: keyof BoxesState | null;
    handleSelectBox: (name: keyof BoxesState) => void;
    hideBoxZero?: boolean;
    onBoxLongPress?: (name: keyof BoxesState) => void;
    disabled?: boolean;
    countOverrides?: Partial<Record<keyof BoxesState, number>>;
}

export default function BoxList({
    boxes,
    activeBox,
    handleSelectBox,
    hideBoxZero = false,
    onBoxLongPress,
    disabled = false,
    countOverrides,
}: BoxesProps) {
    const styles = useBoxListStyles();
    type Face = "smile" | "happy" | "surprised";

    const [faces, setFaces] = useState<Partial<Record<keyof BoxesState, Face>>>(
        {}
    );
    const timersRef = useRef<
        Partial<Record<keyof BoxesState, ReturnType<typeof setTimeout>>>
    >({});
    const activeBoxRef = useRef<typeof activeBox>(activeBox);
    const longPressTriggeredRef = useRef(false);
    const [measuredBoxes, setMeasuredBoxes] = useState<
        Partial<Record<"boxOne" | "boxTwo", { x: number; y: number; width: number; height: number }>>
    >({});

    useEffect(() => {
        activeBoxRef.current = activeBox;
    }, [activeBox]);

    useEffect(() => {
        const timers = timersRef.current;
        return () => {
            Object.values(timers).forEach((t) => {
                if (t) clearTimeout(t);
            });
        };
    }, []);

    const entries = Object.entries(boxes) as [
        keyof BoxesState,
        BoxesState[keyof BoxesState]
    ][];
    const displayedEntries = hideBoxZero
        ? entries.filter(([boxName]) => boxName !== "boxZero")
        : entries;
    const boxOneLayout = measuredBoxes.boxOne;
    const boxTwoLayout = measuredBoxes.boxTwo;
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

    const handleMeasuredBoxLayout =
        (boxName: "boxOne" | "boxTwo") => (event: LayoutChangeEvent) => {
            const { x, y, width, height } = event.nativeEvent.layout;
            setMeasuredBoxes((prev) => {
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

    return (
        <View style={styles.container}>
            <View style={styles.containerTop}>
                {displayedEntries.map(([boxName, words]) => {
                    const wordCount = countOverrides?.[boxName] ?? words.length;
                    const storedFace = faces[boxName];
                    const isActive = activeBox === boxName;
                    const currentFace: Face =
                        storedFace === "surprised"
                            ? "surprised"
                            : isActive
                                ? "happy"
                                : "smile";

                    const onPress = () => {
                        if (disabled) {
                            return;
                        }
                        if (longPressTriggeredRef.current) {
                            longPressTriggeredRef.current = false;
                            return;
                        }
                        setFaces((prev) => ({ ...prev, [boxName]: "surprised" }));

                        handleSelectBox(boxName);

                        if (timersRef.current[boxName]) {
                            clearTimeout(timersRef.current[boxName]!);
                        }
                        timersRef.current[boxName] = setTimeout(() => {
                            setFaces((prev) => {
                                const next = { ...prev };
                                delete next[boxName];
                                return next;
                            });
                        }, 500);
                    };

                    return (
                        <View
                            key={boxName}
                            onLayout={
                                boxName === "boxOne" || boxName === "boxTwo"
                                    ? handleMeasuredBoxLayout(boxName)
                                    : undefined
                            }
                        >
                            <Pressable
                                disabled={disabled}
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
                                onPress={onPress}
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
                                            <BoxSkin
                                                wordCount={wordCount}
                                                face={currentFace}
                                                isActive={activeBox === boxName}
                                                isCaro={false}
                                            />
                                        </View>
                                    </CoachmarkAnchor>
                                ) : (
                                    <BoxSkin
                                        wordCount={wordCount}
                                        face={currentFace}
                                        isActive={activeBox === boxName}
                                        isCaro={false}
                                    />
                                )}
                                {boxName === "boxOne" ? (
                                    <CoachmarkAnchor
                                        id="flashcards-box-one-count"
                                        shape="rect"
                                        radius={12}
                                    >
                                        <Text style={styles.boxWords}>{wordCount}</Text>
                                    </CoachmarkAnchor>
                                ) : (
                                    <Text style={styles.boxWords}>{wordCount}</Text>
                                )}
                            </Pressable>
                        </View>
                    );
                })}
                {shouldRenderPromotionAnchor ? (
                    <CoachmarkAnchor
                        id="flashcards-promotion-arrow-anchor"
                        shape="rect"
                        radius={12}
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
                        <View />
                    </CoachmarkAnchor>
                ) : null}
            </View>
        </View>
    );
}
