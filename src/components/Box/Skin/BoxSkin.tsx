import BoxBottom from "@/assets/illustrations/mascot-box/body/bottom-box.png";
import Hat from "@/assets/illustrations/mascot-box/body/hat.png";
import BoxTop from "@/assets/illustrations/mascot-box/body/top-box.png";
import { useSettings } from "@/src/contexts/SettingsContext";
import React from "react";
import { Image, View, type ImageSourcePropType, type ImageStyle, type StyleProp, type ViewStyle } from "react-native";
import { BoxCardsRow } from "./BoxCardsRow";
import { BoxFace } from "./BoxFace";
import { useBoxSkinStyles } from "./BoxSkin.styles";
import { getBoxFaceParts, type BoxFaceParts, type Face } from "./boxFaces";

interface BoxSkinProps {
  wordCount: number;
  face: Face;
  /** Mix parts over the selected face, e.g. { eyes: "sparkle", blush: true }. */
  faceParts?: Partial<BoxFaceParts>;
  /** Adjust the face position for a specific mascot composition. */
  faceStyle?: StyleProp<ViewStyle>;
  isActive?: boolean;
  isCaro?: boolean;
  showHat?: boolean;
  cardVariant?: "default" | "logo";
  contentSource?: ImageSourcePropType;
  contentStyle?: ImageStyle;
  contentCopyStyles?: ImageStyle[];
  foregroundSource?: ImageSourcePropType;
  foregroundStyle?: ImageStyle;
  /** Overrides learning-box preference; navbar mascot must always show face. */
  showFace?: boolean;
  accessible?: boolean;
  accessibilityLabel?: string;
}

const BoxSkin: React.FC<BoxSkinProps> = ({
  wordCount,
  face,
  faceParts,
  faceStyle,
  isActive,
  isCaro,
  showHat = false,
  cardVariant = "default",
  contentSource,
  contentStyle,
  contentCopyStyles,
  foregroundSource,
  foregroundStyle,
  showFace,
  accessible = true,
  accessibilityLabel: accessibilityLabelOverride,
}) => {
  const styles = useBoxSkinStyles();
  const { showBoxFaces } = useSettings();

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
      {contentSource ? (
        (contentCopyStyles ?? [{}]).map((copyStyle, index) => (
          <Image
            key={index}
            source={contentSource}
            style={[styles.card1, styles.content, contentStyle, copyStyle]}
            resizeMode="contain"
          />
        ))
      ) : (
        <BoxCardsRow wordCount={wordCount} styles={styles} variant={cardVariant} />
      )}
      {shouldShowFace && (
        <BoxFace parts={getBoxFaceParts(face, faceParts)} style={[styles.face, faceStyle]} />
      )}
      <Image source={BoxBottom} style={styles.skin} />
      {foregroundSource ? (
        <Image
          source={foregroundSource}
          style={[styles.foreground, foregroundStyle]}
          resizeMode="contain"
        />
      ) : null}
    </View>
  );
};

export default React.memo(BoxSkin);
