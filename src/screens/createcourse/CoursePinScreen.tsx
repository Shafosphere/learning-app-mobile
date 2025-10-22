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
import { CourseCard } from "@/src/components/course/CourseCard";
import { useRouter } from "expo-router";
import {
  getLanguagePairs,
  getOfficialCustomCoursesWithCardCounts,
} from "@/src/db/sqlite/db";
import { getCourseIconById } from "@/src/constants/customCourse";
import { OFFICIAL_PACKS } from "@/src/constants/officialPacks";
import Ionicons from "@expo/vector-icons/Ionicons";

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

type OfficialCourseListItem = {
  id: number;
  name: string;
  iconId: string;
  iconColor: string;
  slug: string | null;
  sourceLang: string | null;
  targetLang: string | null;
  cardsCount: number;
};

type CourseGroup = {
  key: string;
  sourceLang: string | null;
  targetLang: string | null;
  sourceFlag: ReturnType<typeof getFlagSource>;
  targetFlag: ReturnType<typeof getFlagSource>;
  courses: LanguageCourse[];
  officialPacks: OfficialCourseListItem[];
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

export default function CoursePinScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { courses, colors, addCourse, removeCourse, setLevel } = useSettings();
  const { pinnedOfficialCourseIds, pinOfficialCourse, unpinOfficialCourse } =
    useSettings();

  const [availableCourses, setAvailableCourses] = useState<LanguageCourse[]>(
    []
  );
  const [officialCourses, setOfficialCourses] = useState<
    OfficialCourseListItem[]
  >([]);
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
        console.error("[CoursePin] Failed to load language pairs", error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    getOfficialCustomCoursesWithCardCounts()
      .then((rows) => {
        if (!isMounted) return;
        const mapped = rows.map<OfficialCourseListItem>((r) => {
          const manifest = OFFICIAL_PACKS.find((pack) => pack.slug === r.slug);
          return {
            id: r.id,
            name: r.name,
            iconId: r.iconId,
            iconColor: r.iconColor,
            slug: r.slug ?? null,
            sourceLang: manifest?.sourceLang ?? null,
            targetLang: manifest?.targetLang ?? null,
            cardsCount: r.cardsCount,
          };
        });
        setOfficialCourses(mapped);
      })
      .catch((error) => {
        console.error("[CoursePin] Failed to load official packs", error);
        setOfficialCourses([]);
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

  const groupedCourses = useMemo(() => {
    const map = new Map<string, CourseGroup>();

    const ensureGroup = (
      sourceLang: string | null | undefined,
      targetLang: string | null | undefined
    ): CourseGroup => {
      const key = `${sourceLang ?? "unknown"}-${targetLang ?? "unknown"}`;
      let group = map.get(key);
      if (!group) {
        group = {
          key,
          sourceLang: sourceLang ?? null,
          targetLang: targetLang ?? null,
          sourceFlag: sourceLang ? getFlagSource(sourceLang) : undefined,
          targetFlag: targetLang ? getFlagSource(targetLang) : undefined,
          courses: [],
          officialPacks: [],
        };
        map.set(key, group);
      }
      return group;
    };

    displayedCourseLevels.forEach((course) => {
      ensureGroup(course.sourceLang, course.targetLang).courses.push(course);
    });

    officialCourses.forEach((pack) => {
      ensureGroup(pack.sourceLang, pack.targetLang).officialPacks.push(pack);
    });

    return Array.from(map.values());
  }, [displayedCourseLevels, officialCourses]);

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
            `[CoursePin] Placeholder pin toggle for ${key}, pinned=${next.has(
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
          `[CoursePin] Failed to toggle course ${key}`,
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

  const handleOfficialPinToggle = useCallback(
    async (id: number) => {
      const isPinned = pinnedOfficialCourseIds.includes(id);
      try {
        if (isPinned) {
          await unpinOfficialCourse(id);
        } else {
          await pinOfficialCourse(id);
        }
      } catch (error) {
        console.error(
          `[CoursePin] Failed to toggle official pack ${id}`,
          error
        );
      }
    },
    [pinOfficialCourse, pinnedOfficialCourseIds, unpinOfficialCourse]
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
            const hasCourses = group.courses.length > 0;
            const hasOfficial = group.officialPacks.length > 0;
            if (!hasCourses && !hasOfficial) {
              return null;
            }

            const nativeCode = group.targetLang
              ? group.targetLang.toUpperCase()
              : "?";
            const learningCode = group.sourceLang
              ? group.sourceLang.toUpperCase()
              : "?";

            return (
              <View key={`group-${group.key}`} style={styles.groupSection}>
                <View style={styles.groupHeader}>
                  <View style={styles.groupHeaderLine} />
                  <View style={styles.groupHeaderBadge}>
                    <View style={styles.groupHeaderLanguage}>
                      <Text style={styles.groupHeaderCode}>{nativeCode}</Text>
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
                            {learningCode}
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

                {hasCourses
                  ? group.courses.map((course) => {
                      const key = createCourseKey(course);
                      const sourceFlag = getFlagSource(course.sourceLang);
                      const isPinned = isCoursePinned(course);
                      const sourceLabel =
                        languageLabels[course.sourceLang] ??
                        course.sourceLang.toUpperCase();
                      const targetLabel =
                        languageLabels[course.targetLang] ??
                        course.targetLang.toUpperCase();

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
                    })
                  : null}

                {hasOfficial ? (
                  <>
                    <Text style={styles.subTitle}>Mini kursy</Text>
                    {group.officialPacks.map((pack) => {
                      const iconMeta = getCourseIconById(pack.iconId);
                      const IconComponent = iconMeta?.Component ?? Ionicons;
                      const iconName = (iconMeta?.name ??
                        "grid-outline") as never;
                      const isPinned = pinnedOfficialCourseIds.includes(
                        pack.id
                      );
                      return (
                        <CourseCard
                          key={`official-${pack.id}`}
                          onPress={() => void handleOfficialPinToggle(pack.id)}
                          containerStyle={styles.courseCard}
                          icon={{
                            Component: IconComponent,
                            name: iconName,
                            color: pack.iconColor,
                            size: 60,
                          }}
                          flagSource={
                            pack.sourceLang
                              ? getFlagSource(pack.sourceLang)
                              : undefined
                          }
                          flagStyle={styles.officialFlagBadge}
                          infoStyle={styles.courseCardInfo}
                          title={pack.name}
                          titleContainerStyle={styles.courseCardTitleContainer}
                          titleTextStyle={styles.customCardTitle}
                          meta={`fiszki: ${pack.cardsCount}`}
                          metaTextStyle={styles.customCardMeta}
                          rightAccessory={
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={
                                isPinned
                                  ? `Odepnij zestaw ${pack.name}`
                                  : `Przypnij zestaw ${pack.name}`
                              }
                              style={styles.pinButton}
                              onPress={(event) => {
                                event.stopPropagation();
                                void handleOfficialPinToggle(pack.id);
                              }}
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
                          }
                        />
                      );
                    })}
                  </>
                ) : null}
              </View>
            );
          })}

          <Text style={styles.footerNote}>kiedys bedzie tu ich wiecej :)</Text>
        </View>
      </ScrollView>

      <View style={styles.buttonscontainer}>
        <View style={styles.buttonsRow}>
          <MyButton
            color="my_yellow"
            onPress={() => router.push("/coursepanel")}
            disabled={false}
            width={60}
            accessibilityLabel="Wróć do panelu kursów"
          >
            <Ionicons name="arrow-back" size={28} color={colors.headline} />
          </MyButton>
          <MyButton
            text="własny"
            color="my_green"
            onPress={() => router.push("/custom_course")}
            disabled={false}
            width={90}
          />
        </View>
      </View>
    </View>
  );
}
