import React, { useEffect, useRef, useState } from "react";
import { View, Pressable, Animated } from "react-native";
import { BoxesState } from "@/src/types/boxes";
import BoxSkin from "./BoxSkin";
import { useStyles } from "./boxes-styles";

interface Props {
  boxContent: BoxesState[keyof BoxesState];
  layer: number;
  scale: Animated.AnimatedInterpolation<number>;
  opacity: Animated.AnimatedInterpolation<number>;
  translateY: Animated.AnimatedInterpolation<number>;
  isActive: boolean;
  onPress: () => void;
  setBoxH: (height: number) => void;
  cellWidth: number;
}

const BoxCarouselItem: React.FC<Props> = ({
  boxContent,
  layer,
  scale,
  opacity,
  translateY,
  isActive,
  onPress,
  setBoxH,
  cellWidth,
}) => {
  const styles = useStyles();
  const [face, setFace] = useState(isActive ? "happy" : "smile");
  const firstRender = useRef(true);

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
        onLayout={(e) => setBoxH(e.nativeEvent.layout.height)}
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
