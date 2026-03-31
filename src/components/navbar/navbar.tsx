import { CourseTitleMarquee } from "@/src/components/course/CourseTitleMarquee";
import { resolveCourseIconProps } from "@/src/constants/customCourse";
import { getFlagSource } from "@/src/constants/languageFlags";
import { OFFICIAL_PACKS } from "@/src/constants/officialPacks";
import { usePopupAnchorSetter } from "@/src/contexts/PopupContext";
import { useQuote } from "@/src/contexts/QuoteContext";
import { useSettings } from "@/src/contexts/SettingsContext";
import {
  countDueCustomReviews,
  getCustomCourseById,
  getCustomCoursesWithCardCounts,
  type CustomCourseRecord,
} from "@/src/db/sqlite/db";
import type { LanguageCourse } from "@/src/types/course";
import { Image } from "expo-image";
import * as NavigationBar from "expo-navigation-bar";
import { usePathname, useRouter } from "expo-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Platform,
  Pressable,
  StatusBar,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NavbarStatsRotator from "./NavbarStatsRotator";
import { useStyles } from "./navbar-styles";

import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

const logo = require("@/assets/illustrations/navbar/logo.png");

type NavbarProps = {
  children?: ReactNode;
};

const REVIEW_MINIGAME_PREFIX = "/review/minigames";
const REVIEW_SESSION_PATHS = new Set(["/review/brain", "/review/table"]);
const FLASHCARDS_PATHS = new Set(["/flashcards", "/flashcards_custom"]);

