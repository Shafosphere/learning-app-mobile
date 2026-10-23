import { useDueReviews } from "@/src/contexts/DueReviewsContext";
import { createNavbarLayoutTransition, NavbarLayoutContext, NavbarLayoutTransitionContext } from "@/src/contexts/NavbarLayoutContext";
import { CourseTitleMarquee } from "@/src/components/course/CourseTitleMarquee";
import { resolveCourseIconProps } from "@/src/constants/customCourse";
import { getFlagSource } from "@/src/constants/languageFlags";
import { OFFICIAL_PACKS } from "@/src/constants/officialPacks";
import { getCoursePlayRoute } from "@/src/features/customCourse/coursePlayRoute";
import { useOpenCoursePanel } from "@/src/hooks/useOpenCoursePanel";
import { usePopupAnchorSetter } from "@/src/contexts/PopupContext";
import { useQuote } from "@/src/contexts/QuoteContext";
import { useSettings, useThemeSettings } from "@/src/contexts/SettingsContext";
import { getCustomCourseById, type CustomCourseRecord } from "@/src/db/sqlite/db";
import type { LanguageCourse } from "@/src/types/course";
import { Image } from "expo-image";
import * as NavigationBar from "expo-navigation-bar";
import { usePathname, useRouter } from "expo-router";
import { CoachmarkAnchor } from "@edwardloopez/react-native-coachmark";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Animated,
  Easing,
  Keyboard,
  type LayoutChangeEvent,
  Platform,
  Pressable,
  StatusBar,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import NavbarStatsRotator from "./NavbarStatsRotator";
import NavbarMascot from "./NavbarMascot";
import { useStyles } from "./navbar-styles";
import { TabSelectionIndicator, useTabIndicatorLayout } from "@/src/components/navigation/TabSelectionIndicator";

import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import Foundation from "@expo/vector-icons/Foundation";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

type NavbarProps = {
  children?: ReactNode;
};

const REVIEW_MINIGAME_PREFIX = "/review/minigames";
const REVIEW_SESSION_PATHS = new Set(["/review/brain", "/review/table"]);
const FLASHCARDS_PATHS = new Set([
  "/flashcards",
  "/course-entry-settings",
]);

const BOTTOM_NAV_ICONS = {
  review: require("@/assets/icons/navbar/colored/hourglass_border_3x_outside.svg"),
  home: require("@/assets/icons/navbar/colored/house_border_3x_outside.svg"),
  play: require("@/assets/icons/navbar/colored/gamepad_border_3x_outside.svg"),
  completed: require("@/assets/icons/navbar/colored/puchar_border_3x_outside.svg"),
  settings: require("@/assets/icons/navbar/colored/settings_border_3x_outside.svg"),
};

type BottomNavSection = keyof typeof BOTTOM_NAV_ICONS;
const BOTTOM_NAV_ORDER: readonly BottomNavSection[] = ["review", "home", "play", "completed", "settings"];

// Match the original glyph artwork at its existing font size (512 units per em).
const BOTTOM_NAV_ICON_BOUNDS = {
  review: { width: 18, height: 24 },
  home: { width: (353 * 28) / 512, height: (388 * 28) / 512 },
  play: { width: 33, height: 16.5 },
  completed: { width: (448.615 * 26) / 512, height: (447.6 * 26) / 512 },
  settings: { width: (447.81 * 24) / 512, height: (460 * 24) / 512 },
};

function getActiveBottomNavSection(pathname: string): BottomNavSection | null {
  if (pathname === "/") return "home";
  if (FLASHCARDS_PATHS.has(pathname)) return "play";
  if (pathname === "/review" || pathname.startsWith("/review/")) return "review";
  if (pathname === "/completed-courses" || pathname.startsWith("/completed-courses/")) return "completed";
  if (pathname === "/settings" || pathname.startsWith("/settings/")) return "settings";
  return null;
}

