import { useSideNavbarLayout } from "@/src/components/navbar/useSideNavbarLayout";
import BoxSkin from "@/src/components/Box/Skin/BoxSkin";
import { useDeviceLayout } from "@/src/hooks/useDeviceLayout";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { Image } from "expo-image";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { getReviewEmptyLayout, REVIEW_EMPTY_CLOCK_TOP, REVIEW_EMPTY_MESSAGE_GAP } from "./reviewEmptyLayout";
import type { ReviewEmptyMessage } from "./reviewEmptyMessages";
import { useReviewEmptyEntrance } from "./useReviewEmptyEntrance";

const CLOCK_SOURCE = require("@/assets/mascot/box/props/zegar4.svg");
const CLOCK_REVEAL_TOP = -200;
const BOX_OPENING_CLIP_Y = 50;

export function ReviewEmptyState({ width, height, message }: {
  width: number;
  height: number;
  message: ReviewEmptyMessage;
}) {
  const styles = useStyles();
  const { t } = useTranslation();
  const { isSmallPhoneLayout, isCompactHeight, isTabletLayout, orientation } = useDeviceLayout();
  const isPhoneLandscape = useSideNavbarLayout();
  const isLandscape = isPhoneLandscape || (isTabletLayout && orientation === "landscape" && width >= 600);
  const isTabletLandscape = isTabletLayout && isLandscape;
  const [messageHeight, setMessageHeight] = useState(0);
  const [clockLoaded, setClockLoaded] = useState(false);
  const { boxAnimatedStyle, clockAnimatedStyle } = useReviewEmptyEntrance(
    clockLoaded && width > 0 && height > 0,
  );
  const isCompact = isSmallPhoneLayout || isCompactHeight;
  const layout = getReviewEmptyLayout({
    width,
    height,
    isCompact,
    isTablet: isTabletLayout,
    messageHeight,
    isLandscape,
  });

  return (
    <View
      testID="review-empty-state"
      style={[styles.container, isLandscape && styles.containerLandscape, isTabletLandscape && styles.containerTabletLandscape, { minHeight: height, paddingTop: layout.paddingTop }]}
    >
      <View
        testID="review-empty-illustration"
        pointerEvents="none"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ width: layout.boxWidth, height: layout.boxHeight, marginTop: isLandscape ? -REVIEW_EMPTY_CLOCK_TOP * layout.scale : 0 }}
      >
        <View style={[
          styles.boxFrame,
          {
            left: (layout.boxWidth - 115) / 2,
            top: (layout.boxHeight - 122) / 2,
            transform: [{ scale: layout.scale }],
          },
        ]}>
          <Animated.View style={[styles.boxMotion, boxAnimatedStyle]}>
            <BoxSkin
              wordCount={0}
              face="sleep"
              showFace
              accessible={false}
              content={
                <View style={styles.clockReveal} collapsable={false}>
                  <Animated.View style={[styles.clock, clockAnimatedStyle]}>
                    <Image
                      testID="review-empty-clock"
                      source={CLOCK_SOURCE}
                      contentFit="contain"
                      accessible={false}
                      onLoad={() => setClockLoaded(true)}
                      style={styles.clockImage}
                    />
                  </Animated.View>
                </View>
              }
            />
          </Animated.View>
        </View>
      </View>
      <View
        testID="review-empty-message"
        onLayout={(event) => setMessageHeight(event.nativeEvent.layout.height)}
        style={[styles.message, isLandscape && styles.messageLandscape, isTabletLandscape && styles.messageTabletLandscape]}
      >
        <Text testID="review-empty-title" style={[styles.title, isTabletLandscape && styles.titleTabletLandscape]}>
          {t(`screens.review.courses.coursesReview.coursesReview.emptyMessages.${message}.title`)}
        </Text>
        <Text testID="review-empty-description" style={[styles.description, isTabletLandscape && styles.descriptionTabletLandscape]}>
          {t(`screens.review.courses.coursesReview.coursesReview.emptyMessages.${message}.description`)}
        </Text>
      </View>
    </View>
  );
}

const useStyles = createThemeStylesHook((colors) => ({
  container: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  containerLandscape: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 32,
  },
  containerTabletLandscape: {
    width: "100%",
    maxWidth: 960,
    alignSelf: "center",
    gap: 72,
    paddingHorizontal: 40,
  },
  messageTabletLandscape: {
    gap: 16,
    maxWidth: 400,
  },
  titleTabletLandscape: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "900",
    textAlign: "left",
    color: colors.headline,
  },
  descriptionTabletLandscape: {
    fontSize: 18,
    lineHeight: 28,
    textAlign: "left",
  },
  messageLandscape: {
    flex: 1,
    minWidth: 0,
    maxWidth: 360,
    marginTop: 0,
  },
  boxFrame: {
    position: "absolute",
    width: 115,
    height: 122,
  },
  boxMotion: {
    width: 115,
    height: 122,
    transformOrigin: "center bottom",
  },
  clockReveal: {
    // Clip at the opening, where the front flap covers the cut edge. The PNG
    // has transparent corners, so clipping deeper lets the tilted base escape.
    position: "absolute",
    left: -100,
    top: CLOCK_REVEAL_TOP,
    width: 315,
    height: BOX_OPENING_CLIP_Y - CLOCK_REVEAL_TOP,
    overflow: "hidden",
  },
  clock: {
    position: "absolute",
    left: 33,
    top: REVIEW_EMPTY_CLOCK_TOP - CLOCK_REVEAL_TOP,
    width: 250,
    height: 250,
    transformOrigin: "center bottom",
  },
  clockImage: {
    width: "100%",
    height: "100%",
  },
  message: {
    marginTop: REVIEW_EMPTY_MESSAGE_GAP,
    width: "100%",
    maxWidth: 320,
    alignSelf: "center",
    gap: 8,
  },
  title: {
    textAlign: "center",
    fontSize: 18,
    lineHeight: 25,
    fontWeight: "600",
    color: colors.paragraph,
  },
  description: {
    textAlign: "center",
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "400",
    color: colors.paragraph,
  },
}));
