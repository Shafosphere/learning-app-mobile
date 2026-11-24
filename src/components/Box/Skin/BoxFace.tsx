import React from "react";
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import {
  BOX_EYE_ASSETS,
  BOX_EYEBROW_ASSETS,
  BOX_FACE_EFFECT_ASSETS,
  BOX_MOUTH_ASSETS,
  type BoxFaceParts,
} from "./boxFaces";

type BoxFaceProps = {
  parts: BoxFaceParts;
  style: StyleProp<ViewStyle>;
  mouthOffsetY?: number;
};

/** All face PNGs share a 500×500 canvas and must keep their original alignment. */
export function BoxFace({ parts, style, mouthOffsetY = 0 }: BoxFaceProps) {
  return (
    <View style={style} pointerEvents="none" testID="box-skin-face">
      {parts.blush && (
        <Image
          source={BOX_FACE_EFFECT_ASSETS.blush}
          style={styles.layer}
          resizeMode="contain"
          testID="box-skin-face-blush"
        />
      )}
      {parts.eyes === "blink" && (
        <View style={styles.leftEyeClip} testID="box-skin-face-left-eye">
          <Image
            source={BOX_EYE_ASSETS.normal}
            style={styles.fullEyesInClip}
            resizeMode="contain"
            testID="box-skin-face-left-eye-image"
          />
        </View>
      )}
      <Image
        source={BOX_EYE_ASSETS[parts.eyes]}
        style={styles.layer}
        resizeMode="contain"
        testID="box-skin-face-eyes"
      />
      <Image
        source={BOX_MOUTH_ASSETS[parts.mouth]}
        style={[styles.layer, { transform: [{ translateY: mouthOffsetY }] }]}
        resizeMode="contain"
        testID="box-skin-face-mouth"
      />
      {parts.eyebrows && (
        <Image
          source={BOX_EYEBROW_ASSETS[parts.eyebrows]}
          style={styles.layer}
          resizeMode="contain"
          testID="box-skin-face-eyebrows"
        />
      )}
      {parts.tears && (
        <Image
          source={BOX_FACE_EFFECT_ASSETS.tears}
          style={styles.layer}
          resizeMode="contain"
          testID="box-skin-face-tears"
        />
      )}
      {parts.zzz && (
        <Image
          source={BOX_FACE_EFFECT_ASSETS.zzz}
          style={styles.layer}
          resizeMode="contain"
          testID="box-skin-face-zzz"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  // Crop only the right half away; scaling the full canvas preserves eye placement.
  leftEyeClip: {
    position: "absolute",
    left: 0,
    top: 0,
    width: "50%",
    height: "100%",
    overflow: "hidden",
  },
  fullEyesInClip: {
    position: "absolute",
    left: 0,
    top: 0,
    width: "200%",
    height: "100%",
  },
});