export default function Navbar({ children }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { triggerQuote } = useQuote();
  const setPopupAnchorX = usePopupAnchorSetter();
  const {
    theme,
    toggleTheme,
    activeCustomCourseId,
    selectedLevel,
    activeCourse,
    colors,
    pinnedOfficialCourseIds,
    setActiveCustomCourseId,
  } = useSettings();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const statusBarHeight =
    Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;
  const topPad = Math.max(statusBarHeight, insets.top);
  const bottomPad = Math.max(insets.bottom, 12);
  const { width: screenWidth } = useWindowDimensions();
  const [customCourse, setCustomCourse] = useState<CustomCourseRecord | null>(
    null,
  );
  const [dueReviewCount, setDueReviewCount] = useState<number>(0);

  const logoTapRef = useRef<{ count: number; ts: number }>({ count: 0, ts: 0 });
  const logoButtonRef = useRef<View | null>(null);

  const displayedCustomCourse =
    activeCustomCourseId != null ? customCourse : null;
  const displayedBuiltinCourse =
    activeCustomCourseId == null ? (activeCourse as LanguageCourse | null) : null;

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    void (async () => {
      try {
        await NavigationBar.setButtonStyleAsync(
          theme === "dark" ? "light" : "dark",
        );
      } catch (error) {
        console.warn("[Navbar] Failed to configure Android navigation bar", error);
      }
    })();
  }, [theme]);

  const updatePopupAnchor = useCallback(() => {
    const node = logoButtonRef.current as unknown as {
      measureInWindow?: (
        cb: (x: number, y: number, width: number, height: number) => void
      ) => void;
    } | null;
    if (!node?.measureInWindow) return;

    node.measureInWindow((x, _y, width) => {
      if (!Number.isFinite(x) || !Number.isFinite(width) || width <= 0) return;
      setPopupAnchorX(x + width / 2);
    });
  }, [setPopupAnchorX]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      updatePopupAnchor();
    });
    return () => cancelAnimationFrame(raf);
  }, [screenWidth, topPad, updatePopupAnchor]);

  useEffect(() => {
    return () => {
      setPopupAnchorX(null);
    };
  }, [setPopupAnchorX]);

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
      (pack) => pack.slug === displayedCustomCourse.slug,
    );
    const flagLang = manifest?.smallFlag ?? manifest?.sourceLang;
    if (!flagLang) {
      return undefined;
    }

    return getFlagSource(flagLang);
  }, [displayedCustomCourse]);

  const courseAccessibilityLabel = useMemo(() => {
    if (displayedCustomCourse) {
      return `Kurs ${displayedCustomCourse.name}. Otwórz panel kursów.`;
    }

    if (
      displayedBuiltinCourse?.sourceLang &&
      displayedBuiltinCourse?.targetLang
    ) {
      return `Kurs ${displayedBuiltinCourse.sourceLang.toUpperCase()} do ${displayedBuiltinCourse.targetLang.toUpperCase()}.Otwórz panel kursów.`;
    }

    return "Wybierz kurs językowy";
  }, [displayedBuiltinCourse, displayedCustomCourse]);

  const courseIconProps = useMemo(() => {
    if (!displayedCustomCourse) return null;
    return resolveCourseIconProps(
      displayedCustomCourse.iconId,
      displayedCustomCourse.iconColor ?? colors.headline,
    );
  }, [displayedCustomCourse, colors.headline]);

  const refreshDueReviewCount = useCallback(async () => {
    const now = Date.now();
    try {
      let total = 0;

      const customRows = await getCustomCoursesWithCardCounts();
      const officialIds = new Set(pinnedOfficialCourseIds);
      const customCoursesToCount = customRows.filter((course) => {
        if (!course.reviewsEnabled) {
          return false;
        }
        if (course.isOfficial) {
          return officialIds.has(course.id);
        }
        return true;
      });
      const customCounts = await Promise.all(
        customCoursesToCount.map(async (course) => {
          try {
            return await countDueCustomReviews(course.id, now);
          } catch (error) {
            console.warn(
              `[Navbar] Failed to count custom reviews for course ${course.id}`,
              error,
            );
            return 0;
          }
        }),
      );
      for (const count of customCounts) {
        total += count;
      }

      setDueReviewCount(total);
    } catch (error) {
      console.warn("[Navbar] Failed to refresh review count", error);
      setDueReviewCount(0);
    }
  }, [pinnedOfficialCourseIds]);

  const handleLogoPress = useCallback(() => {
    const now = Date.now();
    const withinWindow = now - logoTapRef.current.ts < 2000;
    logoTapRef.current.ts = now;
    logoTapRef.current.count = withinWindow ? logoTapRef.current.count + 1 : 1;

    if (logoTapRef.current.count >= 7) {
      triggerQuote({
        trigger: "quote_logo_rage",
        category: "easter",
        cooldownMs: 10 * 1000,
        respectGlobalCooldown: true,
      });
      logoTapRef.current.count = 0;
    }

    if (pathname === "/") {
      return;
    }

    router.push("/");
  }, [pathname, router, triggerQuote]);

  const courseGraphic = displayedCustomCourse ? (
    <View style={styles.customCourseIconWrapper}>
      {courseIconProps?.mainImageSource ? (
        <Image
          source={courseIconProps.mainImageSource}
          style={{ width: 24, height: 24 }}
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
          color={colors.headline}
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
    <Image source={courseFlagSource} style={styles.courseFlag} />
  ) : (
    <Ionicons name="person-circle-outline" size={24} color={colors.headline} />
  );

  const handlePadPress = async () => {
    if (FLASHCARDS_PATHS.has(pathname)) {
      return;
    }

    if (activeCustomCourseId != null) {
      router.push("/flashcards_custom");
      return;
    }

    if (pinnedOfficialCourseIds.length > 0) {
      const firstPinned = pinnedOfficialCourseIds[0];
      await setActiveCustomCourseId(firstPinned);
      router.push("/flashcards_custom");
      return;
    }

    const hasCourse =
      activeCourse?.sourceLangId != null && activeCourse?.targetLangId != null;

    if (hasCourse && selectedLevel) {
      router.push("/flashcards");
      return;
    }

    router.push("/coursepanel");
  };
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      await refreshDueReviewCount();
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshDueReviewCount, pathname]);

  const handleReviewPress = () => {
    router.push("/review");
  };

  const handleSettingsPress = () => {
    router.push("/settings");
  };
  const reviewBadgeBackground =
    dueReviewCount > 0 ? colors.my_red : colors.my_green;
  const reviewBadgeTextColor =
    dueReviewCount > 0 ? colors.lightbg : colors.darkbg;
  const formattedReviewCount =
    dueReviewCount > 999 ? "999+" : String(dueReviewCount);
  const shouldHideBottomBar = useMemo(() => {
    if (!pathname) {
      return false;
    }
    if (pathname.startsWith(REVIEW_MINIGAME_PREFIX)) {
      return true;
    }
    return REVIEW_SESSION_PATHS.has(pathname);
  }, [pathname]);

  return (
    <View style={styles.layout}>
      <View style={[styles.topBarContainer, { paddingTop: topPad }]}>
        <View style={styles.topBar} onLayout={updatePopupAnchor}>
          <View style={styles.leftGroup}>
            <TouchableOpacity
              ref={logoButtonRef}
              onPress={handleLogoPress}
              onLayout={updatePopupAnchor}
              style={styles.logoButton}
              accessibilityRole="button"
              accessibilityLabel="Przejdź do strony głównej"
            >
              <Image source={logo} style={styles.logo} contentFit="contain" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/coursepanel")}
              style={styles.courseButton}
              accessibilityRole="button"
              accessibilityLabel={courseAccessibilityLabel}
            >
              {courseGraphic}
              {displayedCustomCourse ? (
                <CourseTitleMarquee
                  text={displayedCustomCourse.name}
                  containerStyle={styles.courseName}
                  textStyle={styles.courseNameText}
                />
              ) : null}
              {displayedBuiltinCourse && selectedLevel ? (
                <Text style={styles.courseLevel} allowFontScaling>
                  {selectedLevel}
                </Text>
              ) : null}
            </TouchableOpacity>
          </View>

          <View style={styles.rightGroup}>
            <NavbarStatsRotator onPress={() => router.push("/stats")} />
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

      {shouldHideBottomBar ? null : (
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
              <View style={styles.reviewIconWrapper}>
                <FontAwesome5
                  name="hourglass-end"
                  size={24}
                  color={colors.headline}
                />
                <View
                  style={[
                    styles.reviewBadge,
                    { backgroundColor: reviewBadgeBackground },
                  ]}
                >
                  <Text
                    style={[
                      styles.reviewBadgeText,
                      { color: reviewBadgeTextColor },
                    ]}
                    allowFontScaling
                  >
                    {formattedReviewCount}
                  </Text>
                </View>
              </View>
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
      )}
    </View>
  );
}
