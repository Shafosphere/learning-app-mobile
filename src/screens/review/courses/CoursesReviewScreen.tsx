import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, NativeSyntheticEvent, NativeScrollEvent, Pressable, ScrollView, Text, View } from "react-native";

import { useCoachmarkLayerPortal } from "@/src/components/onboarding/CoachmarkLayerPortal";
import { CourseTitleMarquee } from "@/src/components/course/CourseTitleMarquee";
import { REVIEW_COURSES_COACHMARK_STEPS } from "@/src/constants/coachmarkFlows";
import {
  getCourseIconById
} from "@/src/constants/customCourse";
import { getFlagSource } from "@/src/constants/languageFlags";
import { OFFICIAL_PACKS } from "@/src/constants/officialPacks";
import { useSettings } from "@/src/contexts/SettingsContext";
import {
  countDueCustomReviews,
  getCustomCoursesWithCardCounts,
  getOfficialCustomCoursesWithCardCounts,
  type CustomCourseSummary,
} from "@/src/db/sqlite/db";
import { useCoachmarkFlow } from "@/src/hooks/useCoachmarkFlow";
import { DueCountBadge } from "./components/DueCountBadge";
import { ReviewCourseSection } from "./components/ReviewCourseSection";
import { useStyles } from "./CoursesScreen-styles";
import { OfficialCourseReviewItem, OfficialGroup } from "./types";
import { CoachmarkAnchor } from "@edwardloopez/react-native-coachmark";

