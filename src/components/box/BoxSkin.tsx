import React from "react";
import { Image, View } from "react-native";
import BoxTop from "@/assets/illustrations/box/topBox.png";
import BoxBottom from "@/assets/illustrations/box/bottomBox.png";
import LeftEyeImg from "@/assets/illustrations/box/leftEyeImg.svg";
import LeftPupilImg from "@/assets/illustrations/box/leftPupilImg.svg";
import RightEyeImg from "@/assets/illustrations/box/rightEyeImg.svg";
import RightPupilImg from "@/assets/illustrations/box/rightPupilImg.svg";
import Smile from "@/assets/illustrations/box/smile.svg";
import Surprised from "@/assets/illustrations/box/surprised.svg";
import Happy from "@/assets/illustrations/box/happy.svg";
import Card1 from "@/assets/illustrations/box/miniflashcard1.png";
import Card2 from "@/assets/illustrations/box/miniflashcard2.png";
import Card3 from "@/assets/illustrations/box/miniflashcard3.png";
import { useStyles } from "./boxes-styles";
import { useSettings } from "../../contexts/SettingsContext";

type Face = "smile" | "happy" | "surprised";

interface BoxSkinProps {
  wordCount: number;
  face: Face;
  isActive?: boolean;
  isCaro?: boolean;
}

const CARDS = [Card1, Card2, Card3];

const BoxSkin: React.FC<BoxSkinProps> = ({ wordCount, face, isActive, isCaro }) => {
  const styles = useStyles();
  const { showBoxFaces } = useSettings();

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

  const renderCards = () => {
    const count =
      wordCount > 30 ? 3 : wordCount > 20 ? 2 : wordCount > 10 ? 1 : 0;
    if (!count) return null;

    return (
      <View style={styles.cardsRow}>
        {CARDS.slice(0, count).map((src, i) => (
          <Image key={i} source={src} style={(styles as any)[`card${i + 1}`]} />
        ))}
      </View>
    );
  };

  const accessibilityLabel = `Pudełko z ${wordCount} słowami${
    showBoxFaces ? `, nastrój: ${face}` : ""
  }`;

  return (
    <View
      style={[styles.containerSkin, isActive && styles.activeBox, isCaro && styles.caroPosition]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: !!isActive }}
    >
      <Image source={BoxTop} style={styles.skin} />
      {renderCards()}
      {showBoxFaces && (
        <>
          {renderMouth()}
          <LeftPupilImg style={styles.leftpupil} width={4} height={4} />
          <LeftEyeImg style={styles.lefteye} width={12} height={12} />
          <RightPupilImg style={styles.rightpupil} width={4} height={4} />
          <RightEyeImg style={styles.righteye} width={12} height={12} />
        </>
      )}
      <Image source={BoxBottom} style={styles.skin} />
    </View>
  );
};

export default BoxSkin;