function BottomNavVisual({
  section,
  selected,
  children,
  badge,
}: {
  section: BottomNavSection;
  selected: boolean;
  children: ReactNode;
  badge?: ReactNode;
}) {
  const styles = useStyles();
  const [coloredIconDisplayed, setColoredIconDisplayed] = useState(false);
  const showColoredIcon = selected && coloredIconDisplayed;

  return (
    <>
      <View pointerEvents="none" style={styles.bottomIconContent}>
        <View
          accessibilityElementsHidden={showColoredIcon}
          importantForAccessibility={showColoredIcon ? "no-hide-descendants" : "auto"}
          style={[styles.bottomIconScale, showColoredIcon && styles.bottomInactiveIconHidden]}
        >
          {children}
        </View>
        {/* Keep SVGs mounted between selections; retain the glyph until native display confirms readiness. */}
        <Image
          testID={`navbar-${section}-${selected ? "active" : "colored"}-icon`}
          source={BOTTOM_NAV_ICONS[section]}
          contentFit="contain"
          accessible={false}
          cachePolicy="memory-disk"
          transition={0}
          onDisplay={() => setColoredIconDisplayed(true)}
          onError={() => setColoredIconDisplayed(false)}
          style={[
            styles.bottomIconImage,
            BOTTOM_NAV_ICON_BOUNDS[section],
            !selected && styles.bottomInactiveIconHidden,
          ]}
        />
        {badge}
      </View>
    </>
  );
}

// Broad provider updates may reach this connector. Only selected, stable values
// reach the frame; course subscriptions and metadata state live in the buttons.
export default function Navbar({ children }: NavbarProps) {
  const { triggerQuote } = useQuote();
  const { dueReviewCount, refreshDueReviewCount } = useDueReviews();
  return (
    <NavbarFrame
      triggerQuote={triggerQuote}
      dueReviewCount={dueReviewCount}
      refreshDueReviewCount={refreshDueReviewCount}
    >
      {children}
    </NavbarFrame>
  );
}

type NavbarFrameProps = NavbarProps & {
  triggerQuote: ReturnType<typeof useQuote>["triggerQuote"];
  dueReviewCount: number;
  refreshDueReviewCount: () => Promise<void>;
};

