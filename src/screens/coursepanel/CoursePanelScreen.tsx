import MyButton from "@/src/components/button/button";
import { getCourseIconById } from "@/src/constants/customCourse";
import { getFlagSource } from "@/src/constants/languageFlags";
import { OFFICIAL_PACKS } from "@/src/constants/officialPacks";
import { usePopup } from "@/src/contexts/PopupContext";
import { useSettings } from "@/src/contexts/SettingsContext";
import {
  getCustomCoursesWithCardCounts,
  getOfficialCustomCoursesWithCardCounts,
  type CustomCourseSummary,
} from "@/src/db/sqlite/db";
import type { LanguageCourse } from "@/src/types/course";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useStyles } from "./CoursePanelScreen-styles";
import { CourseCard } from "@/src/components/course/CourseCard";

type BuiltinCourseItem = { course: LanguageCourse; index: number };

type OfficialCourseListItem = CustomCourseSummary & {
  sourceLang: string | null;
  targetLang: string | null;
};

type CourseGroup = {
  key: string;
  sourceLang: string | null;
  targetLang: string | null;
  sourceFlag?: ReturnType<typeof getFlagSource>;
  targetFlag?: ReturnType<typeof getFlagSource>;
  builtin: BuiltinCourseItem[];
  official: OfficialCourseListItem[];
};

type SelectedCourse =
  | { type: "builtin"; index: number }
  | { type: "custom"; id: number };

