import React from "react";
import { Image, View } from "react-native";
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
import { useStyles } from "./styles_boxes";
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

  return (
    <View style={[styles.containerSkin, isActive && styles.activeBox, isCaro && styles.caroPosition]}>
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
