// BoxesCarousel.tsx
import React, {
  useMemo,
  useRef,
  useCallback,
  useState,
  useEffect,
} from "react";
import {
  View,
  Image,
  Pressable,
  Animated,
  FlatList,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Text,
} from "react-native";
import { useStyles } from "./styles_carousel";
import { BoxesState } from "@/src/types/boxes";

import BoxTop from "../../../assets/box/topBox.png";
import BoxBottom from "../../../assets/box/bottomBox.png";

interface BoxesProps {
  boxes: BoxesState;
  activeBox: keyof BoxesState | null;
  handleSelectBox: (name: keyof BoxesState) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ITEM_WIDTH = Math.round(SCREEN_WIDTH * 0.3);
const SPACING = 40;
const CELL_WIDTH = ITEM_WIDTH + SPACING;

export default function BoxesCarousel({
  boxes,
  activeBox,
  handleSelectBox,
}: BoxesProps) {
  const styles = useStyles();

  const data = useMemo(
    () => Object.keys(boxes || {}).map((k) => ({ key: k as keyof BoxesState })),
    [boxes]
  );

  const initialIndex = useMemo(() => {
    if (!activeBox) return 0;
    const idx = data.findIndex((d) => d.key === activeBox);
    return idx >= 0 ? idx : 0;
  }, [activeBox, data]);

  const [activeIdx, setActiveIdx] = useState<number>(initialIndex);

  useEffect(() => setActiveIdx(initialIndex), [initialIndex]);

  const scrollX = useRef(new Animated.Value(0)).current;
  const listRef = useRef<FlatList>(null);
  const [boxH, setBoxH] = useState(0);

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const idx = Math.round(x / CELL_WIDTH);
      const item = data[idx];
      if (item && item.key !== activeBox) handleSelectBox(item.key);
    },
    [activeBox, data, handleSelectBox]
  );

  const scrollToIndex = useCallback((index: number) => {
    listRef.current?.scrollToIndex({ index, animated: true });
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: { key: keyof BoxesState }; index: number }) => {
      const boxContent = boxes[item.key];
      const inputRange = [
        (index - 1) * CELL_WIDTH,
        index * CELL_WIDTH,
        (index + 1) * CELL_WIDTH,
      ];

      const scale = scrollX.interpolate({
        inputRange,
        outputRange: [0.9, 2.0, 0.9],
        extrapolate: "clamp",
      });

      const opacity = scrollX.interpolate({
        inputRange,
        outputRange: [0.6, 1.0, 0.6],
        extrapolate: "clamp",
      });

      const translateY = scrollX.interpolate({
        inputRange,
        outputRange: [
          ((1 - 0.9) * boxH) / 1,
          ((1 - 2.0) * boxH) / 6,
          ((1 - 0.9) * boxH) / 1,
        ],
        extrapolate: "clamp",
      });

      const layer = Math.max(0, 3 - Math.abs(activeIdx - index));
      const isActive = index === activeIdx;

      return (
        <View
          style={{
            width: CELL_WIDTH,
            zIndex: layer,
            overflow: "visible",
            alignItems: "center",
            justifyContent: "center",
            // backgroundColor: '#ff00d4ff'
          }}
        >
          <Animated.View
            onLayout={(e) => setBoxH(e.nativeEvent.layout.height)} // <-- pomiar H
            style={[{ transform: [{ scale }, { translateY }], opacity }]}
          >
            <Pressable
              onPress={() => scrollToIndex(index)}
              style={[styles.containerSkin, isActive && styles.activeBox]}
            >
              <Image source={BoxTop} style={styles.skin} />
              <Image source={BoxBottom} style={styles.skin} />
            </Pressable>
          </Animated.View>
          <Animated.Text style={[styles.number, { opacity }]}>
            {boxContent.length}
          </Animated.Text>
        </View>
      );
    },
    [
      activeIdx,
      scrollX,
      styles.activeBox,
      styles.containerSkin,
      styles.skin,
      boxes,
    ]
  );

  return (
    <View style={styles.container}>
      <Animated.FlatList
        ref={listRef}
        bounces={true}
        data={data}
        keyExtractor={(i) => String(i.key)}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: Math.max(
            0,
            (SCREEN_WIDTH - ITEM_WIDTH) / 2 - SPACING / 2
          ),
          // alignItems: "center",
          // paddingTop: 70,
          // gap: 20,
        }}
        decelerationRate="fast"
        onMomentumScrollEnd={onMomentumEnd}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          {
            useNativeDriver: true,
            listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
              const x = e.nativeEvent.contentOffset.x;
              const idx = Math.round(x / CELL_WIDTH);
              if (idx !== activeIdx) setActiveIdx(idx);
            },
          }
        )}
        initialScrollIndex={initialIndex}
        getItemLayout={(_d, index) => ({
          length: CELL_WIDTH,
          offset: CELL_WIDTH * index,
          index,
        })}
      />
    </View>
  );
}