const NavbarFrame = memo(function NavbarFrame({
  children,
  triggerQuote,
  dueReviewCount,
  refreshDueReviewCount,
}: NavbarFrameProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const activeBottomSection = getActiveBottomNavSection(pathname);
  const bottomIndicator = useTabIndicatorLayout(BOTTOM_NAV_ORDER);
  const { onTabLayout } = bottomIndicator;
  const onPlayLayout = useCallback((event: LayoutChangeEvent) => onTabLayout("play", event), [onTabLayout]);
  const setPopupAnchorX = usePopupAnchorSetter();
  const { theme, toggleTheme, colors } = useThemeSettings();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const statusBarHeight =
    Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;
  const topPad = Math.max(statusBarHeight, insets.top);
  const bottomPad = Math.max(insets.bottom, 12);
  const { width: screenWidth } = useWindowDimensions();
  const [mascotTapReaction, setMascotTapReaction] = useState({ id: 0, count: 0, rage: false });

  const logoTapRef = useRef<{ count: number; ts: number }>({ count: 0, ts: 0 });
  const logoButtonRef = useRef<View | null>(null);
  const [compactStudyLayout, setCompactStudyLayout] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(() => Keyboard.isVisible());
  const keyboardDurationRef = useRef(250);
  const topBarVisibility = useRef(new Animated.Value(1)).current;
  const layoutTransition = useMemo(createNavbarLayoutTransition, []);
  const settledTopBarVisibilityRef = useRef(1);
  const collapseTopBar = pathname === "/flashcards" && compactStudyLayout && keyboardVisible;

  useEffect(() => {
    const subscriptions = [
      Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", (event) => {
        keyboardDurationRef.current = event.duration > 0 ? event.duration : 250;
        setKeyboardVisible(true);
      }),
      Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", (event) => {
        keyboardDurationRef.current = event.duration > 0 ? event.duration : 250;
        setKeyboardVisible(false);
      }),
    ];
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, []);

  useLayoutEffect(() => {
    const target = collapseTopBar ? 0 : 1;
    if (!layoutTransition.isRunning() && settledTopBarVisibilityRef.current === target) return;
    layoutTransition.start();
    let completionFrame: number | undefined;
    const animation = Animated.timing(topBarVisibility, {
      toValue: target,
      duration: keyboardDurationRef.current,
      easing: Easing.inOut(Easing.ease),
      // Height must participate in layout so the content moves with the bar.
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      if (!finished) return;
      // Let the final native layout arrive before consumers commit measurements.
      completionFrame = requestAnimationFrame(() => {
        settledTopBarVisibilityRef.current = target;
        layoutTransition.finish();
      });
    });
    return () => {
      animation.stop();
      if (completionFrame !== undefined) cancelAnimationFrame(completionFrame);
    };
  }, [collapseTopBar, layoutTransition, topBarVisibility]);

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

  const handleLogoPress = useCallback(() => {
    const now = Date.now();
    const withinWindow = now - logoTapRef.current.ts < 2000;
    logoTapRef.current.ts = now;
    logoTapRef.current.count = withinWindow ? logoTapRef.current.count + 1 : 1;

    const rage = logoTapRef.current.count >= 7;
    const count = logoTapRef.current.count;
    setMascotTapReaction((current) => ({ id: current.id + 1, count, rage }));

    if (rage) {
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

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      await refreshDueReviewCount();
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, refreshDueReviewCount]);

  const handleStatsPress = useCallback(() => router.push("/stats"), [router]);

  const handleReviewPress = () => {
    router.dismissTo("/review");
  };

  const handleHomePress = () => {
    router.push("/");
  };

  const handleSettingsPress = () => {
    router.push("/settings");
  };
  const handleCompletedCoursesPress = () => {
    router.push("/completed-courses");
  };
  const reviewBadgeBackground =
    dueReviewCount > 0 ? colors.my_red : colors.my_green;
  const reviewBadgeTextColor =
    dueReviewCount > 0 ? colors.lightbg : colors.darkbg;
  const formattedReviewCount =
    dueReviewCount > 999 ? "999+" : String(dueReviewCount);
  const reviewAccessibilityLabel = t(
    "components.navbar.navbar.accessibilityLabel.przejdzDoPowtorekValue",
    {
      count: dueReviewCount,
    },
  );
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
    <NavbarLayoutContext.Provider value={setCompactStudyLayout}>
    <NavbarLayoutTransitionContext.Provider value={layoutTransition}>
    <View style={styles.layout}>
      <View style={[styles.topBarContainer, { paddingTop: topPad }]}>
        <Animated.View
          testID="navbar-top-bar-collapse"
          pointerEvents={collapseTopBar ? "none" : "auto"}
          accessibilityElementsHidden={collapseTopBar}
          importantForAccessibility={collapseTopBar ? "no-hide-descendants" : "auto"}
          style={{
            height: topBarVisibility.interpolate({ inputRange: [0, 1], outputRange: [0, 50] }),
            opacity: topBarVisibility,
            overflow: collapseTopBar ? "hidden" : "visible",
          }}
        >
        <View style={styles.topBar} onLayout={updatePopupAnchor}>
          <View style={styles.leftGroup}>
            <TouchableOpacity
              ref={logoButtonRef}
              onPress={handleLogoPress}
              onLayout={updatePopupAnchor}
              style={styles.logoButton}
              accessibilityRole="button"
              accessibilityLabel={t(
                "components.navbar.navbar.accessibilityLabel.przejdzDoStronyGlownej"
              )}
            >
              <NavbarMascot tapReaction={mascotTapReaction} />
            </TouchableOpacity>
            <ActiveCourseButton />
          </View>

          <View style={styles.rightGroup}>
            <CoachmarkAnchor id="flashcards-stats-button" shape="rect" radius={18}>
              <NavbarStatsRotator onPress={handleStatsPress} />
            </CoachmarkAnchor>
            <CoachmarkAnchor id="flashcards-theme-button" shape="rect" radius={18}>
              <Pressable
                style={({ pressed }) => [
                  styles.iconButton,
                  pressed && styles.iconButtonPressed,
                ]}
                onPress={toggleTheme}
                accessibilityRole="button"
                accessibilityLabel={t(
                  "components.navbar.navbar.accessibilityLabel.przelaczMotyw"
                )}
              >
                <MaterialIcons
                  style={styles.icon}
                  name="dark-mode"
                  size={24}
                  color={colors.headline}
                />
              </Pressable>
            </CoachmarkAnchor>
          </View>
        </View>
        </Animated.View>
      </View>

      <View style={styles.content}>
        <View style={styles.contentInner}>{children}</View>
      </View>

      {shouldHideBottomBar ? null : (
        <View style={[styles.bottomBarContainer, { paddingBottom: bottomPad }]}>
          <View style={styles.bottomBar} onLayout={bottomIndicator.onLayout}>
            {activeBottomSection && bottomIndicator.frames[activeBottomSection] ? (
              <TabSelectionIndicator
                frame={bottomIndicator.frames[activeBottomSection]}
                layoutKey={bottomIndicator.layoutKey}
                selectionKey={activeBottomSection}
                testID="navbar-selection-indicator"
                backgroundTestID={`navbar-${activeBottomSection}-active-background`}
                lineTestID={`navbar-${activeBottomSection}-active-indicator`}
              />
            ) : null}
            <Pressable
              style={styles.bottomIconButton}
              onLayout={(event) => onTabLayout("review", event)}
              onPress={handleReviewPress}
              accessibilityRole="button"
              accessibilityState={{ selected: activeBottomSection === "review" }}
              accessibilityLabel={reviewAccessibilityLabel}
            >
              <CoachmarkAnchor
                id="flashcards-review-button"
                shape="rect"
                radius={18}
                style={styles.bottomCoachmarkOverlay}
              >
                <View collapsable={false} style={styles.bottomCoachmarkTarget} />
              </CoachmarkAnchor>
              <BottomNavVisual
                section="review"
                selected={activeBottomSection === "review"}
                badge={
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
                }
              >
                <FontAwesome5
                  name="hourglass-end"
                  size={24}
                  color={colors.headline}
                />
              </BottomNavVisual>
            </Pressable>

            <Pressable
              style={styles.bottomIconButton}
              onLayout={(event) => onTabLayout("home", event)}
              onPress={handleHomePress}
              accessibilityRole="button"
              accessibilityState={{ selected: activeBottomSection === "home" }}
              accessibilityLabel={t(
                "components.navbar.navbar.accessibilityLabel.przejdzDoMenuGlownego"
              )}
            >
              <CoachmarkAnchor
                id="flashcards-home-button"
                shape="rect"
                radius={18}
                style={styles.bottomCoachmarkOverlay}
              >
                <View collapsable={false} style={styles.bottomCoachmarkTarget} />
              </CoachmarkAnchor>
              <BottomNavVisual section="home" selected={activeBottomSection === "home"}>
                <Foundation name="home" size={28} color={colors.headline} />
              </BottomNavVisual>
            </Pressable>

            <CoursePlayButton onLayout={onPlayLayout} />

            <Pressable
              style={styles.bottomIconButton}
              onLayout={(event) => onTabLayout("completed", event)}
              onPress={handleCompletedCoursesPress}
              accessibilityRole="button"
              accessibilityState={{ selected: activeBottomSection === "completed" }}
              accessibilityLabel={t(
                "components.navbar.navbar.accessibilityLabel.przejdzDoUkonczonychKursow"
              )}
            >
              <CoachmarkAnchor
                id="flashcards-completed-courses-button"
                shape="rect"
                radius={18}
                style={styles.bottomCoachmarkOverlay}
              >
                <View collapsable={false} style={styles.bottomCoachmarkTarget} />
              </CoachmarkAnchor>
              <BottomNavVisual section="completed" selected={activeBottomSection === "completed"}>
                <Ionicons name="trophy" size={26} color={colors.headline} />
              </BottomNavVisual>
            </Pressable>

            <Pressable
              style={styles.bottomIconButton}
              onLayout={(event) => onTabLayout("settings", event)}
              onPress={handleSettingsPress}
              accessibilityRole="button"
              accessibilityState={{ selected: activeBottomSection === "settings" }}
              accessibilityLabel={t(
                "components.navbar.navbar.accessibilityLabel.przejdzDoUstawien"
              )}
            >
              <CoachmarkAnchor
                id="flashcards-settings-button"
                shape="rect"
                radius={18}
                style={styles.bottomCoachmarkOverlay}
              >
                <View collapsable={false} style={styles.bottomCoachmarkTarget} />
              </CoachmarkAnchor>
              <BottomNavVisual section="settings" selected={activeBottomSection === "settings"}>
                <Ionicons
                  style={styles.icon}
                  name="settings-sharp"
                  size={24}
                  color={colors.headline}
                />
              </BottomNavVisual>
            </Pressable>
          </View>
        </View>
      )}
    </View>
    </NavbarLayoutTransitionContext.Provider>
    </NavbarLayoutContext.Provider>
  );
});

