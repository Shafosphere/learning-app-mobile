import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GestureResponderEvent,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import Octicons from "@expo/vector-icons/Octicons";
import { useStyles } from "./CourseSelectionScreen-styles";
import { useSettings } from "@/src/contexts/SettingsContext";
import { getFlagSource } from "@/src/constants/languageFlags";
import type { LanguageCourse } from "@/src/types/course";
import type { CEFRLevel } from "@/src/types/language";
import MyButton from "@/src/components/button/button";
import { useRouter } from "expo-router";
import { getLanguagePairs } from "@/src/db/sqlite/db";

const levels: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

const placeholderCourses: LanguageCourse[] = [
  { sourceLang: "pl", targetLang: "en" },
  { sourceLang: "pl", targetLang: "fr" },
  { sourceLang: "pl", targetLang: "es" },
  { sourceLang: "pl", targetLang: "de" },
];

const languageLabels: Record<string, string> = {
  pl: "polski",
  en: "angielski",
  fr: "francuski",
  es: "hiszpański",
  de: "niemiecki",
};

const createCourseKey = (course: LanguageCourse) => {
  const sourceKey =
    course.sourceLangId != null
      ? `id:${course.sourceLangId}`
      : `code:${course.sourceLang}`;
  const targetKey =
    course.targetLangId != null
      ? `id:${course.targetLangId}`
      : `code:${course.targetLang}`;
  const levelKey = course.level ? `level:${course.level}` : "level:default";
  return `${sourceKey}->${targetKey}->${levelKey}`;
};

