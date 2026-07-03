import MyButton from "@/src/components/button/button";
import BoxSkin from "@/src/components/Box/Skin/BoxSkin";
import type { Face } from "@/src/components/Box/Skin/boxFaces";
import Confetti from "@/src/components/confetti/Confetti";
import { resolveCourseIconProps } from "@/src/constants/customCourse";
import { useProportionalLayout } from "@/src/hooks/useProportionalLayout";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import type { ImageSourcePropType } from "react-native";
import AntDesign from "@expo/vector-icons/AntDesign";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Octicons from "@expo/vector-icons/Octicons";
import { ScrollView, Text, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  ZoomIn,
  useReducedMotion,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useStyles } from "./CourseFinishedPanel-styles";

const BOX_SHADOW_SOURCE = require("@/assets/illustrations/mascot-box/body/shadow.svg");

const HORIZONTAL_INSET = 20;
const VERTICAL_INSET_PERCENTAGE = 5;
const REFERENCE_CONTENT_WIDTH = 320;
const REFERENCE_CONTENT_HEIGHT = 632;
const LAYOUT_PERCENTAGES = {
  title: 8.3,
  titleGap: 4.9,
  course: 7.8,
  courseGap: 3.3,
  illustration: 34.5,
  illustrationGap: 3.7,
  statsHeading: 2.8,
  statsHeadingGap: 1.4,
  statsCards: 21.3,
  statsCardsGap: 4.1,
  action: 7.9,
} as const;

const ENTRY_STEP = 260;
const HEADING_DELAY = 0;
const SUBHEADING_DELAY = HEADING_DELAY + ENTRY_STEP;
const BADGE_DELAY = SUBHEADING_DELAY + 320;
const LOGO_DELAY = BADGE_DELAY + 420;
const STATS_HEADING_DELAY = LOGO_DELAY + 420;
const STATS_CARD_DELAYS = [
  STATS_HEADING_DELAY + 260,
  STATS_HEADING_DELAY + 500,
  STATS_HEADING_DELAY + 740,
] as const;
const STATS_CONTENT_DELAYS = [
  STATS_CARD_DELAYS[0] + 260,
  STATS_CARD_DELAYS[1] + 260,
  STATS_CARD_DELAYS[2] + 260,
] as const;
const ACTIONS_DELAY = STATS_CONTENT_DELAYS[2] + 360;

type EnteringFactory = (delay: number) => ReturnType<typeof FadeInDown.delay>;

const buildFadeRise = (delay: number, reduceMotion: boolean) =>
  FadeInDown.delay(delay)
    .duration(reduceMotion ? 220 : 680)
    .springify()
    .damping(reduceMotion ? 24 : 17)
    .stiffness(reduceMotion ? 210 : 118)
    .mass(1);

const buildSoftFade = (delay: number, reduceMotion: boolean) =>
  FadeIn.delay(delay).duration(reduceMotion ? 180 : 520);

const buildBadgeZoom = (delay: number, reduceMotion: boolean) =>
  ZoomIn.delay(delay)
    .duration(reduceMotion ? 220 : 700)
    .springify()
    .damping(reduceMotion ? 24 : 16)
    .stiffness(reduceMotion ? 220 : 112)
    .mass(1.02);

const buildLogoPop = (delay: number, reduceMotion: boolean) =>
  ZoomIn.delay(delay)
    .duration(reduceMotion ? 260 : 880)
    .springify()
    .damping(reduceMotion ? 22 : 13)
    .stiffness(reduceMotion ? 200 : 92)
    .mass(1.08);

const buildCardPop = (delay: number, reduceMotion: boolean) =>
  FadeInDown.delay(delay)
    .duration(reduceMotion ? 220 : 700)
    .easing(Easing.out(Easing.cubic))
    .springify()
    .damping(reduceMotion ? 24 : 16)
    .stiffness(reduceMotion ? 210 : 108)
    .mass(1.02);

type StatsCardProps = {
  cardDelay: number;
  contentDelay: number;
  enteringCard: EnteringFactory;
  enteringContent: EnteringFactory;
  icon: React.ReactNode;
  value: string;
  label: string;
  styles: ReturnType<typeof useStyles>;
  scale: number;
  iconWrapSize: number;
};

