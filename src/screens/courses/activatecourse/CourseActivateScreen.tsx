import MyButton from "@/src/components/button/button";
import { CourseListCard } from "@/src/components/course/CourseListCard";
import { COURSE_CATEGORIES, CourseCategory } from "@/src/constants/courseCategories";
import { COURSE_ACTIVATE_INTRO_MESSAGES } from "@/src/constants/introMessages";
import { getFlagSource } from "@/src/constants/languageFlags";
import { OFFICIAL_PACKS } from "@/src/constants/officialPacks";
import { usePopup } from "@/src/contexts/PopupContext";
import { useSettings } from "@/src/contexts/SettingsContext";
import {
  getCustomCoursesWithCardCounts,
  getOfficialCustomCoursesWithCardCounts,
  type CustomCourseSummary,
} from "@/src/db/sqlite/db";
import { useScreenIntro } from "@/src/hooks/useScreenIntro";
import {
  setOnboardingCheckpoint
} from "@/src/services/onboardingCheckpoint";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useStyles } from "./CourseActivateScreen-styles";
import { CourseGroupList } from "./components/CourseGroupList";
import { CourseGroup, OfficialCourseListItem } from "./types";



export default function CourseActivateScreen() {
  const {
    activeCustomCourseId,
    setActiveCustomCourseId,
    colors,
    pinnedOfficialCourseIds,
  } = useSettings();
  const [customCourses, setCustomCourses] = useState<CustomCourseSummary[]>([]);
  const [officialCourses, setOfficialCourses] = useState<
    OfficialCourseListItem[]
  >([]);
  const router = useRouter();
  const setPopup = usePopup();
  const [startedInOnboarding, setStartedInOnboarding] = useState(false);

  const { IntroOverlay } = useScreenIntro({
    messages: COURSE_ACTIVATE_INTRO_MESSAGES,
    storageKey: "@course_activate_intro_seen_v1",
    triggerStrategy: "on_onboarding",
    onCheckpointLoaded: (cp) => {
      if (cp !== "done") {
        setStartedInOnboarding(true);
      }
    },
    floatingOffset: { top: 8, left: 8, right: 8 },
  });

  const userCustomCourses = useMemo(
    () => customCourses.filter((course) => !course.isOfficial),
    [customCourses]
  );

  const pinnedOfficialCourses = useMemo(
    () =>
      officialCourses.filter((course) =>
        pinnedOfficialCourseIds.includes(course.id)
      ),
    [officialCourses, pinnedOfficialCourseIds]
  );

  const courseGroups = useMemo(() => {
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

    pinnedOfficialCourses.forEach((course) => {
      ensureGroup(
        course.sourceLang,
        course.targetLang,
        course.categoryId
      ).official.push(course);
    });

    const compareByName = (
      a: OfficialCourseListItem,
      b: OfficialCourseListItem
    ) => a.name.localeCompare(b.name);
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
    ) => {
      const first = a ?? "";
      const second = b ?? "";
      return first.localeCompare(second);
    };

    const sortedGroups = Array.from(map.values()).sort((a, b) => {
      const targetDiff = compareLangs(a.targetLang, b.targetLang);
      if (targetDiff !== 0) return targetDiff;
      return compareLangs(a.sourceLang, b.sourceLang);
    });

    sortedGroups.forEach((group) => {
      group.official.sort(compareByPositionThenName);
    });

    return sortedGroups;
  }, [pinnedOfficialCourses]);

  const hasPinnedOfficialCourses = pinnedOfficialCourses.length > 0;
  const hasUserCustomCourses = userCustomCourses.length > 0;
  const isEmptyState =
    !hasPinnedOfficialCourses && !hasUserCustomCourses;

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      getCustomCoursesWithCardCounts()
        .then((rows) => {
          if (isMounted) setCustomCourses(rows);
        })
        .catch((error) => {
          console.error("Failed to load custom courses", error);
        });
      getOfficialCustomCoursesWithCardCounts()
        .then((rows) => {
          if (isMounted) {
            const mapped = rows.map<OfficialCourseListItem>((row) => {
              const manifest = OFFICIAL_PACKS.find(
                (pack) => pack.slug === row.slug
              );
              return {
                ...row,
                sourceLang: manifest?.sourceLang ?? null,
                targetLang: manifest?.targetLang ?? null,
                smallFlag: manifest?.smallFlag ?? manifest?.sourceLang ?? null,
                isMini: manifest?.isMini ?? true,
                categoryId: manifest?.categoryId,
                position: manifest?.position,
              };
            });
            setOfficialCourses(mapped);
          }
        })
        .catch((error) => {
          console.error("Failed to load official courses", error);
        });
      return () => {
        isMounted = false;
      };
    }, [])
  );

  const styles = useStyles();

  const activationCooldownRef = useRef<number>(0);
  const ACTIVATION_COOLDOWN_MS = 30;

  const canActivate = useCallback(() => {
    const now = Date.now();
    if (now - activationCooldownRef.current < ACTIVATION_COOLDOWN_MS) {
      return false;
    }
    activationCooldownRef.current = now;
    return true;
  }, []);

  const notifyActivated = useCallback(() => {
    void setOnboardingCheckpoint("done");
    setPopup({
      message: "Aktywowałem kurs :3",
      color: "calm",
      duration: 3000,
    });
  }, [setPopup]);

  const handleCustomCoursePress = useCallback(
    async (id: number) => {
      if (activeCustomCourseId === id) {
        return;
      }
      if (!canActivate()) return;
      await setActiveCustomCourseId(id);
      notifyActivated();
    },
    [activeCustomCourseId, canActivate, notifyActivated, setActiveCustomCourseId]
  );

  const handleEditCustomCourse = (course: CustomCourseSummary) => {
    const encodedName = encodeURIComponent(course.name);
    const params = [`id=${course.id.toString()}`, `name=${encodedName}`];
    if (course.isOfficial) {
      params.push("lockAppearance=1");
    }
    router.push(`/editcourse?${params.join("&")}`);
  };





  const hasActiveCourse = activeCustomCourseId != null;
  const showOnboardingNext = startedInOnboarding;

  return (
    <View style={styles.container}>
      <IntroOverlay />
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.minicontainer}>
          {isEmptyState ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyState}>
                nic tu nie ma :(, czas wybrać kurs!
              </Text>
            </View>
          ) : (
            <>
              {hasPinnedOfficialCourses ? (
                <>
                  <Text style={styles.title}>Stworzone przez nas</Text>
                  <CourseGroupList
                    groups={courseGroups}
                    activeCourseId={activeCustomCourseId}
                    colors={colors}
                    onPress={handleCustomCoursePress}
                    onEdit={handleEditCustomCourse}
                  />
                </>
              ) : null}

              {hasUserCustomCourses ? (
                <View style={styles.customSection}>
                  <Text style={styles.customSectionTitle}>
                    Stworzone przez Ciebie
                  </Text>
                  <View style={styles.customList}>
                    {userCustomCourses.map((course) => {
                      const isHighlighted = activeCustomCourseId === course.id;
                      return (
                        <CourseListCard
                          key={course.id}
                          title={course.name}
                          subtitle={`fiszki: ${course.cardsCount}`}
                          iconId={course.iconId}
                          iconColor={course.iconColor}
                          flagCode={null} // Custom courses typically don't have a flag logic derived here yet or use the icon itself
                          isHighlighted={isHighlighted}
                          onPress={() => handleCustomCoursePress(course.id)}
                          rightAccessory={
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Edytuj kurs ${course.name}`}
                              style={styles.customEditButton}
                              onPress={(event) => {
                                event.stopPropagation();
                                handleEditCustomCourse(course);
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
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>

      {showOnboardingNext ? (
        <View style={styles.buttonscontainer}>
          <View style={styles.buttonsRow}>
            <MyButton
              text="Dalej"
              accessibilityLabel="Przejdź dalej"
              disabled={!hasActiveCourse}
              onPress={() => {
                void setOnboardingCheckpoint("done");
                if (activeCustomCourseId != null) {
                  router.replace("/flashcards_custom");
                } else {
                  router.replace("/flashcards");
                }
              }}
              color="my_green"
              width={90}
            />
          </View>
        </View>
      ) : (
        <View style={styles.buttonscontainer}>
          <View style={styles.buttonsRow}>
            <MyButton
              text="nowy"
              color="my_yellow"
              onPress={() => router.push("/createcourse")}
              disabled={false}
              width={70}
            />
          </View>
        </View>
      )}
    </View>
  );
}
