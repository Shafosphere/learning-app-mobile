import React, { useEffect, useRef, useState } from "react";
import { View, Pressable, Image, Animated } from "react-native";
import { BoxesState } from "@/src/types/boxes";
import BoxTop from "../../../assets/box/topBox.png";
import BoxBottom from "../../../assets/box/bottomBox.png";
import LeftEyeImg from "../../../assets/box/leftEyeImg.svg";
import LeftPupilImg from "../../../assets/box/leftPupilImg.svg";
import RightEyeImg from "../../../assets/box/rightEyeImg.svg";
import RightPupilImg from "../../../assets/box/rightPupilImg.svg";
import Smile from "../../../assets/box/smile.svg";
import Surprised from "../../../assets/box/surprised.svg";
import Happy from "../../../assets/box/happy.svg";

import Card1 from "../../../assets/box/miniflashcard1.png";
import Card2 from "../../../assets/box/miniflashcard2.png";
import Card3 from "../../../assets/box/miniflashcard3.png";

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
  styles: any;
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
  styles,
}) => {
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

  const renderMouth = () => {
    switch (face) {
      case "happy":
        return <Happy style={styles.mouth} width={18} height={18} />;
      case "surprised":
        return <Surprised style={styles.mouth} width={18} height={18} />;
      default:
        return <Smile style={styles.mouth} width={18} height={18} />;
    }
  };

  const CARDS = [Card1, Card2, Card3];

  const renderCards = (len: number) => {
    const count = len > 30 ? 3 : len > 20 ? 2 : len > 10 ? 1 : 0;
    if (!count) return null;

    return (
      <View style={styles.cardsRow}>
        {CARDS.slice(0, count).map((src, i) => (
          <Image key={i} source={src} style={styles[`card${i + 1}`]} />
        ))}
      </View>
    );
  };

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
        <Pressable
          onPress={onPress}
          style={[styles.containerSkin, isActive && styles.activeBox]}
        >
          <Image source={BoxTop} style={styles.skin} />
          {renderCards(boxContent.length)}
          {renderMouth()}
          <LeftPupilImg style={styles.leftpupil} width={4} height={4} />
          <LeftEyeImg style={styles.lefteye} width={12} height={12} />
          <RightPupilImg style={styles.rightpupil} width={4} height={4} />
          <RightEyeImg style={styles.righteye} width={12} height={12} />
          <Image source={BoxBottom} style={styles.skin} />
        </Pressable>
      </Animated.View>
      <Animated.Text style={[styles.number, { opacity }]}>
        {boxContent.length}
      </Animated.Text>
    </View>
  );
};

export default React.memo(BoxCarouselItem);
