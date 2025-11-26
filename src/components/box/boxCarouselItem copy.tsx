import React from "react";
import { Pressable, View } from "react-native";
import Animated, {
  Extrapolation,
  SharedValue,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import BoxSkin from "./BoxSkin";
import { useStyles } from "./boxes-styles";

interface Props {
  boxContent: any[];
  index: number;
  scrollX: SharedValue<number>;
  itemWidth: number;
  spacing: number;
  onPress: () => void;
  isActive: boolean;
}

const BoxCarouselItem = ({
  boxContent,
  index,
  scrollX,
  itemWidth,
  spacing,
  onPress,
  isActive,
}: Props) => {
  const styles = useStyles();
  const ITEM_SIZE = itemWidth + spacing;

  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * ITEM_SIZE,
      index * ITEM_SIZE,
      (index + 1) * ITEM_SIZE,
    ];

    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.85, 1.1, 0.85],
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.6, 1, 0.6],
      Extrapolation.CLAMP
    );

    const translateY = interpolate(
      scrollX.value,
      inputRange,
      [15, 0, 15],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale }, { translateY }],
      opacity,
    };
  });

  return (
    <View
      style={{
        width: ITEM_SIZE,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.View style={[animatedStyle, { alignItems: "center" }]}>
        <Pressable onPress={onPress} style={{ alignItems: "center" }}>
          <BoxSkin
            wordCount={boxContent.length}
            face={isActive ? "happy" : "smile"}
            isActive={isActive}
            isCaro={true}
          />
        </Pressable>
        <Animated.Text
          style={[
            styles.number,
            { marginTop: 0, paddingTop: 10, opacity: isActive ? 1 : 0.6 },
          ]}
        >
          {boxContent.length}
        </Animated.Text>
      </Animated.View>
    </View>
  );
};

export default React.memo(BoxCarouselItem);
