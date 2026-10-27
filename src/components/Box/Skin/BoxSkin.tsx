import BoxBottom from "@/assets/mascot/box/body/bottom-box.png";
import Hat from "@/assets/mascot/box/body/hat.png";
import BoxTop from "@/assets/mascot/box/body/top-box.png";
import { useSettings } from "@/src/contexts/SettingsContext";
import { Image as ExpoImage } from "expo-image";
import React from "react";
import { Image, Text, View, type ImageSourcePropType, type ImageStyle, type StyleProp, type ViewStyle } from "react-native";
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
  /** Custom contents between the back and front of the box; overrides contentSource. */
  content?: React.ReactNode;
  contentSource?: ImageSourcePropType;
  contentStyle?: ImageStyle;
  contentCopyStyles?: ImageStyle[];
  foregroundSource?: ImageSourcePropType;
  foregroundStyle?: ImageStyle;
  foregroundLabel?: string;
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
  content,
  contentSource,
  contentStyle,
  contentCopyStyles,
  foregroundSource,
  foregroundStyle,
  foregroundLabel,
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
      {content ?? (contentSource ? (
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
      ))}
      {shouldShowFace && (
        <BoxFace parts={getBoxFaceParts(face, faceParts)} style={[styles.face, faceStyle]} />
      )}
      <Image source={BoxBottom} style={styles.skin} />
      {foregroundSource ? (
        <View
          style={[styles.foreground, foregroundStyle]}
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <ExpoImage
            source={foregroundSource}
            style={styles.foregroundImage}
            contentFit="contain"
          />
          {foregroundLabel ? (
            <View style={styles.foregroundLabelContainer}>
              <Text style={styles.foregroundLabel} allowFontScaling={false} numberOfLines={1}>
                {foregroundLabel}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

export default React.memo(BoxSkin);
