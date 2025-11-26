import React, { useEffect, useRef, useState } from "react";
import { View, Pressable, Animated } from "react-native";
import { BoxesState } from "@/src/types/boxes";
import BoxSkin from "./BoxSkin";
import { useStyles } from "./boxes-styles";

interface Props {
  boxContent: BoxesState[keyof BoxesState];
  layer: number;
  isActive: boolean;
  onPress: () => void;
  cellWidth: number;
}

const BoxCarouselItem: React.FC<Props> = ({
  boxContent,
  layer,
  isActive,
  onPress,
  cellWidth,
}) => {
  const styles = useStyles();
  const [face, setFace] = useState(isActive ? "happy" : "smile");
  const firstRender = useRef(true);
  const anim = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      setFace(isActive ? "happy" : "smile");
      return;
    }
    setFace("surprised");
    const timer = setTimeout(() => setFace(isActive ? "happy" : "smile"), 500);
    return () => clearTimeout(timer);
  }, [isActive]);

  useEffect(() => {
    Animated.spring(anim, {
      toValue: isActive ? 1 : 0,
      useNativeDriver: true,
      tension: 200,
      friction: 20,
    }).start();
  }, [anim, isActive]);

  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1.8],
  });

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 0],
  });

  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  // Mouth and mini-cards are now handled inside BoxSkin

  return (
    <View
      style={{
        width: cellWidth,
        zIndex: layer,
        overflow: "visible",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.View
        style={[{ transform: [{ translateY }, { scale }], opacity }]}
      >
        <Pressable onPress={onPress}>
          <BoxSkin
            wordCount={boxContent.length}
            face={face as "smile" | "happy" | "surprised"}
            isActive={isActive}
            isCaro={true}
          />
        </Pressable>
      </Animated.View>
      <Animated.Text style={[styles.number, styles.numberUpdate, { opacity }]}>
        {boxContent.length}
      </Animated.Text>
    </View>
  );
};

export default React.memo(BoxCarouselItem);
