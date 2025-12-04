import { useCallback, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { useStyles } from "./CoursesScreen-styles";
import { useSettings } from "@/src/contexts/SettingsContext";
import {
  countDueCustomReviews,
  countDueReviewsByLevel,
  countTotalDueReviews,
  getCustomCoursesWithCardCounts,
  getOfficialCustomCoursesWithCardCounts,
  type CustomCourseSummary,
} from "@/src/db/sqlite/db";
import {
  getCourseIconById,
  resolveCourseIconProps,
} from "@/src/constants/customCourse";
import { getFlagSource } from "@/src/constants/languageFlags";
import type { CEFRLevel } from "@/src/types/language";
import { OFFICIAL_PACKS } from "@/src/constants/officialPacks";
import { CourseTitleMarquee } from "@/src/components/course/CourseTitleMarquee";
import { useFlashcardsIntro } from "@/src/components/onboarding/useFlashcardsIntro";

const LANGUAGE_LABELS_BY_TARGET: Record<string, Record<string, string>> = {
  pl: {
    en: "angielski",
    fr: "francuski",
    es: "hiszpański",
    de: "niemiecki",
    pm: "francuski",
    kr: "koreański",
  },
};

const FALLBACK_LANGUAGE_LABELS: Record<string, string> = {
  pl: "polski",
  en: "angielski",
  fr: "francuski",
  es: "hiszpański",
  de: "niemiecki",
  pm: "francuski",
  kr: "koreański",
};

const LEVEL_ORDER: Record<CEFRLevel, number> = {
  A1: 0,
  A2: 1,
  B1: 2,
  B2: 3,
  C1: 4,
  C2: 5,
};
const MAX_LEVEL_ORDER = Math.max(...Object.values(LEVEL_ORDER)) + 1;

const resolveLanguageLabel = (
  targetLang: string | null | undefined,
  sourceLang: string | null | undefined
): string => {
  if (sourceLang) {
    const targetLabels = targetLang
      ? LANGUAGE_LABELS_BY_TARGET[targetLang]
      : undefined;
    if (targetLabels?.[sourceLang]) {
      return targetLabels[sourceLang];
    }
    const fallbackLabel = FALLBACK_LANGUAGE_LABELS[sourceLang];
    if (fallbackLabel) {
      return fallbackLabel;
    }
    return sourceLang.toUpperCase();
  }
  return "unknown";
};

type OfficialCourseReviewItem = CustomCourseSummary & {
  sourceLang: string | null;
  targetLang: string | null;
  isMini: boolean;
};

type BuiltInGroup = {
  key: string;
  targetLang: string | null;
  sourceLang: string | null;
  targetFlag?: ReturnType<typeof getFlagSource>;
  sourceFlag?: ReturnType<typeof getFlagSource>;
  items: { courseIndex: number; courseLevel: string | null }[];
};

type OfficialGroup = {
  key: string;
  targetLang: string | null;
  sourceLang: string | null;
  targetFlag?: ReturnType<typeof getFlagSource>;
  sourceFlag?: ReturnType<typeof getFlagSource>;
  courses: OfficialCourseReviewItem[];
};

type CombinedGroup = {
  key: string;
  targetLang: string | null;
  sourceLang: string | null;
  targetFlag?: ReturnType<typeof getFlagSource>;
  sourceFlag?: ReturnType<typeof getFlagSource>;
  builtin: BuiltInGroup["items"];
  official: OfficialGroup["courses"];
};

export default function CoursesReviewScreen() {
  const styles = useStyles();
  const router = useRouter();
  const {
    courses,
    setActiveCourseIdx,
    setActiveCustomCourseId,
    setLevel,
    colors,
    pinnedOfficialCourseIds,
  } = useSettings();

  const [builtInCounts, setBuiltInCounts] = useState<Record<number, number>>(
    {}
  );
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

    const builtInEntries = await Promise.all(
      courses.map(async (course, index) => {
        const srcId = course.sourceLangId;
        const tgtId = course.targetLangId;
        if (srcId == null || tgtId == null) {
          return [index, 0] as const;
        }
        try {
          if (course.level) {
            const counts = await countDueReviewsByLevel(srcId, tgtId, now);
            const levelKey = course.level as CEFRLevel;
            const count = counts[levelKey] ?? 0;
            return [index, count] as const;
          }
          const count = await countTotalDueReviews(srcId, tgtId, now);
          return [index, count] as const;
        } catch (error) {
          console.warn(
            `Failed to count reviews for course ${srcId}-${tgtId}`,
            error
          );
          return [index, 0] as const;
        }
      })
    );

    const nextBuiltIn: Record<number, number> = {};
    for (const [idx, count] of builtInEntries) {
      nextBuiltIn[idx] = count;
    }
    setBuiltInCounts(nextBuiltIn);

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
  }, [courses]);

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

  const handleSelectCourse = useCallback(
    (index: number) => {
      const course = courses[index];
      if (!course) {
        return;
      }
      void (async () => {
        if (course.level) {
          setLevel(course.level);
        }
        await Promise.all([
          setActiveCourseIdx(index),
          setActiveCustomCourseId(null),
        ]);
        router.push("/review/brain");
      })();
    },
    [courses, router, setActiveCourseIdx, setActiveCustomCourseId, setLevel]
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
  const builtInGroups = useMemo<BuiltInGroup[]>(() => {
    const groups = new Map<string, BuiltInGroup>();

    const ensureGroup = (
      targetLang: string | null | undefined,
      sourceLang: string | null | undefined
    ): BuiltInGroup => {
      const key = `${targetLang ?? "unknown"}-${sourceLang ?? "unknown"}`;
      let group = groups.get(key);
      if (!group) {
        group = {
          key,
          targetLang: targetLang ?? null,
          sourceLang: sourceLang ?? null,
          targetFlag: targetLang ? getFlagSource(targetLang) : undefined,
          sourceFlag: sourceLang ? getFlagSource(sourceLang) : undefined,
          items: [],
        };
        groups.set(key, group);
      }
      return group;
    };

    courses.forEach((course, index) => {
      const group = ensureGroup(course.targetLang, course.sourceLang);
      group.items.push({
        courseIndex: index,
        courseLevel: course.level ?? null,
      });
    });

    return Array.from(groups.values()).map((group) => {
      const items = [...group.items].sort((a, b) => {
        const rankA =
          (a.courseLevel && LEVEL_ORDER[a.courseLevel as CEFRLevel]) ??
          MAX_LEVEL_ORDER;
        const rankB =
          (b.courseLevel && LEVEL_ORDER[b.courseLevel as CEFRLevel]) ??
          MAX_LEVEL_ORDER;
        if (rankA !== rankB) {
          return Number(rankA) - Number(rankB);
        }
        const labelA = a.courseLevel ?? "";
        const labelB = b.courseLevel ?? "";
        return labelA.localeCompare(labelB);
      });

      return { ...group, items };
    });
  }, [courses]);

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

    return Array.from(groups.values());
  }, [visibleOfficialCourses]);

  const combinedGroups = useMemo<CombinedGroup[]>(() => {
    const map = new Map<string, CombinedGroup>();

    const ensureGroup = (
      targetLang: string | null,
      sourceLang: string | null,
      targetFlag?: ReturnType<typeof getFlagSource>,
      sourceFlag?: ReturnType<typeof getFlagSource>
    ): CombinedGroup => {
      const key = `${targetLang ?? "unknown"}-${sourceLang ?? "unknown"}`;
      let group = map.get(key);
      if (!group) {
        group = {
          key,
          targetLang,
          sourceLang,
          targetFlag:
            targetFlag ?? (targetLang ? getFlagSource(targetLang) : undefined),
          sourceFlag:
            sourceFlag ?? (sourceLang ? getFlagSource(sourceLang) : undefined),
          builtin: [],
          official: [],
        };
        map.set(key, group);
      } else {
        if (!group.targetFlag && targetFlag) {
          group.targetFlag = targetFlag;
        }
        if (!group.sourceFlag && sourceFlag) {
          group.sourceFlag = sourceFlag;
        }
        if (targetLang && !group.targetLang) {
          group.targetLang = targetLang;
        }
        if (sourceLang && !group.sourceLang) {
          group.sourceLang = sourceLang;
        }
      }
      return group;
    };

    builtInGroups.forEach((group) => {
      const combined = ensureGroup(
        group.targetLang,
        group.sourceLang,
        group.targetFlag,
        group.sourceFlag
      );
      combined.builtin = [...group.items];
    });

    officialGroups.forEach((group) => {
      const combined = ensureGroup(
        group.targetLang,
        group.sourceLang,
        group.targetFlag,
        group.sourceFlag
      );
      combined.official = [...combined.official, ...group.courses];
    });

    const compareLangs = (
      a: string | null | undefined,
      b: string | null | undefined
    ) => {
      const first = a ?? "";
      const second = b ?? "";
      return first.localeCompare(second);
    };

    return Array.from(map.values())
      .filter((group) => group.builtin.length > 0 || group.official.length > 0)
      .sort((a, b) => {
        const targetDiff = compareLangs(a.targetLang, b.targetLang);
        if (targetDiff !== 0) return targetDiff;
        return compareLangs(a.sourceLang, b.sourceLang);
      });
  }, [builtInGroups, officialGroups]);

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
            {combinedGroups.map((group) => {
              const targetCode = group.targetLang
                ? group.targetLang.toUpperCase()
                : "?";
              const sourceCode = group.sourceLang
                ? group.sourceLang.toUpperCase()
                : "?";
              const regularOfficial = group.official.filter(
                (course) => course.isMini === false
              );
              const miniOfficial = group.official.filter(
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

                  {group.builtin.length > 0 ? (
                    <View style={styles.courseGrid}>
                      {group.builtin.map(({ courseIndex, courseLevel }) => {
                        const course = courses[courseIndex];
                        const builtInCount = builtInCounts[courseIndex] ?? 0;
                        const sourceFlag = getFlagSource(course.sourceLang);
                        const levelLabel =
                          courseLevel ??
                          resolveLanguageLabel(
                            course.targetLang,
                            course.sourceLang
                          );

                      return (
                        <Pressable
                          key={`${course.sourceLang}-${course.targetLang}-${
                            courseLevel ?? "default"
                          }-${courseIndex}`}
                          style={[
                            styles.courseCard,
                            builtInCount === 0 && styles.courseCardDisabled,
                          ]}
                          disabled={builtInCount === 0}
                          accessibilityState={{ disabled: builtInCount === 0 }}
                          onPress={() => handleSelectCourse(courseIndex)}
                        >
                          {sourceFlag ? (
                            <Image style={styles.flag} source={sourceFlag} />
                          ) : null}
                            <Text style={styles.courseCardText}>
                              {levelLabel}
                            </Text>
                            <View style={styles.courseCount}>
                              {renderCount(builtInCount)}
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}

                  {renderOfficialSection("Kursy", regularOfficial)}
                  {renderOfficialSection("Mini kursy", miniOfficial)}
                </View>
              );
            })}
            {combinedGroups.length === 0 ? (
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
