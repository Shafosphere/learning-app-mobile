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
  // Image,
  // Pressable,
  FlatList,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  // Text,
} from "react-native";
import { useStyles } from "./boxes-styles";
import { BoxesState } from "@/src/types/boxes";
import BoxCarouselItem from "./boxCarouselItem";
// import BoxTop from "@/assets/illustrations/box/topBox.png";
// import BoxBottom from "@/assets/illustrations/box/bottomBox.png";

interface BoxesProps {
  boxes: BoxesState;
  activeBox: keyof BoxesState | null;
  handleSelectBox: (name: keyof BoxesState) => void;
  hideBoxZero?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ITEM_WIDTH = Math.round(SCREEN_WIDTH * 0.3);
const SPACING = 40;
const CELL_WIDTH = ITEM_WIDTH + SPACING;

export default function BoxesCarousel({
  boxes,
  activeBox,
  handleSelectBox,
  hideBoxZero = false,
}: BoxesProps) {
  const styles = useStyles();
  const listRef = useRef<FlatList>(null);

  const data = useMemo(() => {
    const keys = Object.keys(boxes ?? {}) as (keyof BoxesState)[];
    const filtered = hideBoxZero ? keys.filter((k) => k !== "boxZero") : keys;
    return filtered.map((k) => ({ key: k }));
  }, [boxes, hideBoxZero]);

  const initialIndex = useMemo(() => {
    if (!activeBox) return 0;
    const idx = data.findIndex((d) => d.key === activeBox);
    return idx >= 0 ? idx : 0;
  }, [activeBox, data]);

  const [activeIdx, setActiveIdx] = useState<number>(initialIndex);

  useEffect(() => setActiveIdx(initialIndex), [initialIndex]);

  useEffect(() => {
    scrollToIndex(initialIndex);
  }, [initialIndex, scrollToIndex]);

  const sidePadding = Math.max(0, (SCREEN_WIDTH - CELL_WIDTH) / 2);

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const idx = Math.round(x / CELL_WIDTH);
      const item = data[idx];
      if (item && item.key !== activeBox) handleSelectBox(item.key);
      if (idx !== activeIdx) setActiveIdx(idx);
    },
    [activeBox, activeIdx, data, handleSelectBox]
  );

  const scrollToIndex = useCallback((index: number) => {
    listRef.current?.scrollToIndex({ index, animated: true });
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: { key: keyof BoxesState }; index: number }) => {
      const boxContent = boxes[item.key];
      const layer = Math.max(0, 3 - Math.abs(activeIdx - index));
      const isActive = index === activeIdx;

      return (
        <BoxCarouselItem
          boxContent={boxContent}
          layer={layer}
          isActive={isActive}
          onPress={() => scrollToIndex(index)}
          cellWidth={CELL_WIDTH}
        />
      );
    },
    [activeIdx, boxes, scrollToIndex]
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        bounces={true}
        data={data}
        keyExtractor={(i) => String(i.key)}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: sidePadding,
        }}
        decelerationRate="fast"
        snapToInterval={CELL_WIDTH}
        snapToAlignment="center"
        disableIntervalMomentum
        onMomentumScrollEnd={onMomentumEnd}
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
