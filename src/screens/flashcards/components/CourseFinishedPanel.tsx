import MyButton from "@/src/components/button/button";
import BoxSkin from "@/src/components/Box/Skin/BoxSkin";
import type { Face } from "@/src/components/Box/Skin/boxFaces";
import Confetti from "@/src/components/confetti/Confetti";
import { resolveCourseIconProps } from "@/src/constants/customCourse";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import type { ImageSourcePropType } from "react-native";
import AntDesign from "@expo/vector-icons/AntDesign";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Octicons from "@expo/vector-icons/Octicons";
import { Text, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  ZoomIn,
  useReducedMotion,
} from "react-native-reanimated";
import { useStyles } from "./CourseFinishedPanel-styles";

const BOX_SHADOW_SOURCE = require("@/assets/illustrations/mascot-box/body/shadow.svg");

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
}: StatsCardProps) {
  return (
    <Animated.View style={styles.statsCard} entering={enteringCard(cardDelay)}>
      <Animated.View
        style={styles.statsCardContent}
        entering={enteringContent(contentDelay)}
      >
        <View style={styles.statsIconWrap}>{icon}</View>
        <Text
          style={styles.statsValue}
          allowFontScaling
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.72}
          maxFontSizeMultiplier={1.25}
        >
          {value}
        </Text>
        <Text
          style={styles.statsLabel}
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
  const styles = useStyles();
  const reduceMotion = useReducedMotion();
  const { width: screenWidth, fontScale } = useWindowDimensions();
  const [boxFace, setBoxFace] = useState<Face>("surprised");
  const [showConfetti, setShowConfetti] = useState(true);
  const hasCustomCourseGraphic =
    Boolean(courseIconProps?.mainImageSource) ||
    Boolean(courseIconProps?.icon) ||
    Boolean(customCourseFlagSource);
  const useVerticalBadgeLayout = screenWidth < 360 || fontScale > 1.2;
  const useStackedStatsLayout = screenWidth < 390 || fontScale > 1.15;
  const enteringFadeRise = (delay: number) => buildFadeRise(delay, reduceMotion);
  const enteringSoftFade = (delay: number) => buildSoftFade(delay, reduceMotion);
  const enteringBadge = (delay: number) => buildBadgeZoom(delay, reduceMotion);
  const enteringLogo = (delay: number) => buildLogoPop(delay, reduceMotion);
  const enteringCard = (delay: number) => buildCardPop(delay, reduceMotion);

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
    <View style={styles.container} testID="course-finished-panel">
      <Confetti generateConfetti={showConfetti} />
      <Animated.Text
        style={styles.heading}
        entering={enteringFadeRise(HEADING_DELAY)}
        allowFontScaling
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.76}
        maxFontSizeMultiplier={1.25}
      >
        Gratulacje!
      </Animated.Text>
      <Animated.Text
        style={styles.subheading}
        entering={enteringSoftFade(SUBHEADING_DELAY)}
        allowFontScaling
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        maxFontSizeMultiplier={1.2}
      >
        Ukończyłeś kurs
      </Animated.Text>

      <Animated.View
        style={[
          styles.courseBadge,
          useVerticalBadgeLayout && styles.courseBadgeStacked,
        ]}
        entering={enteringBadge(BADGE_DELAY)}
      >
        {hasCustomCourseGraphic ? (
          <View style={styles.customCourseIconWrapper}>
            {courseIconProps?.mainImageSource ? (
              <Image
                source={courseIconProps.mainImageSource}
                style={styles.customCourseMainImage}
                contentFit="contain"
              />
            ) : courseIconProps?.icon ? (
              <courseIconProps.icon.Component
                name={courseIconProps.icon.name as never}
                size={24}
                color={courseIconProps.icon.color}
              />
            ) : (
              <Ionicons
                name="person-circle-outline"
                size={24}
                color={styles.courseName.color}
              />
            )}
            {customCourseFlagSource ? (
              <Image
                source={customCourseFlagSource}
                style={styles.customCourseFlag}
              />
            ) : null}
          </View>
        ) : courseFlagSource ? (
          <Image
            source={courseFlagSource}
            style={styles.courseFlag}
            contentFit="cover"
          />
        ) : null}
        <Text
          style={styles.courseName}
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
        style={styles.logoWrap}
        entering={enteringLogo(LOGO_DELAY)}
      >
        <View style={styles.boxSkinWrap}>
          <Image
            source={BOX_SHADOW_SOURCE}
            style={styles.boxShadow}
            contentFit="contain"
          />
          <BoxSkin wordCount={0} face={boxFace} showHat />
        </View>
      </Animated.View>

      <Animated.Text
        style={styles.statsHeading}
        entering={enteringSoftFade(STATS_HEADING_DELAY)}
        allowFontScaling
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        maxFontSizeMultiplier={1.2}
      >
        Twój wynik
      </Animated.Text>

      <View
        style={[styles.statsRow, useStackedStatsLayout && styles.statsRowStacked]}
      >
        <StatsCardAnimated
          cardDelay={STATS_CARD_DELAYS[0]}
          contentDelay={STATS_CONTENT_DELAYS[0]}
          enteringCard={enteringCard}
          enteringContent={enteringFadeRise}
          icon={<Octicons name="check-circle-fill" size={30} color="#00caacff" />}
          value={cardsCountLabel}
          label="fiszek"
          styles={styles}
        />

        <StatsCardAnimated
          cardDelay={STATS_CARD_DELAYS[1]}
          contentDelay={STATS_CONTENT_DELAYS[1]}
          enteringCard={enteringCard}
          enteringContent={enteringFadeRise}
          icon={<AntDesign name="star" size={34} color="#fde24f" />}
          value={accuracyLabel}
          label="skuteczność"
          styles={styles}
        />

        <StatsCardAnimated
          cardDelay={STATS_CARD_DELAYS[2]}
          contentDelay={STATS_CONTENT_DELAYS[2]}
          enteringCard={enteringCard}
          enteringContent={enteringFadeRise}
          icon={
            <MaterialCommunityIcons
              name="clock-time-eight"
              size={34}
              color="#00caacff"
            />
          }
          value={learningTimeLabel}
          label="czas nauki"
          styles={styles}
        />
      </View>

      <Animated.View
        style={styles.actions}
        entering={enteringFadeRise(ACTIONS_DELAY)}
      >
        <MyButton
          text="Wróć do kursów"
          width="100%"
          color="my_green"
          onPress={onBackToCourses}
        />
      </Animated.View>
    </View>
  );
}
