import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import {
  Platform,
  Pressable,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useStyles } from "./navbar-styles";
import { Image } from "expo-image";
import { useSettings } from "@/src/contexts/SettingsContext";
import { getFlagSource } from "@/src/constants/languageFlags";
import {
  getCustomCourseById,
  type CustomCourseRecord,
} from "@/src/db/sqlite/db";
import { getCourseIconById } from "@/src/constants/customCourse";
import { OFFICIAL_PACKS } from "@/src/constants/officialPacks";
import type { LanguageCourse } from "@/src/types/course";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLearningStats } from "@/src/contexts/LearningStatsContext";

import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";

const logo = require("@/assets/illustrations/navbar/logo.png");

const MAX_NAV_COURSE_NAME_LENGTH = 13;

const truncateCourseName = (name: string): string => {
  if (!name) {
    return "";
  }
  if (name.length <= MAX_NAV_COURSE_NAME_LENGTH) {
    return name;
  }
  return `${name.slice(0, MAX_NAV_COURSE_NAME_LENGTH - 1)}…`;
};

type NavbarProps = {
  children?: ReactNode;
};

export default function Navbar({ children }: NavbarProps) {
  const router = useRouter();
  const {
    toggleTheme,
    activeCustomCourseId,
    selectedLevel,
    activeCourse,
    colors,
  } = useSettings();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const statusBarHeight =
    Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0;
  const topPad = Math.max(statusBarHeight, insets.top);
  const bottomPad = Math.max(insets.bottom, 12);
  const [customCourse, setCustomCourse] =
    useState<CustomCourseRecord | null>(null);
  type DisplayCourse =
    | { kind: "custom"; course: CustomCourseRecord }
    | { kind: "builtin"; course: LanguageCourse };
  const derivedDisplayCourse = useMemo<DisplayCourse | null>(() => {
    if (activeCustomCourseId != null && customCourse) {
      return { kind: "custom", course: customCourse };
    }

    if (activeCustomCourseId == null && activeCourse) {
      return { kind: "builtin", course: activeCourse as LanguageCourse };
    }

    return null;
  }, [activeCourse, activeCustomCourseId, customCourse]);
  const [displayCourse, setDisplayCourse] = useState<DisplayCourse | null>(
    derivedDisplayCourse
  );
  const { knownWordsCount } = useLearningStats();

  useEffect(() => {
    let isMounted = true;

    if (activeCustomCourseId == null) {
      setCustomCourse(null);
      return () => {
        isMounted = false;
      };
    }

    getCustomCourseById(activeCustomCourseId)
      .then((course) => {
        if (isMounted) {
          setCustomCourse(course);
          if (course) {
            setDisplayCourse({ kind: "custom", course });
          }
        }
      })
      .catch((error) => {
        console.error("Failed to load active custom course", error);
        if (isMounted) {
          setCustomCourse(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeCustomCourseId]);

  useEffect(() => {
    if (derivedDisplayCourse) {
      setDisplayCourse(derivedDisplayCourse);
    }
  }, [derivedDisplayCourse]);

  const displayedCustomCourse =
    displayCourse?.kind === "custom" ? displayCourse.course : null;
  const displayedBuiltinCourse =
    displayCourse?.kind === "builtin" ? displayCourse.course : null;

  const courseFlagSource = useMemo(() => {
    if (!displayedBuiltinCourse?.sourceLang) {
      return undefined;
    }

    return getFlagSource(displayedBuiltinCourse.sourceLang);
  }, [displayedBuiltinCourse]);

  const customCourseFlagSource = useMemo(() => {
    if (!displayedCustomCourse?.slug) {
      return undefined;
    }

    const manifest = OFFICIAL_PACKS.find(
      (pack) => pack.slug === displayedCustomCourse.slug
    );
    const sourceLang = manifest?.sourceLang;
    if (!sourceLang) {
      return undefined;
    }

    return getFlagSource(sourceLang);
  }, [displayedCustomCourse]);

  const courseAccessibilityLabel = useMemo(() => {
    if (displayedCustomCourse) {
      return `Kurs ${displayedCustomCourse.name}. Otwórz panel kursów.`;
    }

    if (
      displayedBuiltinCourse?.sourceLang &&
      displayedBuiltinCourse?.targetLang
    ) {
      return `Kurs ${displayedBuiltinCourse.sourceLang.toUpperCase()} do ${displayedBuiltinCourse.targetLang.toUpperCase()}. Otwórz panel kursów.`;
    }

    return "Wybierz kurs językowy";
  }, [displayedBuiltinCourse, displayedCustomCourse]);

  const courseIconMeta = useMemo(() => {
    if (!displayedCustomCourse) return null;
    return getCourseIconById(displayedCustomCourse.iconId);
  }, [displayedCustomCourse]);

  const CustomCourseIcon = courseIconMeta?.Component;
  const customCourseIconName = courseIconMeta?.name ?? "grid-outline";
  const customCourseIconColor =
    displayedCustomCourse?.iconColor ?? colors.headline;
  const customCourseDisplayName = displayedCustomCourse
    ? truncateCourseName(displayedCustomCourse.name)
    : "";

  const courseGraphic = displayedCustomCourse ? (
      <View style={styles.customCourseIconWrapper}>
        {CustomCourseIcon ? (
          <CustomCourseIcon
            name={customCourseIconName as never}
            size={24}
            color={customCourseIconColor}
          />
        ) : (
          <Ionicons
            name="person-circle-outline"
            size={24}
            color={colors.headline}
          />
        )}
        {customCourseFlagSource ? (
          <Image source={customCourseFlagSource} style={styles.customCourseFlag} />
        ) : null}
      </View>
    ) : courseFlagSource ? (
      <Image source={courseFlagSource} style={styles.courseFlag} />
    ) : (
      <Ionicons
        name="person-circle-outline"
        size={24}
        color={colors.headline}
      />
    );

  const handlePadPress = () => {
    if (activeCustomCourseId != null) {
      router.push("/flashcards_custom");
      return;
    }

    const hasCourse =
      activeCourse?.sourceLangId != null &&
      activeCourse?.targetLangId != null;

    if (hasCourse && selectedLevel) {
      router.push("/flashcards");
      return;
    }

    router.push("/level");
  };

  const handleReviewPress = () => {
    router.push("/review");
  };

  const handleSettingsPress = () => {
    router.push("/settings");
  };

  return (
    <View style={styles.layout}>
      <View style={[styles.topBarContainer, { paddingTop: topPad }]}>
        <View style={styles.topBar}>
          <View style={styles.leftGroup}>
            <TouchableOpacity
              onPress={() => router.push("/coursepanel")}
              style={styles.courseButton}
              accessibilityRole="button"
              accessibilityLabel={courseAccessibilityLabel}
            >
              {courseGraphic}
              {displayedCustomCourse ? (
                <Text
                  style={styles.courseName}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  allowFontScaling
                >
                  {customCourseDisplayName}
                </Text>
              ) : null}
            </TouchableOpacity>
          </View>

          <View pointerEvents="box-none" style={styles.logoWrapper}>
            <TouchableOpacity
              onPress={() => router.push("/")}
              style={styles.logoButton}
              accessibilityRole="button"
              accessibilityLabel="Przejdź do strony głównej"
            >
              <Image source={logo} style={styles.logo} contentFit="contain" />
            </TouchableOpacity>
          </View>

          <View style={styles.rightGroup}>
            <Pressable
              style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.iconButtonPressed,
              ]}
              onPress={() => router.push("/stats")}
              accessibilityRole="button"
              accessibilityLabel={`Opanowane słówka: ${knownWordsCount}. Przejdź do statystyk`}
            >
              <Text style={styles.counterText} allowFontScaling>
                {knownWordsCount}
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.iconButtonPressed,
              ]}
              onPress={toggleTheme}
            >
              <MaterialIcons
                style={styles.icon}
                name="dark-mode"
                size={24}
                color={colors.headline}
              />
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.contentInner}>{children}</View>
      </View>

      <View style={[styles.bottomBarContainer, { paddingBottom: bottomPad }]}>
        <View style={styles.bottomBar}>
          <Pressable
            style={({ pressed }) => [
              styles.bottomIconButton,
              pressed && styles.bottomIconButtonPressed,
            ]}
            onPress={handleReviewPress}
            accessibilityRole="button"
            accessibilityLabel="Przejdź do powtórek"
          >
            <FontAwesome5
              name="hourglass-end"
              size={24}
              color={colors.headline}
            />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.bottomCenterButton,
              pressed && styles.bottomIconButtonPressed,
            ]}
            onPress={handlePadPress}
            accessibilityRole="button"
            accessibilityLabel="Przejdź do gry fiszek"
          >
            <FontAwesome5 name="gamepad" size={24} color={colors.headline} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.bottomIconButton,
              pressed && styles.bottomIconButtonPressed,
            ]}
            onPress={handleSettingsPress}
            accessibilityRole="button"
            accessibilityLabel="Przejdź do ustawień"
          >
            <Ionicons
              style={styles.icon}
              name="settings-sharp"
              size={24}
              color={colors.headline}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
