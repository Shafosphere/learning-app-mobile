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
  type CustomCourseSummary,
} from "@/src/db/sqlite/db";
import { getCourseIconById } from "@/src/constants/customCourse";
import { getFlagSource } from "@/src/constants/languageFlags";
import type { CEFRLevel } from "@/src/types/language";

const languageLabels: Record<string, Record<string, string>> = {
  pl: { en: "angielski", fr: "francuski", es: "hiszpański" },
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

export default function CoursesScreen() {
  const styles = useStyles();
  const router = useRouter();
  const {
    courses,
    setActiveCourseIdx,
    setActiveCustomCourseId,
    setLevel,
    colors,
  } = useSettings();

  const [builtInCounts, setBuiltInCounts] = useState<Record<number, number>>(
    {}
  );
  const [customCourses, setCustomCourses] = useState<CustomCourseSummary[]>(
    []
  );
  const [customCounts, setCustomCounts] = useState<Record<number, number>>({});

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
      const rows = await getCustomCoursesWithCardCounts();
      setCustomCourses(rows);
      const customEntries = await Promise.all(
        rows.map(async (course) => {
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
    } catch (error) {
      console.error("Failed to load custom course counts", error);
      setCustomCourses([]);
      setCustomCounts({});
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
        router.push("/review/memory");
      })();
    },
    [courses, router, setActiveCourseIdx, setActiveCustomCourseId, setLevel]
  );

  const handleSelectCustomCourse = useCallback(
    (courseId: number) => {
      void (async () => {
        await setActiveCustomCourseId(courseId);
        router.push("/review/memory");
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
  const builtInGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        label: string;
        items: Array<{ courseIndex: number; courseLevel: string | null }>;
      }
    >();

    courses.forEach((course, index) => {
      const friendlyLabel =
        languageLabels[course.targetLang]?.[course.sourceLang] ??
        course.sourceLang?.toUpperCase() ??
        "unknown";
      if (!groups.has(friendlyLabel)) {
        groups.set(friendlyLabel, { label: friendlyLabel, items: [] });
      }
      groups.get(friendlyLabel)!.items.push({
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

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.minicontainer}>
          {/* <Text style={styles.title}>Powtórki</Text> */}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Powtórki</Text>
            {builtInGroups.map((group) => (
              <View key={group.label} style={styles.groupContainer}>
                <View style={styles.groupHeader}>
                  <View style={styles.groupDivider} />
                  <Text style={styles.groupHeaderLabel}>{group.label}</Text>
                </View>
                <View style={styles.courseGrid}>
                  {group.items.map(({ courseIndex, courseLevel }) => {
                    const course = courses[courseIndex];
                    const builtInCount = builtInCounts[courseIndex] ?? 0;
                    const sourceFlag = getFlagSource(course.sourceLang);
                    const levelLabel =
                      courseLevel ??
                      (languageLabels[course.targetLang]?.[course.sourceLang] ??
                        course.sourceLang);

                    return (
                      <Pressable
                        key={`${course.sourceLang}-${course.targetLang}-${courseLevel ?? "default"}-${courseIndex}`}
                        style={styles.courseCard}
                        onPress={() => handleSelectCourse(courseIndex)}
                      >
                        {sourceFlag ? (
                          <Image style={styles.flag} source={sourceFlag} />
                        ) : null}
                        <Text style={styles.courseCardText}>{levelLabel}</Text>
                        <View style={styles.courseCount}>
                          {renderCount(builtInCount)}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Twoje</Text>
            {!hasCustomCourses ? (
              <Text style={styles.emptyText}>
                Nie masz jeszcze własnych fiszek.
              </Text>
            ) : !hasVisibleCustomCourses ? (
              <Text style={styles.emptyText}>
                Wszystkie course mają wyłączone powtórki.
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
                      style={styles.courseCard}
                      onPress={() => handleSelectCustomCourse(course.id)}
                    >
                      <IconComponent
                        name={iconName}
                        size={48}
                        color={course.iconColor}
                      />
                      <Text style={styles.courseCardText}>{course.name}</Text>
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
