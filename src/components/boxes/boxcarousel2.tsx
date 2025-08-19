// // BoxesCarousel.tsx
// import React, { useMemo, useRef, useCallback } from "react";
// import {
//   View,
//   Image,
//   Pressable,
//   Animated,
//   FlatList,
//   Dimensions,
//   NativeScrollEvent,
//   NativeSyntheticEvent,
// } from "react-native";
// import { useStyles } from "./styles_carousel";
// import { BoxesState } from "@/src/types/boxes";

// import BoxTop from "../../../assets/box/topBox.png";
// import BoxBottom from "../../../assets/box/bottomBox.png";

// interface BoxesProps {
//   boxes: BoxesState;
//   activeBox: keyof BoxesState | null;
//   handleSelectBox: (name: keyof BoxesState) => void;
//   onDownload: () => Promise<void>;
// }

// const { width: SCREEN_WIDTH } = Dimensions.get("window");
// const ITEM_WIDTH = Math.round(SCREEN_WIDTH * 0.3);

// export default function BoxesCarousel({
//   boxes,
//   activeBox,
//   handleSelectBox,
// }: BoxesProps) {
//   const styles = useStyles();
//   const data = useMemo(
//     () => Object.keys(boxes || {}).map((k) => ({ key: k as keyof BoxesState })),
//     [boxes]
//   );

//   const scrollX = useRef(new Animated.Value(0)).current;
//   const listRef = useRef<FlatList>(null);

//   const initialIndex = useMemo(() => {
//     if (!activeBox) return 0;
//     const idx = data.findIndex((d) => d.key === activeBox);
//     return idx >= 0 ? idx : 0;
//   }, [activeBox, data]);

//   const onMomentumEnd = useCallback(
//     (e: NativeSyntheticEvent<NativeScrollEvent>) => {
//       const x = e.nativeEvent.contentOffset.x;
//       const idx = Math.round(x / ITEM_WIDTH);
//       const item = data[idx];
//       if (item && item.key !== activeBox) {
//         handleSelectBox(item.key);
//       }
//     },
//     [activeBox, data, handleSelectBox]
//   );

//   const scrollToIndex = useCallback((index: number) => {
//     listRef.current?.scrollToIndex({ index, animated: true });
//   }, []);

//   const renderItem = useCallback(
//     ({ item, index }: { item: { key: keyof BoxesState }; index: number }) => {
//       const inputRange = [
//         (index - 1) * ITEM_WIDTH,
//         index * ITEM_WIDTH,
//         (index + 1) * ITEM_WIDTH,
//       ];

//       const scale = scrollX.interpolate({
//         inputRange,
//         outputRange: [0.9, 1.0, 0.9],
//         extrapolate: "clamp",
//       });

//       const opacity = scrollX.interpolate({
//         inputRange,
//         outputRange: [0.6, 1.0, 0.6],
//         extrapolate: "clamp",
//       });

//       const isActive = item.key === activeBox;

//       return (
//         <View style={{ width: ITEM_WIDTH }}>
//           <Animated.View
//             style={[
//               isActive && styles.activeBox,
//               { transform: [{ scale }], opacity },
//             ]}
//           >
//             <Pressable
//               onPress={() => scrollToIndex(index)}
//               style={styles.containerSkin}
//             >
//               <Image source={BoxTop} style={styles.skin} />

//               <Image source={BoxBottom} style={styles.skin} />
//             </Pressable>
//           </Animated.View>
//         </View>
//       );
//     },
//     [activeBox, scrollX, styles.activeBox, styles.boxWords, scrollToIndex]
//   );

//   return (
//     <View>
//       <Animated.FlatList
//         ref={listRef}
//         data={data}
//         keyExtractor={(i) => String(i.key)}
//         renderItem={renderItem}
//         horizontal
//         showsHorizontalScrollIndicator={false}
//         contentContainerStyle={{
//           paddingHorizontal: (SCREEN_WIDTH - ITEM_WIDTH) / 2,
//         }}
//         decelerationRate="fast"
//         onMomentumScrollEnd={onMomentumEnd}
//         onScroll={Animated.event(
//           [{ nativeEvent: { contentOffset: { x: scrollX } } }],
//           { useNativeDriver: true }
//         )}
//         initialScrollIndex={initialIndex}
//         getItemLayout={(_d, index) => ({
//           length: ITEM_WIDTH,
//           offset: ITEM_WIDTH * index,
//           index,
//         })}
//       />
//     </View>
//   );
// }
