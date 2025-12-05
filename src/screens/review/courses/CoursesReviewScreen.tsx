import { useCallback, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { useStyles } from "./CoursesScreen-styles";
import { useSettings } from "@/src/contexts/SettingsContext";
import {
  countDueCustomReviews,
  getCustomCoursesWithCardCounts,
  getOfficialCustomCoursesWithCardCounts,
  type CustomCourseSummary,
} from "@/src/db/sqlite/db";
import {
  getCourseIconById,
  resolveCourseIconProps,
} from "@/src/constants/customCourse";
import { getFlagSource } from "@/src/constants/languageFlags";
import { OFFICIAL_PACKS } from "@/src/constants/officialPacks";
import { CourseTitleMarquee } from "@/src/components/course/CourseTitleMarquee";
import { useFlashcardsIntro } from "@/src/components/onboarding/useFlashcardsIntro";

type OfficialCourseReviewItem = CustomCourseSummary & {
  sourceLang: string | null;
  targetLang: string | null;
  isMini: boolean;
};

type OfficialGroup = {
  key: string;
  targetLang: string | null;
  sourceLang: string | null;
  targetFlag?: ReturnType<typeof getFlagSource>;
  sourceFlag?: ReturnType<typeof getFlagSource>;
  courses: OfficialCourseReviewItem[];
};

export default function CoursesReviewScreen() {
  const styles = useStyles();
  const router = useRouter();
  const {
    setActiveCustomCourseId,
    colors,
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
  const { IntroOverlay } = useFlashcardsIntro({
    storageKey: "@review_courses_intro_seen_v1",
    messages: [
      {
        title: "Wybierz kurs do powtórek",
        description:
          "Dotknij kafelka, by przejść do gry i powtórzyć fiszki z tego kursu.",
      },
      {
        title: "Jak często się pojawiają?",
        description:
          "Może za 2 dni, może za tydzień, a może za rok? Pamiętaj, że żeby zapamiętać, trzeba zapomnieć ;)",
      },
      {
        title: "Co oznaczają liczby",
        description:
          "Czerwona liczba to zaległe powtórki. Zielona oznacza, że na razie nic nie czeka.",
      },
      {
        title: "Wyłączanie powtórek",
        description:
          "W ustawieniach kursu możesz wyłączyć powtórki — wtedy nie pojawi się na tej liście.",
      },
    ],
  });

  const refreshData = useCallback(async () => {
    const now = Date.now();

    try {
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

  const handleSelectCustomCourse = useCallback(
    (courseId: number) => {
      void (async () => {
        await setActiveCustomCourseId(courseId);
        router.push("/review/brain");
      })();
    },
    [router, setActiveCustomCourseId]
  );

  const renderCount = (count: number) => (
    // <View style={styles.countBadge}>
    <Text
      style={[
        styles.countNumber,
        { color: count > 0 ? colors.my_red : colors.my_green },
      ]}
    >
      {count}
    </Text>
    // </View>
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

    return Array.from(groups.values()).sort((a, b) => {
      const targetDiff = compareLangs(a.targetLang, b.targetLang);
      if (targetDiff !== 0) return targetDiff;
      return compareLangs(a.sourceLang, b.sourceLang);
    });
  }, [visibleOfficialCourses]);
  const hasOfficialGroups = officialGroups.length > 0;

  return (
    <View style={styles.container}>
      <IntroOverlay />
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.minicontainer}>
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
              const renderOfficialSection = (
                title: string,
                list: OfficialCourseReviewItem[]
              ) => {
                if (!list.length) return null;

                return (
                  <>
                    <Text style={styles.miniSectionTitle}>{title}</Text>
                    <View style={styles.courseGrid}>
                      {list.map((course) => {
                        const iconProps = resolveCourseIconProps(
                          course.iconId,
                          course.iconColor
                        );
                        const iconMeta = getCourseIconById(course.iconId);
                        const IconComponent =
                          iconProps.icon?.Component ??
                          iconMeta?.Component ??
                          Ionicons;
                        const iconName = (iconProps.icon?.name ??
                          iconMeta?.name ??
                          "grid-outline") as never;
                        const dueCount = officialCounts[course.id] ?? 0;
                        const mainFlag = iconProps.mainImageSource;

                        return (
                          <Pressable
                            key={`official-${course.id}`}
                            style={[
                              styles.courseCard,
                              dueCount === 0 && styles.courseCardDisabled,
                            ]}
                            disabled={dueCount === 0}
                            accessibilityState={{ disabled: dueCount === 0 }}
                            onPress={() => handleSelectCustomCourse(course.id)}
                          >
                            {mainFlag ? (
                              <Image
                                style={styles.courseCardIconFlag}
                                source={mainFlag}
                              />
                            ) : (
                              <IconComponent
                                name={iconName}
                                size={48}
                                color={course.iconColor}
                              />
                            )}
                            <CourseTitleMarquee
                              text={course.name}
                              containerStyle={styles.courseCardTitleContainer}
                              textStyle={styles.courseCardText}
                            />
                            <View style={styles.courseCount}>
                              {renderCount(dueCount)}
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  </>
                );
              };

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

                  {renderOfficialSection("Kursy", regularOfficial)}
                  {renderOfficialSection("Mini kursy", miniOfficial)}
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
                      style={[
                        styles.courseCard,
                        dueCount === 0 && styles.courseCardDisabled,
                      ]}
                      disabled={dueCount === 0}
                      accessibilityState={{ disabled: dueCount === 0 }}
                      onPress={() => handleSelectCustomCourse(course.id)}
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
                        {renderCount(dueCount)}
                      </View>
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
