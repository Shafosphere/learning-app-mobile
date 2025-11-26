import { BoxesState } from "@/src/types/boxes";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Dimensions, FlatList, View } from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import BoxCarouselItem from "./boxCarouselItem copy";
import { useStyles } from "./boxes-styles";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ITEM_WIDTH = SCREEN_WIDTH * 0.35;
const SPACING = 20;
const ITEM_SIZE = ITEM_WIDTH + SPACING;
const SIDE_SPACER = (SCREEN_WIDTH - ITEM_SIZE) / 2;

interface BoxesProps {
  boxes: BoxesState;
  activeBox: keyof BoxesState | null;
  handleSelectBox: (name: keyof BoxesState) => void;
  hideBoxZero?: boolean;
}

// Create an animated FlatList
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

export default function BoxesCarousel({
  boxes,
  activeBox,
  handleSelectBox,
  hideBoxZero = false,
}: BoxesProps) {
  const styles = useStyles();
  const scrollX = useSharedValue(0);
  const flatListRef = useRef<FlatList>(null);

  // Prepare data
  const data = useMemo(() => {
    const keys = Object.keys(boxes ?? {}) as (keyof BoxesState)[];
    const filtered = hideBoxZero ? keys.filter((k) => k !== "boxZero") : keys;
    return filtered.map((k) => ({ key: k, content: boxes[k] }));
  }, [boxes, hideBoxZero]);

  // Calculate initial index
  const initialIndex = useMemo(() => {
    if (!activeBox) return 0;
    const idx = data.findIndex((d) => d.key === activeBox);
    return idx >= 0 ? idx : 0;
  }, [activeBox, data]);

  // Handle scroll events for animations
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  // Handle selection when scrolling stops
  const onMomentumScrollEnd = useCallback(
    (e: any) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / ITEM_SIZE);
      const item = data[index];
      if (item && item.key !== activeBox) {
        handleSelectBox(item.key);
      }
    },
    [activeBox, data, handleSelectBox]
  );

  // Sync activeBox prop with scroll position (programmatic changes)
  useEffect(() => {
    if (flatListRef.current && data.length > 0) {
      const index = data.findIndex((d) => d.key === activeBox);
      if (index >= 0) {
        // Check if we are already near this index to avoid unnecessary scrolls
        // But for simplicity, we just scroll. 
        // We can check scrollX.value but that's on UI thread.
        flatListRef.current.scrollToIndex({ index, animated: true });
      }
    }
  }, [activeBox, data]);

  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      const isActive = item.key === activeBox;
      return (
        <BoxCarouselItem
          boxContent={item.content}
          index={index}
          scrollX={scrollX}
          itemWidth={ITEM_WIDTH}
          spacing={SPACING}
          isActive={isActive}
          onPress={() => {
            flatListRef.current?.scrollToIndex({ index, animated: true });
            if (item.key !== activeBox) handleSelectBox(item.key);
          }}
        />
      );
    },
    [activeBox, handleSelectBox, scrollX]
  );

  return (
    <View style={styles.container}>
      <AnimatedFlatList
        ref={flatListRef}
        data={data}
        keyExtractor={(item: any) => String(item.key)}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={ITEM_SIZE}
        decelerationRate="fast"
        bounces={false}
        contentContainerStyle={{
          paddingHorizontal: SIDE_SPACER,
        }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onMomentumScrollEnd}
        initialScrollIndex={initialIndex}
        getItemLayout={(_: any, index: number) => ({
          length: ITEM_SIZE,
          offset: ITEM_SIZE * index,
          index,
        })}
        // Optimization props
        removeClippedSubviews={false}
        windowSize={5}
      />
    </View>
  );
}