export default function CourseSelectionScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { courses, colors, addCourse, removeCourse, setLevel } = useSettings();

  const [availableCourses, setAvailableCourses] = useState<LanguageCourse[]>(
    []
  );
  const [placeholderPinnedKeys, setPlaceholderPinnedKeys] = useState<
    Set<string>
  >(() => new Set());

  useEffect(() => {
    let isMounted = true;

    getLanguagePairs()
      .then((pairs) => {
        if (!isMounted) {
          return;
        }

        const mapped: LanguageCourse[] = pairs.map((pair) => ({
          sourceLang: pair.source_code,
          targetLang: pair.target_code,
          sourceLangId: pair.source_id,
          targetLangId: pair.target_id,
        }));
        setAvailableCourses(mapped);
      })
      .catch((error) => {
        console.error(
          "[CourseSelection] Failed to load language pairs",
          error
        );
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const usingPlaceholder = availableCourses.length === 0;
  const displayedCourses = useMemo(
    () => (usingPlaceholder ? placeholderCourses : availableCourses),
    [availableCourses, usingPlaceholder]
  );
  const displayedCourseLevels = useMemo(
    () =>
      displayedCourses.flatMap((course) =>
        levels.map<LanguageCourse>((level) => ({
          ...course,
          level,
        }))
      ),
    [displayedCourses]
  );

  const groupedCourses = useMemo(
    () => {
      const groups: Array<{
        key: string;
        targetLang: string | null | undefined;
        targetFlag: ReturnType<typeof getFlagSource>;
        courses: LanguageCourse[];
      }> = [];
      const groupIndex = new Map<string, number>();

      displayedCourseLevels.forEach((course) => {
        const groupKey = course.targetLang ?? "unknown";
        let index = groupIndex.get(groupKey);

        if (index == null) {
          index = groups.length;
          groupIndex.set(groupKey, index);
          groups.push({
            key: groupKey,
            targetLang: course.targetLang,
            targetFlag: getFlagSource(course.targetLang),
            courses: [],
          });
        }

        groups[index].courses.push(course);
      });

      return groups;
    },
    [displayedCourseLevels]
  );

  useEffect(() => {
    if (!usingPlaceholder) {
      setPlaceholderPinnedKeys(new Set());
    }
  }, [usingPlaceholder]);

  const pinnedKeys = useMemo(() => {
    const set = new Set<string>();
    courses.forEach((course) => {
      set.add(createCourseKey(course));
    });
    return set;
  }, [courses]);

  const handlePinToggle = useCallback(
    async (course: LanguageCourse) => {
      const key = createCourseKey(course);

      if (usingPlaceholder) {
        setPlaceholderPinnedKeys((current) => {
          const next = new Set(current);
          if (next.has(key)) {
            next.delete(key);
          } else {
            next.add(key);
          }
          console.log(
            `[CourseSelection] Placeholder pin toggle for ${key}, pinned=${next.has(
              key
            )}`
          );
          return next;
        });
        return;
      }

      const isPinned = pinnedKeys.has(key);

      try {
        if (isPinned) {
          await removeCourse(course);
        } else {
          await addCourse(course);
        }
      } catch (error) {
        console.error(
          `[CourseSelection] Failed to toggle course ${key}`,
          error
        );
      }
    },
    [addCourse, pinnedKeys, removeCourse, usingPlaceholder]
  );

  const handlePinPress = useCallback(
    (event: GestureResponderEvent, course: LanguageCourse) => {
      event.stopPropagation();
      void handlePinToggle(course);
    },
    [handlePinToggle]
  );

  const isCoursePinned = useCallback(
    (course: LanguageCourse) => {
      const key = createCourseKey(course);
      if (usingPlaceholder) {
        return placeholderPinnedKeys.has(key);
      }
      return pinnedKeys.has(key);
    },
    [pinnedKeys, placeholderPinnedKeys, usingPlaceholder]
  );

  const handleCardPress = useCallback(
    (course: LanguageCourse) => {
      if (course.level) {
        setLevel(course.level);
      }
      void handlePinToggle(course);
    },
    [handlePinToggle, setLevel]
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.minicontainer}>
          <Text style={styles.title}>Czego sie uczymy?</Text>

          {groupedCourses.map((group) => {
            const headerCode = group.targetLang
              ? group.targetLang.toUpperCase()
              : group.key.toUpperCase();

            return (
              <View key={`group-${group.key}`} style={styles.groupSection}>
                <View style={styles.groupHeader}>
                  <View style={styles.groupHeaderLine} />
                  <View style={styles.groupHeaderBadge}>
                    {group.targetFlag ? (
                      <Image
                        style={styles.courseCardBadgeFlag}
                        source={group.targetFlag}
                      />
                    ) : null}
                    <Text
                      style={[
                        styles.groupHeaderLabel,
                        !group.targetFlag && styles.groupHeaderLabelNoFlag,
                      ]}
                    >
                      {headerCode}
                    </Text>
                  </View>
                </View>

                {group.courses.map((course) => {
                  const key = createCourseKey(course);
                  const sourceFlag = getFlagSource(course.sourceLang);
                  const isPinned = isCoursePinned(course);
                  const sourceLabel =
                    languageLabels[course.sourceLang] ??
                    course.sourceLang.toUpperCase();
                  const targetLabel = course.targetLang
                    ? languageLabels[course.targetLang] ??
                      course.targetLang.toUpperCase()
                    : headerCode;

                  return (
                    <Pressable
                      key={key}
                      onPress={() => handleCardPress(course)}
                      style={styles.courseCard}
                    >
                      {sourceFlag ? (
                        <Image style={styles.flag} source={sourceFlag} />
                      ) : null}
                      <Text style={styles.courseCardText}>
                        {`${sourceLabel} → ${targetLabel} ${
                          course.level ?? ""
                        }`.trim()}
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={
                          isPinned
                            ? `Odepnij kurs ${targetLabel}`
                            : `Przypnij kurs ${targetLabel}`
                        }
                        style={styles.pinButton}
                        onPress={(event) => handlePinPress(event, course)}
                      >
                        <View
                          style={[
                            styles.pinCheckbox,
                            isPinned && styles.pinCheckboxActive,
                          ]}
                        >
                          {isPinned ? (
                            <Octicons
                              name="pin"
                              size={20}
                              color={colors.headline}
                            />
                          ) : null}
                        </View>
                      </Pressable>
                    </Pressable>
                  );
                })}
              </View>
            );
          })}

          <Text style={styles.footerNote}>kiedys bedzie tu ich wiecej :)</Text>
        </View>
      </ScrollView>

      <View style={styles.buttonscontainer}>
        <View style={styles.buttonsRow}>
          <MyButton
            text="własny"
            color="my_yellow"
            onPress={() => router.push("/custom_course")}
            disabled={false}
            width={90}
          />
        </View>
      </View>
    </View>
  );
}