function StatsCardAnimated({
  cardDelay,
  contentDelay,
  enteringCard,
  enteringContent,
  icon,
  value,
  label,
  styles,
  scale,
  iconWrapSize,
}: StatsCardProps) {
  const scaledFont = (value: unknown, fallback: number) =>
    (typeof value === "number" ? value : fallback) * scale;

  return (
    <Animated.View
      style={[
        styles.statsCard,
        {
          borderRadius: 20 * scale,
          paddingHorizontal: 10 * scale,
          paddingVertical: 16 * scale,
        },
      ]}
      entering={enteringCard(cardDelay)}
    >
      <Animated.View
        style={styles.statsCardContent}
        entering={enteringContent(contentDelay)}
      >
        <View
          style={[
            styles.statsIconWrap,
            {
              width: iconWrapSize,
              height: iconWrapSize,
              borderRadius: iconWrapSize / 2,
              marginBottom: 10 * scale,
            },
          ]}
        >
          {icon}
        </View>
        <Text
          style={[
            styles.statsValue,
            { fontSize: scaledFont(styles.statsValue.fontSize, 24) },
          ]}
          allowFontScaling
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.72}
          maxFontSizeMultiplier={1.25}
        >
          {value}
        </Text>
        <Text
          style={[
            styles.statsLabel,
            { fontSize: scaledFont(styles.statsLabel.fontSize, 14) },
          ]}
          allowFontScaling
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.82}
          maxFontSizeMultiplier={1.2}
        >
          {label}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

type CourseFinishedPanelProps = {
  courseName: string;
  courseFlagSource?: ImageSourcePropType;
  customCourseFlagSource?: ImageSourcePropType;
  courseIconProps?: ReturnType<typeof resolveCourseIconProps> | null;
  cardsCountLabel: string;
  accuracyLabel: string;
  learningTimeLabel: string;
  onBackToCourses: () => void;
};