const ActiveCourseButton = memo(function ActiveCourseButton() {
  const { t } = useTranslation();
  const openCoursePanel = useOpenCoursePanel();
  const pathname = usePathname();
  const { activeCustomCourseId, activeCourse, selectedLevel } = useSettings();
  const { colors } = useThemeSettings();
  const styles = useStyles();
  const [loaded, setLoaded] = useState<{
    courseId: number | null;
    course: CustomCourseRecord | null;
  }>({ courseId: activeCustomCourseId, course: null });
  const [editRevision, setEditRevision] = useState(0);
  const previousLocation = useRef({ pathname, courseId: activeCustomCourseId });

  // Reset during selection render, so A -> B -> A cannot reuse A's old row
  // while its new request is pending. This state belongs only to this button.
  if (loaded.courseId !== activeCustomCourseId) {
    setLoaded({ courseId: activeCustomCourseId, course: null });
  }
  const customCourse = loaded.courseId === activeCustomCourseId ? loaded.course : null;
  const displayedCustomCourse =
    activeCustomCourseId != null ? customCourse : null;
  const displayedBuiltinCourse =
    activeCustomCourseId == null ? (activeCourse as LanguageCourse | null) : null;

  useEffect(() => {
    const previous = previousLocation.current;
    previousLocation.current = { pathname, courseId: activeCustomCourseId };
    if (
      previous.pathname === "/editcourse" && pathname !== "/editcourse" &&
      previous.courseId === activeCustomCourseId && activeCustomCourseId != null
    ) {
      setEditRevision((revision) => revision + 1);
    }
  }, [pathname, activeCustomCourseId]);

  useEffect(() => {
    if (activeCustomCourseId == null) return;
    let cancelled = false;
    getCustomCourseById(activeCustomCourseId)
      .then((course) => {
        if (!cancelled) setLoaded({ courseId: activeCustomCourseId, course });
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to load active custom course", error);
        setLoaded({ courseId: activeCustomCourseId, course: null });
      });
    return () => { cancelled = true; };
  }, [activeCustomCourseId, editRevision]);

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
      return t(
        "components.navbar.navbar.accessibilityLabel.kursValueOtworzPanelKursow",
        {
          course: displayedCustomCourse.name,
        },
      );
    }

    if (
      displayedBuiltinCourse?.sourceLang &&
      displayedBuiltinCourse?.targetLang
    ) {
      const sourceLang = displayedBuiltinCourse.sourceLang.toUpperCase();
      const targetLang = displayedBuiltinCourse.targetLang.toUpperCase();

      if (selectedLevel) {
        return t(
          "components.navbar.navbar.accessibilityLabel.kursValueDoValuePoziomValueOtworzPanelKursow",
          {
            sourceLang,
            targetLang,
            level: selectedLevel,
          },
        );
      }

      return t(
        "components.navbar.navbar.accessibilityLabel.kursValueDoValueOtworzPanelKursow",
        {
          sourceLang,
          targetLang,
        },
      );
    }

    return t(
      "components.navbar.navbar.accessibilityLabel.wybierzKursJezykowy",
    );
  }, [displayedBuiltinCourse, displayedCustomCourse, selectedLevel, t]);

  const courseIconProps = useMemo(() => {
    if (!displayedCustomCourse) return null;
    return resolveCourseIconProps(
      displayedCustomCourse.iconId,
      displayedCustomCourse.iconColor ?? colors.headline,
    );
  }, [displayedCustomCourse, colors.headline]);

  const courseGraphic = displayedCustomCourse ? (
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
          size={30}
          color={courseIconProps.icon.color}
        />
      ) : (
        <Ionicons
          name="person-circle-outline"
          size={30}
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

  return (
    <CoachmarkAnchor
      id="flashcards-course-button"
      shape="rect"
      radius={18}
      style={styles.courseAnchor}
    >
      <TouchableOpacity
        onPress={openCoursePanel}
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
    </CoachmarkAnchor>
  );
});

