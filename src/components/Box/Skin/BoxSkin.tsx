import BoxBottom from "@/assets/illustrations/mascot-box/body/bottom-box.png";
import Hat from "@/assets/illustrations/mascot-box/body/hat.png";
import BoxTop from "@/assets/illustrations/mascot-box/body/top-box.png";
import { useSettings } from "@/src/contexts/SettingsContext";
import React from "react";
import { Image, View } from "react-native";
import { BoxCardsRow } from "./BoxCardsRow";
import { useBoxSkinStyles } from "./BoxSkin.styles";
import { BOX_FACE_ASSETS, type Face } from "./boxFaces";

interface BoxSkinProps {
  wordCount: number;
  face: Face;
  isActive?: boolean;
  isCaro?: boolean;
  showHat?: boolean;
  cardVariant?: "default" | "logo";
  /** Overrides learning-box preference; navbar mascot must always show face. */
  showFace?: boolean;
  accessible?: boolean;
  accessibilityLabel?: string;
}

const BoxSkin: React.FC<BoxSkinProps> = ({
  wordCount,
  face,
  isActive,
  isCaro,
  showHat = false,
  cardVariant = "default",
  showFace,
  accessible = true,
  accessibilityLabel: accessibilityLabelOverride,
}) => {
  const styles = useBoxSkinStyles();
  const { showBoxFaces } = useSettings();
  const faceSource = BOX_FACE_ASSETS[face];

  const shouldShowFace = showFace ?? showBoxFaces;
  const accessibilityLabel = accessibilityLabelOverride ?? `Pudełko z ${wordCount} słowami${
    shouldShowFace ? `, nastrój: ${face}` : ""
  }`;

  return (
    <View
      style={[
        styles.containerSkin,
        isActive && styles.activeBox,
        isCaro && styles.caroPosition,
      ]}
      accessible={accessible}
      accessibilityRole={accessible ? "image" : undefined}
      accessibilityLabel={accessible ? accessibilityLabel : undefined}
      accessibilityState={accessible ? { selected: !!isActive } : undefined}
    >
      {showHat ? (
        <Image
          source={Hat}
          style={styles.hat}
          resizeMode="contain"
          testID="box-skin-hat"
        />
      ) : null}
      <Image source={BoxTop} style={styles.skin} />
      <BoxCardsRow wordCount={wordCount} styles={styles} variant={cardVariant} />
      {shouldShowFace && (
        <Image
          source={faceSource}
          style={styles.face}
          resizeMode="contain"
          testID="box-skin-face"
        />
      )}
      <Image source={BoxBottom} style={styles.skin} />
    </View>
  );
};

export default React.memo(BoxSkin);