export function CourseFinishedPanel({
  courseName,
  courseFlagSource,
  customCourseFlagSource,
  courseIconProps,
  cardsCountLabel,
  accuracyLabel,
  learningTimeLabel,
  onBackToCourses,
}: CourseFinishedPanelProps) {
  const { t } = useTranslation();
  const styles = useStyles();
  const reduceMotion = useReducedMotion();
  const { fontScale } = useWindowDimensions();
  const proportionalLayout = useProportionalLayout({
    referenceWidth: REFERENCE_CONTENT_WIDTH,
    referenceHeight: REFERENCE_CONTENT_HEIGHT,
    horizontalInset: HORIZONTAL_INSET,
    verticalInsetPercentage: VERTICAL_INSET_PERCENTAGE,
  });
  const [boxFace, setBoxFace] = useState<Face>("surprised");
  const [showConfetti, setShowConfetti] = useState(true);
  const hasCustomCourseGraphic =
    Boolean(courseIconProps?.mainImageSource) ||
    Boolean(courseIconProps?.icon) ||
    Boolean(customCourseFlagSource);
  const useVerticalBadgeLayout =
    proportionalLayout.viewportWidth < 360 || fontScale > 1.2;
  const needsScrollFallback = useVerticalBadgeLayout;
  const enteringFadeRise = (delay: number) => buildFadeRise(delay, reduceMotion);
  const enteringSoftFade = (delay: number) => buildSoftFade(delay, reduceMotion);
  const enteringBadge = (delay: number) => buildBadgeZoom(delay, reduceMotion);
  const enteringLogo = (delay: number) => buildLogoPop(delay, reduceMotion);
  const enteringCard = (delay: number) => buildCardPop(delay, reduceMotion);
  const scale = proportionalLayout.visualScale;
  const heightFor = proportionalLayout.heightFor;
  const titleHeight = heightFor(LAYOUT_PERCENTAGES.title);
  const courseHeight = heightFor(LAYOUT_PERCENTAGES.course);
  const illustrationHeight = heightFor(LAYOUT_PERCENTAGES.illustration);
  const statsHeadingHeight = heightFor(LAYOUT_PERCENTAGES.statsHeading);
  const statsCardsHeight = heightFor(LAYOUT_PERCENTAGES.statsCards);
  const actionHeight = Math.max(48, heightFor(LAYOUT_PERCENTAGES.action));
  const scaled = (value: number) => value * scale;
  const scaledFont = (value: unknown, fallback: number) =>
    (typeof value === "number" ? value : fallback) * scale;
  const courseGraphicSize = Math.min(courseHeight, scaled(60));
  const courseFlagWidth = Math.min(scaled(80), courseHeight * (10 / 7));
  const courseFlagHeight = courseFlagWidth * 0.7;
  const customFlagWidth = courseGraphicSize * 0.55;
  const customFlagHeight = customFlagWidth * (2 / 3);
  const statsIconWrapSize = Math.min(
    scaled(42),
    Math.max(30, statsCardsHeight * 0.32),
  );
  const regionExtent = (height: number) =>
    needsScrollFallback ? { minHeight: height } : { height };

  useEffect(() => {
    setShowConfetti(true);

    const confettiTimeout = setTimeout(() => {
      setShowConfetti(false);
    }, 2000);

    return () => {
      clearTimeout(confettiTimeout);
    };
  }, []);

  useEffect(() => {
    setBoxFace("surprised");

    const initialTimeout = setTimeout(() => {
      setBoxFace("happy");

      const loopFaces: Face[] = ["love", "happy"];
      let currentIndex = 0;

      const intervalId = setInterval(() => {
        setBoxFace(loopFaces[currentIndex]);
        currentIndex = (currentIndex + 1) % loopFaces.length;
      }, 10000);

      cleanupInterval = () => {
        clearInterval(intervalId);
      };
    }, 3000);

    let cleanupInterval = () => {};

    return () => {
      clearTimeout(initialTimeout);
      cleanupInterval();
    };
  }, []);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      testID="course-finished-panel"
      onLayout={proportionalLayout.onLayout}
    >
      <Confetti generateConfetti={showConfetti} />
      <View
        testID="course-finished-top-inset"
        style={{ height: proportionalLayout.verticalInset }}
      />
      <View
        testID="course-finished-title-region"
        style={[styles.titleBlock, regionExtent(titleHeight)]}
      >
        <Animated.Text
          testID="course-finished-heading"
          style={[
            styles.heading,
            { fontSize: scaledFont(styles.heading.fontSize, 34) },
          ]}
          entering={enteringFadeRise(HEADING_DELAY)}
          allowFontScaling
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.76}
          maxFontSizeMultiplier={1.25}
        >
          {t(
            "components.flashcards.courseFinishedPanel.courseFinishedPanel.heading"
          )}
        </Animated.Text>
        <Animated.Text
          style={[
            styles.subheading,
            { fontSize: scaledFont(styles.subheading.fontSize, 16) },
          ]}
          entering={enteringSoftFade(SUBHEADING_DELAY)}
          allowFontScaling
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
          maxFontSizeMultiplier={1.2}
        >
          {t(
            "components.flashcards.courseFinishedPanel.courseFinishedPanel.subheading"
          )}
        </Animated.Text>
      </View>

      <Animated.View
        testID="course-finished-course-region"
        style={[
          styles.courseBadge,
          {
            ...regionExtent(courseHeight),
            marginTop: heightFor(LAYOUT_PERCENTAGES.titleGap),
            gap: scaled(12),
          },
          useVerticalBadgeLayout && styles.courseBadgeStacked,
        ]}
        entering={enteringBadge(BADGE_DELAY)}
      >
        {hasCustomCourseGraphic ? (
          <View
            style={[
              styles.customCourseIconWrapper,
              { width: courseGraphicSize, height: courseGraphicSize },
            ]}
          >
            {courseIconProps?.mainImageSource ? (
              <Image
                source={courseIconProps.mainImageSource}
                style={[
                  styles.customCourseMainImage,
                  { width: courseGraphicSize, height: courseGraphicSize },
                ]}
                contentFit="contain"
              />
            ) : courseIconProps?.icon ? (
              <courseIconProps.icon.Component
                name={courseIconProps.icon.name as never}
                size={courseGraphicSize * 0.8}
                color={courseIconProps.icon.color}
              />
            ) : (
              <Ionicons
                name="person-circle-outline"
                size={courseGraphicSize * 0.8}
                color={styles.courseName.color}
              />
            )}
            {customCourseFlagSource ? (
              <Image
                source={customCourseFlagSource}
                style={[
                  styles.customCourseFlag,
                  {
                    width: customFlagWidth,
                    height: customFlagHeight,
                    right: -scaled(5),
                    borderRadius: scaled(4),
                  },
                ]}
              />
            ) : null}
          </View>
        ) : courseFlagSource ? (
          <Image
            source={courseFlagSource}
            style={[
              styles.courseFlag,
              {
                width: courseFlagWidth,
                height: courseFlagHeight,
                borderRadius: scaled(8),
              },
            ]}
            contentFit="cover"
          />
        ) : null}
        <Text
          style={[
            styles.courseName,
            { fontSize: scaledFont(styles.courseName.fontSize, 22) },
          ]}
          allowFontScaling
          numberOfLines={useVerticalBadgeLayout ? 2 : 1}
          adjustsFontSizeToFit
          minimumFontScale={0.72}
          maxFontSizeMultiplier={1.2}
        >
          {courseName}
        </Text>
      </Animated.View>

      <Animated.View
        testID="course-finished-illustration-region"
        style={[
          styles.logoWrap,
          {
            ...regionExtent(illustrationHeight),
            marginTop: heightFor(LAYOUT_PERCENTAGES.courseGap),
          },
        ]}
        entering={enteringLogo(LOGO_DELAY)}
      >
        <View
          style={[
            styles.boxSkinWrap,
            { transform: [{ scale: scaled(1.72) }] },
          ]}
        >
          <Image
            source={BOX_SHADOW_SOURCE}
            style={styles.boxShadow}
            contentFit="contain"
          />
          <BoxSkin wordCount={0} face={boxFace} showHat />
        </View>
      </Animated.View>

      <Animated.Text
        testID="course-finished-stats-heading-region"
        style={[
          styles.statsHeading,
          {
            ...regionExtent(statsHeadingHeight),
            marginTop: heightFor(LAYOUT_PERCENTAGES.illustrationGap),
            fontSize: scaledFont(styles.statsHeading.fontSize, 18),
          },
        ]}
        entering={enteringSoftFade(STATS_HEADING_DELAY)}
        allowFontScaling
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        maxFontSizeMultiplier={1.2}
      >
        {t(
          "components.flashcards.courseFinishedPanel.courseFinishedPanel.statsHeading"
        )}
      </Animated.Text>

      <View
        testID="course-finished-stats-region"
        style={[
          styles.statsRow,
          {
            ...regionExtent(statsCardsHeight),
            marginTop: heightFor(LAYOUT_PERCENTAGES.statsHeadingGap),
            gap: scaled(10),
          },
        ]}
      >
        <StatsCardAnimated
          cardDelay={STATS_CARD_DELAYS[0]}
          contentDelay={STATS_CONTENT_DELAYS[0]}
          enteringCard={enteringCard}
          enteringContent={enteringFadeRise}
          icon={
            <Octicons
              name="check-circle-fill"
              size={statsIconWrapSize * (30 / 42)}
              color="#00caacff"
            />
          }
          value={cardsCountLabel}
          label={t(
            "components.flashcards.courseFinishedPanel.courseFinishedPanel.label.fiszek"
          )}
          styles={styles}
          scale={scale}
          iconWrapSize={statsIconWrapSize}
        />

        <StatsCardAnimated
          cardDelay={STATS_CARD_DELAYS[1]}
          contentDelay={STATS_CONTENT_DELAYS[1]}
          enteringCard={enteringCard}
          enteringContent={enteringFadeRise}
          icon={
            <AntDesign
              name="star"
              size={statsIconWrapSize * (34 / 42)}
              color="#fde24f"
            />
          }
          value={accuracyLabel}
          label={t(
            "components.flashcards.courseFinishedPanel.courseFinishedPanel.label.skutecznosc"
          )}
          styles={styles}
          scale={scale}
          iconWrapSize={statsIconWrapSize}
        />

        <StatsCardAnimated
          cardDelay={STATS_CARD_DELAYS[2]}
          contentDelay={STATS_CONTENT_DELAYS[2]}
          enteringCard={enteringCard}
          enteringContent={enteringFadeRise}
          icon={
            <MaterialCommunityIcons
              name="clock-time-eight"
              size={statsIconWrapSize * (34 / 42)}
              color="#00caacff"
            />
          }
          value={learningTimeLabel}
          label={t(
            "components.flashcards.courseFinishedPanel.courseFinishedPanel.label.czasNauki"
          )}
          styles={styles}
          scale={scale}
          iconWrapSize={statsIconWrapSize}
        />
      </View>

      <Animated.View
        testID="course-finished-action-region"
        style={[
          styles.actions,
          {
            ...regionExtent(actionHeight),
            marginTop: heightFor(LAYOUT_PERCENTAGES.statsCardsGap),
          },
        ]}
        entering={enteringFadeRise(ACTIONS_DELAY)}
      >
        <MyButton
          text={t(
            "components.flashcards.courseFinishedPanel.courseFinishedPanel.text.wrocDoKursow"
          )}
          width="100%"
          color="my_green"
          onPress={onBackToCourses}
          style={{
            height: actionHeight,
            minHeight: 48,
            borderRadius: scaled(11),
          }}
          textStyle={{
            fontSize: scaledFont(16, 16),
          }}
        />
      </Animated.View>
      <View
        testID="course-finished-bottom-inset"
        style={{ height: proportionalLayout.verticalInset }}
      />
    </ScrollView>
  );
}