export default function CoursePanelScreen() {
  const {
    courses,
    activeCourseIdx,
    setActiveCourseIdx,
    activeCourse,
    activeCustomCourseId,
    setActiveCustomCourseId,
    colors,
    setLevel,
    pinnedOfficialCourseIds,
  } = useSettings();

  const lang: Record<string, Record<string, string>> = {
    pl: { en: "angielski", fr: "francuski", es: "hiszpański" },
  };

  const [committedCourse, setCommittedCourse] =
    useState<SelectedCourse | null>(null);
  const [customCourses, setCustomCourses] = useState<CustomCourseSummary[]>(
    []
  );
  const [officialCourses, setOfficialCourses] = useState<OfficialCourseListItem[]>(
    []
  );
  const router = useRouter();
  const setPopup = usePopup();

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
      sourceLang?: string | null,
      targetLang?: string | null
    ): CourseGroup => {
      const key = `${targetLang ?? "unknown"}-${sourceLang ?? "unknown"}`;
      let group = map.get(key);
      if (!group) {
        group = {
          key,
          sourceLang: sourceLang ?? null,
          targetLang: targetLang ?? null,
          sourceFlag: sourceLang ? getFlagSource(sourceLang) : undefined,
          targetFlag: targetLang ? getFlagSource(targetLang) : undefined,
          builtin: [],
          official: [],
        };
        map.set(key, group);
      }
      return group;
    };

    courses.forEach((course, index) => {
      const targetLang = course.targetLang ?? null;
      const sourceLang = course.sourceLang ?? null;
      ensureGroup(sourceLang, targetLang).builtin.push({ course, index });
    });

    pinnedOfficialCourses.forEach((course) => {
      ensureGroup(course.sourceLang, course.targetLang).official.push(course);
    });

    return Array.from(map.values());
  }, [courses, pinnedOfficialCourses]);

  const hasBuiltInCourses = useMemo(
    () => courseGroups.some((group) => group.builtin.length > 0),
    [courseGroups]
  );

  const hasPinnedOfficialCourses = pinnedOfficialCourses.length > 0;
  const hasUserCustomCourses = userCustomCourses.length > 0;
  const isEmptyState =
    !hasBuiltInCourses &&
    !hasPinnedOfficialCourses &&
    !hasUserCustomCourses;

  useEffect(() => {
    console.log("courses length:", courses.length);
    console.log("courses:", JSON.stringify(courses, null, 2));
    console.log(
      "activeCourseIdx:",
      activeCourseIdx,
      "activeCourse:",
      activeCourse,
      "activeCustomCourseId:",
      activeCustomCourseId
    );
  }, [courses, activeCourseIdx, activeCourse, activeCustomCourseId]);

  useEffect(() => {
    if (activeCourseIdx != null) {
      setCommittedCourse({ type: "builtin", index: activeCourseIdx });
      return;
    }
    if (activeCustomCourseId != null) {
      setCommittedCourse({ type: "custom", id: activeCustomCourseId });
      return;
    }
    setCommittedCourse(null);
  }, [activeCourseIdx, activeCustomCourseId]);

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
              const manifest = OFFICIAL_PACKS.find((pack) => pack.slug === row.slug);
              return {
                ...row,
                sourceLang: manifest?.sourceLang ?? null,
                targetLang: manifest?.targetLang ?? null,
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
  const ACTIVATION_COOLDOWN_MS = 100;

  const canActivate = useCallback(() => {
    const now = Date.now();
    if (now - activationCooldownRef.current < ACTIVATION_COOLDOWN_MS) {
      return false;
    }
    activationCooldownRef.current = now;
    return true;
  }, []);

  const notifyActivated = useCallback(() => {
    setPopup({
      message: "Zapisano pomyślnie!",
      color: "my_green",
      duration: 3000,
    });
  }, [setPopup]);

  const handleBuiltinCoursePress = useCallback(
    async (index: number) => {
      const current = committedCourse;
      if (current?.type === "builtin" && current.index === index) {
        return;
      }
      if (!canActivate()) return;
      const selected = courses[index];
      if (!selected) return;
      if (selected.level) {
        setLevel(selected.level);
      }
      await setActiveCourseIdx(index);
      notifyActivated();
    },
    [canActivate, committedCourse, courses, notifyActivated, setActiveCourseIdx, setLevel]
  );

  const handleCustomCoursePress = useCallback(
    async (id: number) => {
      const current = committedCourse;
      if (current?.type === "custom" && current.id === id) {
        return;
      }
      if (!canActivate()) return;
      await setActiveCustomCourseId(id);
      notifyActivated();
    },
    [canActivate, committedCourse, notifyActivated, setActiveCustomCourseId]
  );

  const handleEditCustomCourse = (course: CustomCourseSummary) => {
    const encodedName = encodeURIComponent(course.name);
    router.push(
      `/custom_course/edit?id=${course.id.toString()}&name=${encodedName}`
    );
  };

  return (
    <View style={styles.container}>
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
              {hasBuiltInCourses || hasPinnedOfficialCourses ? (
                <>
                  <Text style={styles.title}>Stworzone przez nas</Text>
                  <View style={styles.builtinSection}>
                    {courseGroups.map((group) => {
                      const hasBuiltin = group.builtin.length > 0;
                      const hasOfficial = group.official.length > 0;
                      if (!hasBuiltin && !hasOfficial) {
                        return null;
                      }

                      const targetCode = group.targetLang
                        ? group.targetLang.toUpperCase()
                        : "?";
                      const sourceCode = group.sourceLang
                        ? group.sourceLang.toUpperCase()
                        : "?";

                      return (
                        <View
                          key={`builtin-group-${group.key}`}
                          style={styles.groupSection}
                        >
                          <View style={styles.groupHeader}>
                            <View style={styles.groupHeaderLine} />
                            <View style={styles.groupHeaderBadge}>
                              <View style={styles.groupHeaderLanguage}>
                                <Text style={styles.groupHeaderCode}>
                                  {targetCode}
                                </Text>
                                {group.targetFlag ? (
                                  <Image
                                    style={styles.groupHeaderFlag}
                                    source={group.targetFlag}
                                  />
                                ) : null}
                              </View>
                              {group.sourceLang ? (
                                <>
                                  <Text style={styles.groupHeaderSeparator}>
                                    /
                                  </Text>
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

                          {hasBuiltin ? (
                            <View style={styles.groupCourses}>
                              {group.builtin.map(({ course: item, index }) => {
                                const isHighlighted =
                                  committedCourse?.type === "builtin" &&
                                  committedCourse.index === index;
                                const sourceFlag = getFlagSource(item.sourceLang);

                                return (
                                  <Pressable
                                    key={index}
                                    onPress={() => handleBuiltinCoursePress(index)}
                                    style={[
                                      styles.courseCard,
                                      isHighlighted && styles.clicked,
                                    ]}
                                  >
                                    {sourceFlag ? (
                                      <Image
                                        style={styles.flag}
                                        source={sourceFlag}
                                      />
                                    ) : null}
                                    <Text style={styles.courseCardText}>
                                      {`${
                                        lang[item.targetLang]?.[item.sourceLang] ??
                                        item.sourceLang
                                      }${item.level ? ` ${item.level}` : ""}`}
                                    </Text>
                                  </Pressable>
                                );
                              })}
                            </View>
                          ) : null}

                          {hasOfficial ? (
                            <View style={styles.groupCourses}>
                              <Text style={styles.groupSubtitle}>
                                Mini kursy
                              </Text>
                              {group.official.map((course) => {
                                const isHighlighted =
                                  committedCourse?.type === "custom" &&
                                  committedCourse.id === course.id;
                                const iconMeta = getCourseIconById(course.iconId);
                                const IconComponent =
                                  iconMeta?.Component ?? Ionicons;
                                const iconName = (iconMeta?.name ?? "grid-outline") as never;
                                const sourceFlag = course.sourceLang
                                  ? getFlagSource(course.sourceLang)
                                  : undefined;

                                return (
                                  <CourseCard
                                    key={`official-${course.id}`}
                                    onPress={() => handleCustomCoursePress(course.id)}
                                    containerStyle={styles.customCard}
                                    contentStyle={styles.customCardContent}
                                    icon={{
                                      Component: IconComponent,
                                      name: iconName,
                                      color: course.iconColor,
                                      size: 60,
                                    }}
                                    iconWrapperStyle={[
                                      styles.customIconBadge,
                                      { borderColor: course.iconColor },
                                    ]}
                                    flagSource={sourceFlag}
                                    flagStyle={styles.customIconFlag}
                                    infoStyle={styles.customCardInfo}
                                    title={course.name}
                                    titleContainerStyle={styles.customCardTitleContainer}
                                    titleTextStyle={styles.customCardTitle}
                                    meta={`fiszki: ${course.cardsCount}`}
                                    metaTextStyle={styles.customCardMeta}
                                    isHighlighted={isHighlighted}
                                    highlightedStyle={styles.clicked}
                                  />
                                );
                              })}
                            </View>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                </>
              ) : null}

              {hasUserCustomCourses ? (
                <View style={styles.customSection}>
                  <Text style={styles.customSectionTitle}>Stworzone przez Ciebie</Text>
                  <View style={styles.customList}>
                    {userCustomCourses.map((course) => {
                      const iconMeta = getCourseIconById(course.iconId);
                      const IconComponent = iconMeta?.Component ?? Ionicons;
                      const iconName = (iconMeta?.name ?? "grid-outline") as never;
                      const isHighlighted =
                        committedCourse?.type === "custom" &&
                        committedCourse.id === course.id;
                      return (
                        <CourseCard
                          key={course.id}
                          onPress={() => handleCustomCoursePress(course.id)}
                          containerStyle={styles.customCard}
                          contentStyle={styles.customCardContent}
                          icon={{
                            Component: IconComponent,
                            name: iconName,
                            color: course.iconColor,
                            size: 60,
                          }}
                          iconWrapperStyle={[
                            styles.customIconBadge,
                            { borderColor: course.iconColor },
                          ]}
                          infoStyle={styles.customCardInfo}
                          title={course.name}
                          titleContainerStyle={styles.customCardTitleContainer}
                          titleTextStyle={styles.customCardTitle}
                          meta={`fiszki: ${course.cardsCount}`}
                          metaTextStyle={styles.customCardMeta}
                          isHighlighted={isHighlighted}
                          highlightedStyle={styles.clicked}
                          rightAccessory={
                            !course.isOfficial ? (
                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={`Edytuj kurs ${course.name}`}
                                style={styles.customEditButton}
                                onPress={(event) => {
                                  event.stopPropagation();
                                  handleEditCustomCourse(course);
                                }}
                              >
                                <FontAwesome6
                                  name="edit"
                                  size={24}
                                  color={colors.headline}
                                />
                              </Pressable>
                            ) : null
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
    </View>
  );
}
