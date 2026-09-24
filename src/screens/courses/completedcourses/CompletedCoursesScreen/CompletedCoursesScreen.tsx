import MyButton from "@/src/components/button/button";
import { CourseGroupList } from "@/src/components/course/CourseGroupList";
import { CourseListCard } from "@/src/components/course/CourseListCard";
import { COURSE_CATEGORIES, type CourseCategory } from "@/src/constants/courseCategories";
import { getFlagSource } from "@/src/constants/languageFlags";
import { OFFICIAL_PACKS } from "@/src/constants/officialPacks";
import { useSettings } from "@/src/contexts/SettingsContext";
import {
  getCompletedCustomCoursesWithCardCounts,
  type CompletedCustomCourseSummary,
} from "@/src/db/sqlite/db";
import {
  type CourseGroup,
  type OfficialCourseListItem,
} from "@/src/features/customCourse/courseActivationTypes";
import { getCoursePlayRoute } from "@/src/features/customCourse/coursePlayRoute";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useStyles } from "../../activatecourse/CourseActivateScreen/CourseActivateScreen-styles";

const completedStyles = StyleSheet.create({
  emptyScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  hero: {
    alignItems: "center",
    marginTop: 24,
    marginBottom: 12,
  },
  trophy: {
    width: 160,
    height: 160,
    resizeMode: "contain",
  },
  emptyContainer: {
    minHeight: 0,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
  },
});

function mapOfficialCourse(
  row: CompletedCustomCourseSummary
): OfficialCourseListItem {
  const manifest = OFFICIAL_PACKS.find((pack) => pack.slug === row.slug);
  return {
    ...row,
    sourceLang: manifest?.sourceLang ?? null,
    targetLang: manifest?.targetLang ?? null,
    smallFlag: manifest?.smallFlag ?? manifest?.sourceLang ?? null,
    isMini: manifest?.isMini ?? true,
    categoryId: manifest?.categoryId,
    position: manifest?.position,
  };
}

function buildCourseGroups(courses: OfficialCourseListItem[]): CourseGroup[] {
  const map = new Map<string, CourseGroup>();

  const ensureGroup = (
    sourceLang: string | null,
    targetLang: string | null,
    categoryId?: string
  ): CourseGroup => {
    let key: string;
    let category: CourseCategory | undefined;

    if (categoryId && COURSE_CATEGORIES[categoryId]) {
      category = COURSE_CATEGORIES[categoryId];
      key = `cat:${categoryId}`;
    } else {
      key = `lang:${targetLang ?? "unknown"}-${sourceLang ?? "unknown"}`;
    }

    let group = map.get(key);
    if (!group) {
      group = {
        key,
        category,
        sourceLang: sourceLang ?? null,
        targetLang: targetLang ?? null,
        sourceFlag: sourceLang ? getFlagSource(sourceLang) : undefined,
        targetFlag: targetLang ? getFlagSource(targetLang) : undefined,
        official: [],
      };
      map.set(key, group);
    }
    return group;
  };

  courses.forEach((course) => {
    ensureGroup(
      course.sourceLang,
      course.targetLang,
      course.categoryId
    ).official.push(course);
  });

  const compareByName = (a: OfficialCourseListItem, b: OfficialCourseListItem) =>
    a.name.localeCompare(b.name);
  const compareByPositionThenName = (
    a: OfficialCourseListItem,
    b: OfficialCourseListItem
  ) => {
    const aPos = a.position ?? Number.POSITIVE_INFINITY;
    const bPos = b.position ?? Number.POSITIVE_INFINITY;
    if (aPos !== bPos) return aPos - bPos;
    return compareByName(a, b);
  };
  const compareLangs = (
    a: string | null | undefined,
    b: string | null | undefined
  ) => (a ?? "").localeCompare(b ?? "");

  const groups = Array.from(map.values()).sort((a, b) => {
    const targetDiff = compareLangs(a.targetLang, b.targetLang);
    if (targetDiff !== 0) return targetDiff;
    return compareLangs(a.sourceLang, b.sourceLang);
  });

  groups.forEach((group) => {
    group.official.sort(compareByPositionThenName);
  });

  return groups;
}