export default function CoursesReviewScreen() {
  const styles = useStyles();
  const router = useRouter();
  const scrollRef = useRef<ScrollView | null>(null);
  const contentRef = useRef<View | null>(null);
  const firstAvailableCourseRef = useRef<View | null>(null);
  const autoScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoScrollRevealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentScrollYRef = useRef(0);
  const pendingScrollYRef = useRef<number | null>(null);
  const {
    setActiveCustomCourseId,
    pinnedOfficialCourseIds,
  } = useSettings();
  const [customCourses, setCustomCourses] = useState<CustomCourseSummary[]>([]);
  const [customCounts, setCustomCounts] = useState<Record<number, number>>({});
  const [officialCourses, setOfficialCourses] = useState<
    OfficialCourseReviewItem[]
  >([]);
  const [officialCounts, setOfficialCounts] = useState<Record<number, number>>(
    {}
  );
  const [isLoading, setIsLoading] = useState(true);
  const [pendingScrollTargetId, setPendingScrollTargetId] = useState<number | null>(null);
  const [isAutoScrollingToTarget, setIsAutoScrollingToTarget] = useState(false);

  const refreshData = useCallback(async () => {
    const now = Date.now();

    try {
      setIsLoading(true);
      const [allCustomRows, officialRows] = await Promise.all([
        getCustomCoursesWithCardCounts(),
        getOfficialCustomCoursesWithCardCounts(),
      ]);

      const userRows = allCustomRows.filter((row) => !row.isOfficial);
      setCustomCourses(userRows);
      const customEntries = await Promise.all(
        userRows.map(async (course) => {
          if (!course.reviewsEnabled) {
            return [course.id, 0] as const;
          }
          try {
            const count = await countDueCustomReviews(course.id, now);
            return [course.id, count] as const;
          } catch (error) {
            console.warn(
              `Failed to count custom reviews for course ${course.id}`,
              error
            );
            return [course.id, 0] as const;
          }
        })
      );
      const nextCustom: Record<number, number> = {};
      for (const [id, count] of customEntries) {
        nextCustom[id] = count;
      }
      setCustomCounts(nextCustom);

      const mappedOfficialCourses = officialRows.map<OfficialCourseReviewItem>(
        (course) => {
          const manifest = OFFICIAL_PACKS.find(
            (pack) => pack.slug === course.slug
          );
          return {
            ...course,
            sourceLang: manifest?.sourceLang ?? null,
            targetLang: manifest?.targetLang ?? null,
            isMini: manifest?.isMini ?? true,
            smallFlag: manifest?.smallFlag ?? manifest?.sourceLang ?? null,
            position: manifest?.position,
          };
        }
      );
      setOfficialCourses(mappedOfficialCourses);
      const officialEntries = await Promise.all(
        mappedOfficialCourses.map(async (course) => {
          if (!course.reviewsEnabled) {
            return [course.id, 0] as const;
          }
          try {
            const count = await countDueCustomReviews(course.id, now);
            return [course.id, count] as const;
          } catch (error) {
            console.warn(
              `Failed to count official reviews for course ${course.id}`,
              error
            );
            return [course.id, 0] as const;
          }
        })
      );
      const nextOfficial: Record<number, number> = {};
      for (const [id, count] of officialEntries) {
        nextOfficial[id] = count;
      }
      setOfficialCounts(nextOfficial);
    } catch (error) {
      console.error("Failed to load custom/official course counts", error);
      setCustomCourses([]);
      setCustomCounts({});
      setOfficialCourses([]);
      setOfficialCounts({});
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const load = async () => {
        try {
          await refreshData();
        } catch (error) {
          console.error("Failed to refresh review courses", error);
        }
      };

      if (isMounted) void load();

      return () => {
        isMounted = false;
      };
    }, [refreshData])
  );

  const visibleCustomCourses = customCourses.filter(
    (course) => course.reviewsEnabled
  );
  const hasCustomCourses = customCourses.length > 0;
  const hasVisibleCustomCourses = visibleCustomCourses.length > 0;
  const visibleOfficialCourses = officialCourses.filter(
    (course) =>
      pinnedOfficialCourseIds.includes(course.id) && course.reviewsEnabled
  );
  const officialGroups = useMemo<OfficialGroup[]>(() => {
    const groups = new Map<string, OfficialGroup>();

    const ensureGroup = (
      targetLang: string | null,
      sourceLang: string | null
    ): OfficialGroup => {
      const key = `${targetLang ?? "unknown"}-${sourceLang ?? "unknown"}`;
      let group = groups.get(key);
      if (!group) {
        group = {
          key,
          targetLang,
          sourceLang,
          targetFlag: targetLang ? getFlagSource(targetLang) : undefined,
          sourceFlag: sourceLang ? getFlagSource(sourceLang) : undefined,
          courses: [],
        };
        groups.set(key, group);
      }
      return group;
    };

    visibleOfficialCourses.forEach((course) => {
      const group = ensureGroup(course.targetLang, course.sourceLang);
      group.courses.push(course);
    });

    const compareLangs = (
      a: string | null | undefined,
      b: string | null | undefined
    ) => {
      const first = a ?? "";
      const second = b ?? "";
      return first.localeCompare(second);
    };
    const compareByPositionThenName = (
      a: OfficialCourseReviewItem,
      b: OfficialCourseReviewItem
    ) => {
      const aPos = a.position ?? Number.POSITIVE_INFINITY;
      const bPos = b.position ?? Number.POSITIVE_INFINITY;
      if (aPos !== bPos) return aPos - bPos;
      return a.name.localeCompare(b.name);
    };

    groups.forEach((group) => {
      group.courses.sort(compareByPositionThenName);
    });

    return Array.from(groups.values()).sort((a, b) => {
      const targetDiff = compareLangs(a.targetLang, b.targetLang);
      if (targetDiff !== 0) return targetDiff;
      return compareLangs(a.sourceLang, b.sourceLang);
    });
  }, [visibleOfficialCourses]);
  const hasOfficialGroups = officialGroups.length > 0;
  const orderedVisibleOfficialCourses = useMemo(
    () =>
      officialGroups.flatMap((group) => {
        const regularOfficial = (group.courses ?? []).filter(
          (course) => course.isMini === false
        );
        const miniOfficial = (group.courses ?? []).filter(
          (course) => course.isMini !== false
        );

        return [...regularOfficial, ...miniOfficial];
      }),
    [officialGroups]
  );
  const firstAvailableOfficialCourse = orderedVisibleOfficialCourses.find(
    (course) => (officialCounts[course.id] ?? 0) > 0
  );
  const firstAvailableCustomCourse = visibleCustomCourses.find(
    (course) => (customCounts[course.id] ?? 0) > 0
  );
  const firstAvailableCourseId =
    firstAvailableOfficialCourse?.id ?? firstAvailableCustomCourse?.id ?? null;
  const coachmark = useCoachmarkFlow({
    flowKey: "review-courses-guided",
    storageKey: "@review_courses_intro_seen_v1",
    shouldStart: !isLoading && firstAvailableCourseId != null,
    steps: REVIEW_COURSES_COACHMARK_STEPS,
  });
  const currentStepId = coachmark.currentStep?.id ?? null;
  const shouldAutoScrollToCoachmarkTarget =
    currentStepId === "review-courses-step-4" ||
    currentStepId === "review-courses-step-5" ||
    currentStepId === "review-courses-step-6";

  const handleSelectCustomCourse = useCallback(
    (courseId: number) => {
      void (async () => {
        const shouldContinueOnboarding =
          courseId === firstAvailableCourseId &&
          coachmark.currentStep?.id === "review-courses-step-6";
        if (courseId === firstAvailableCourseId) {
          await coachmark.advanceByEvent("open_review_course");
        }
        await setActiveCustomCourseId(courseId);
        router.push({
          pathname: "/review/reviewflashcards",
          params: {
            courseId,
            ...(shouldContinueOnboarding
              ? { onboarding: "review-flashcards" }
              : {}),
          },
        });
      })();
    },
    [coachmark, firstAvailableCourseId, router, setActiveCustomCourseId]
  );
  const coachmarkLayer = useMemo(
    () =>
      coachmark.isActive && !isAutoScrollingToTarget
        ? {
            currentStep: coachmark.currentStep,
            currentIndex: coachmark.currentIndex,
            totalSteps: coachmark.totalSteps,
            canGoBack: coachmark.canGoBack,
            canGoNext: coachmark.canGoNext,
            onBack: coachmark.goBack,
            onNext: coachmark.goNext,
          }
        : null,
    [
      coachmark.canGoBack,
      coachmark.canGoNext,
      coachmark.currentIndex,
      coachmark.currentStep,
      coachmark.goBack,
      coachmark.goNext,
      coachmark.isActive,
      coachmark.totalSteps,
      isAutoScrollingToTarget,
    ]
  );

  useCoachmarkLayerPortal("review-courses-screen", coachmarkLayer);

  const getCourseCoachmarkTargetId = useCallback(
    (courseId: number) =>
      courseId === firstAvailableCourseId ? "review-courses-first-card" : undefined,
    [firstAvailableCourseId]
  );
  const getCourseBadgeCoachmarkTargetId = useCallback(
    (courseId: number) =>
      courseId === firstAvailableCourseId
        ? "review-courses-first-card-badge"
        : undefined,
    [firstAvailableCourseId]
  );
  const getCourseRef = useCallback(
    (courseId: number) =>
      courseId === firstAvailableCourseId ? firstAvailableCourseRef : undefined,
    [firstAvailableCourseId]
  );

  useEffect(() => {
    return () => {
      if (autoScrollTimeoutRef.current) {
        clearTimeout(autoScrollTimeoutRef.current);
      }
      if (autoScrollRevealTimeoutRef.current) {
        clearTimeout(autoScrollRevealTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (firstAvailableCourseId == null) {
      setPendingScrollTargetId(null);
      setIsAutoScrollingToTarget(false);
      pendingScrollYRef.current = null;
      return;
    }

    if (shouldAutoScrollToCoachmarkTarget) {
      setPendingScrollTargetId(firstAvailableCourseId);
    }
  }, [firstAvailableCourseId, shouldAutoScrollToCoachmarkTarget]);

  const finishAutoScroll = useCallback(() => {
    if (autoScrollTimeoutRef.current) {
      clearTimeout(autoScrollTimeoutRef.current);
      autoScrollTimeoutRef.current = null;
    }
    if (autoScrollRevealTimeoutRef.current) {
      clearTimeout(autoScrollRevealTimeoutRef.current);
    }
    pendingScrollYRef.current = null;
    setPendingScrollTargetId(null);
    autoScrollRevealTimeoutRef.current = setTimeout(() => {
      setIsAutoScrollingToTarget(false);
      autoScrollRevealTimeoutRef.current = null;
    }, 140);
  }, []);

  const scrollToFirstAvailableCourse = useCallback(() => {
    const scrollNode = scrollRef.current;
    const contentNode = contentRef.current;
    const courseNode = firstAvailableCourseRef.current;

    if (!scrollNode || !contentNode || !courseNode) {
      return;
    }

    courseNode.measureLayout(
      contentNode,
      (_x, y) => {
        const targetY = Math.max(0, y - 24);
        const distance = Math.abs(currentScrollYRef.current - targetY);
        if (distance <= 2) {
          finishAutoScroll();
          return;
        }

        pendingScrollYRef.current = targetY;
        setIsAutoScrollingToTarget(true);
        scrollNode.scrollTo({ x: 0, y: targetY, animated: true });

        if (autoScrollTimeoutRef.current) {
          clearTimeout(autoScrollTimeoutRef.current);
        }
        autoScrollTimeoutRef.current = setTimeout(() => {
          finishAutoScroll();
        }, 420);
      },
      () => {
        // Retry on the next layout pass if the node is not measurable yet.
      }
    );
  }, [finishAutoScroll]);

  useEffect(() => {
    if (pendingScrollTargetId == null) {
      return;
    }

    requestAnimationFrame(() => {
      scrollToFirstAvailableCourse();
    });
  }, [pendingScrollTargetId, scrollToFirstAvailableCourse]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    currentScrollYRef.current = event.nativeEvent.contentOffset.y;
  }, []);

  const handleScrollSettled = useCallback(() => {
    const pendingScrollY = pendingScrollYRef.current;
    if (pendingScrollY == null) {
      return;
    }

    if (Math.abs(currentScrollYRef.current - pendingScrollY) <= 2) {
      finishAutoScroll();
    }
  }, [finishAutoScroll]);

  return (
    <View style={styles.container}>
      <CoachmarkAnchor
        id="review-courses-bubble-anchor"
        shape="rect"
        radius={12}
        style={{ position: "absolute", top: 1, left: 1, width: 1, height: 1 }}
      />
      <ScrollView
        ref={scrollRef}
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!coachmark.currentStep?.scrollLocked && !isAutoScrollingToTarget}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleScrollSettled}
        onScrollEndDrag={handleScrollSettled}
        scrollEventThrottle={16}
      >
        <View ref={contentRef} collapsable={false} style={styles.minicontainer}>
          {/* <Text style={styles.title}>Powtórki</Text> */}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Powtórki</Text>
            {officialGroups.map((group) => {
              const targetCode = group.targetLang
                ? group.targetLang.toUpperCase()
                : "?";
              const sourceCode = group.sourceLang
                ? group.sourceLang.toUpperCase()
                : "?";
              const regularOfficial = (group.courses ?? []).filter(
                (course) => course.isMini === false
              );
              const miniOfficial = (group.courses ?? []).filter(
                (course) => course.isMini !== false
              );
              const showRegular = regularOfficial.length > 0;
              const showMini = miniOfficial.length > 0;

              return (
                <View key={group.key} style={styles.groupContainer}>
                  <View style={styles.groupHeader}>
                    <View style={styles.groupHeaderLine} />
                    <View style={styles.groupHeaderBadge}>
                      <View style={styles.groupHeaderLanguage}>
                        <Text style={styles.groupHeaderCode}>{targetCode}</Text>
                        {group.targetFlag ? (
                          <Image
                            style={styles.groupHeaderFlag}
                            source={group.targetFlag}
                          />
                        ) : null}
                      </View>
                      {group.sourceLang ? (
                        <>
                          <Text style={styles.groupHeaderSeparator}>/</Text>
                          <View style={styles.groupHeaderLanguage}>
                            <Text style={styles.groupHeaderCode}>
                              {sourceCode}
                            </Text>
                            {group.sourceFlag ? (
                              <Image
                                style={styles.groupHeaderFlag}
                                source={group.sourceFlag}
                              />
                            ) : null}
                          </View>
                        </>
                      ) : null}
                    </View>
                  </View>

                  {showRegular && (
                    <ReviewCourseSection
                      title="Kursy"
                      list={regularOfficial}
                      counts={officialCounts}
                      onSelect={handleSelectCustomCourse}
                      getCourseCoachmarkTargetId={getCourseCoachmarkTargetId}
                      getCourseBadgeCoachmarkTargetId={getCourseBadgeCoachmarkTargetId}
                      getCourseRef={getCourseRef}
                    />
                  )}
                  {showMini && (
                    <ReviewCourseSection
                      title="Mini kursy"
                      list={miniOfficial}
                      counts={officialCounts}
                      onSelect={handleSelectCustomCourse}
                      getCourseCoachmarkTargetId={getCourseCoachmarkTargetId}
                      getCourseBadgeCoachmarkTargetId={getCourseBadgeCoachmarkTargetId}
                      getCourseRef={getCourseRef}
                    />
                  )}
                </View>
              );
            })}
            {!hasOfficialGroups ? (
              <Text style={styles.emptyText}>
                Nie masz jeszcze przypiętych kursów do powtórek.
              </Text>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Twoje</Text>
            {!hasCustomCourses ? (
              <Text style={styles.emptyText}>
                Nie masz jeszcze własnych fiszek.
              </Text>
            ) : !hasVisibleCustomCourses ? (
              <Text style={styles.emptyText}>
                Wszystkie kursy mają wyłączone powtórki.
              </Text>
            ) : (
              <View style={styles.courseGrid}>
                {visibleCustomCourses.map((course, index) => {
                  const iconMeta = getCourseIconById(course.iconId);
                  const IconComponent = iconMeta?.Component ?? Ionicons;
                  const iconName = (iconMeta?.name ?? "grid-outline") as never;
                  const dueCount = customCounts[course.id] ?? 0;

                  return (
                    <Pressable
                      key={`${course.id}-${index}`}
                      style={styles.courseCardSlot}
                      disabled={dueCount === 0}
                      accessibilityState={{ disabled: dueCount === 0 }}
                      onPress={() => handleSelectCustomCourse(course.id)}
                    >
                      <CoachmarkAnchor
                        id={
                          course.id === firstAvailableCourseId
                            ? "review-courses-first-card"
                            : `review-courses-custom-${course.id}`
                        }
                        shape="rect"
                        radius={15}
                      >
                        <View
                          ref={course.id === firstAvailableCourseId ? firstAvailableCourseRef : undefined}
                          collapsable={false}
                          style={[
                            styles.courseCard,
                            dueCount === 0 && styles.courseCardDisabled,
                          ]}
                        >
                          <IconComponent
                            name={iconName}
                            size={48}
                            color={course.iconColor}
                          />
                          <CourseTitleMarquee
                            text={course.name}
                            containerStyle={styles.courseCardTitleContainer}
                            textStyle={styles.courseCardText}
                          />
                          <View style={styles.courseCount}>
                            {course.id === firstAvailableCourseId ? (
                              <CoachmarkAnchor
                                id="review-courses-first-card-badge"
                                shape="rect"
                                radius={16}
                              >
                                <DueCountBadge count={dueCount} />
                              </CoachmarkAnchor>
                            ) : (
                              <DueCountBadge count={dueCount} />
                            )}
                          </View>
                        </View>
                      </CoachmarkAnchor>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