const CoursePlayButton = memo(function CoursePlayButton({ onLayout }: { onLayout: (event: LayoutChangeEvent) => void }) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const selected = getActiveBottomNavSection(pathname) === "play";
  const openCoursePanel = useOpenCoursePanel();
  const styles = useStyles();
  const { colors } = useThemeSettings();
  const {
    activeCustomCourseId,
    activeCustomCourseIdHydrated,
    customCourseEntrySettingsSeenHydrated,
    hasSeenCustomCourseEntrySettings,
    selectedLevel,
    activeCourse,
    pinnedOfficialCourseIds,
    setActiveCustomCourseId,
  } = useSettings();
  const handlePadPress = async () => {
    if (FLASHCARDS_PATHS.has(pathname) || !activeCustomCourseIdHydrated) {
      return;
    }

    if (activeCustomCourseId != null) {
      const route = getCoursePlayRoute(
        activeCustomCourseId,
        customCourseEntrySettingsSeenHydrated,
        hasSeenCustomCourseEntrySettings,
      );
      if (route) router.push(route);
      return;
    }

    if (pinnedOfficialCourseIds.length > 0) {
      if (!customCourseEntrySettingsSeenHydrated) return;
      const firstPinned = pinnedOfficialCourseIds[0];
      await setActiveCustomCourseId(firstPinned);
      const route = getCoursePlayRoute(
        firstPinned,
        customCourseEntrySettingsSeenHydrated,
        hasSeenCustomCourseEntrySettings,
      );
      if (route) router.push(route);
      return;
    }

    const hasCourse =
      activeCourse?.sourceLangId != null && activeCourse?.targetLangId != null;

    if (hasCourse && selectedLevel) {
      router.push("/flashcards");
      return;
    }

    openCoursePanel();
  };

  return (
    <Pressable
      style={[styles.bottomIconButton, styles.bottomCenterButton]}
      onLayout={onLayout}
      onPress={handlePadPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={t(
        "components.navbar.navbar.accessibilityLabel.przejdzDoGryFiszek"
      )}
    >
      <CoachmarkAnchor
        id="flashcards-game-button"
        shape="rect"
        radius={24}
        style={styles.bottomCoachmarkOverlay}
      >
        <View collapsable={false} style={styles.bottomCoachmarkTarget} />
      </CoachmarkAnchor>
      <BottomNavVisual section="play" selected={selected}>
        <FontAwesome5 name="gamepad" size={24} color={colors.headline} />
      </BottomNavVisual>
    </Pressable>
  );
});