export default function CompletedCoursesScreen() {
  const { t } = useTranslation();
  const {
    activeCustomCourseId,
    activeCustomCourseIdHydrated,
    colors,
    customCourseEntrySettingsSeenHydrated,
    hasSeenCustomCourseEntrySettings,
    pinOfficialCourse,
    pinnedOfficialCourseIds,
    setActiveCustomCourseId,
  } = useSettings();
  const styles = useStyles();
  const router = useRouter();
  const scrollRef = useRef<ScrollView | null>(null);
  const [completedCourses, setCompletedCourses] = useState<
    CompletedCustomCourseSummary[]
  >([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const loadCourses = async () => {
        setIsLoadingCourses(true);
        try {
          const result = await getCompletedCustomCoursesWithCardCounts();
          if (!isMounted) return;
          setCompletedCourses(result);
        } catch (error) {
          console.error("Failed to load completed courses", error);
          if (!isMounted) return;
          setCompletedCourses([]);
        } finally {
          if (isMounted) {
            setIsLoadingCourses(false);
          }
        }
      };

      void loadCourses();

      return () => {
        isMounted = false;
      };
    }, [])
  );

  const officialCourses = useMemo(
    () => completedCourses.filter((course) => course.isOfficial).map(mapOfficialCourse),
    [completedCourses]
  );
  const userCustomCourses = useMemo(
    () => completedCourses.filter((course) => !course.isOfficial),
    [completedCourses]
  );
  const courseGroups = useMemo(
    () => buildCourseGroups(officialCourses),
    [officialCourses]
  );
  const isEmptyState = !officialCourses.length && !userCustomCourses.length;

  const handleCoursePress = useCallback(
    async (id: number) => {
      if (!activeCustomCourseIdHydrated) return;
      const route = getCoursePlayRoute(
        id,
        customCourseEntrySettingsSeenHydrated,
        hasSeenCustomCourseEntrySettings,
      );
      if (!route) return;
      const course = completedCourses.find((item) => item.id === id);
      if (
        course?.isOfficial &&
        !pinnedOfficialCourseIds.includes(id)
      ) {
        await pinOfficialCourse(id);
      }
      await setActiveCustomCourseId(id);
      router.push(route);
    },
    [
      activeCustomCourseIdHydrated,
      completedCourses,
      customCourseEntrySettingsSeenHydrated,
      hasSeenCustomCourseEntrySettings,
      pinOfficialCourse,
      pinnedOfficialCourseIds,
      router,
      setActiveCustomCourseId,
    ]
  );

  const handleEditCourse = useCallback(
    (course: { id: number; name: string; isOfficial?: boolean }) => {
      const encodedName = encodeURIComponent(course.name);
      const params = [`id=${course.id.toString()}`, `name=${encodedName}`];
      if (course.isOfficial) {
        params.push("lockAppearance=1");
      }
      router.push(`/editcourse?${params.join("&")}`);
    },
    [router]
  );

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.scrollContent,
          !isLoadingCourses && isEmptyState && completedStyles.emptyScrollContent,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.minicontainer}>
          <View style={completedStyles.hero}>
            <Image
              source={require("@/assets/illustrations/puchar.png")}
              style={completedStyles.trophy}
              accessible={false}
              testID="completed-courses-trophy"
            />
            <Text style={styles.title}>
              {t("screens.courses.completedCourses.title")}
            </Text>
          </View>

          {!isLoadingCourses && isEmptyState ? (
            <View style={[styles.emptyContainer, completedStyles.emptyContainer]}>
              <Text style={[styles.emptyState, completedStyles.emptyText]}>
                {t("screens.courses.completedCourses.empty")}
              </Text>
            </View>
          ) : (
            <>
              {officialCourses.length ? (
                <CourseGroupList
                  groups={courseGroups}
                  activeCourseId={activeCustomCourseId}
                  colors={colors}
                  onPress={handleCoursePress}
                  onEdit={handleEditCourse}
                  firstCoachmarkCourseId={null}
                  scrollRef={scrollRef}
                />
              ) : null}

              {userCustomCourses.length ? (
                <View style={styles.customSection}>
                  <Text style={styles.customSectionTitle}>
                    {t(
                      "screens.courses.activatecourse.courseActivate.courseActivate.textChild.stworzonePrzezCiebie"
                    )}
                  </Text>
                  <View style={styles.customList}>
                    {userCustomCourses.map((course) => (
                      <CourseListCard
                        key={course.id}
                        title={course.name}
                        subtitle={t("repeats.format.flashcardsValue", {
                          value: course.cardsCount,
                        })}
                        iconId={course.iconId}
                        iconColor={course.iconColor}
                        flagCode={null}
                        isHighlighted={activeCustomCourseId === course.id}
                        onPress={() => handleCoursePress(course.id)}
                        rightAccessory={
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t(
                              "screens.courses.completedCourses.editA11y",
                              { value: course.name }
                            )}
                            style={styles.customEditButton}
                            onPress={(event) => {
                              event.stopPropagation();
                              handleEditCourse(course);
                            }}
                            hitSlop={8}
                          >
                            <FontAwesome6
                              name="edit"
                              size={24}
                              color={colors.headline}
                            />
                          </Pressable>
                        }
                      />
                    ))}
                  </View>
                </View>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>

      <View style={styles.buttonscontainer}>
        <View style={styles.buttonsRow}>
          <MyButton
            text={t("app.actions.back")}
            accessibilityLabel={t("app.actions.back")}
            color="my_green"
            onPress={() => router.back()}
            width={96}
          />
        </View>
      </View>

      {isLoadingCourses ? (
        <View style={styles.loadingOverlay} testID="completed-courses-loading">
          <View style={styles.loadingOverlayContent}>
            <ActivityIndicator size="large" color={colors.paragraph} />
          </View>
        </View>
      ) : null}
    </View>
  );
}
