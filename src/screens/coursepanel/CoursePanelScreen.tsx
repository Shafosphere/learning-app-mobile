import { useStyles } from "./CoursePanelScreen-styles";
import { Image, Text, View, Pressable, ScrollView } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSettings } from "@/src/contexts/SettingsContext";
import MyButton from "@/src/components/button/button";
import { useRouter } from "expo-router";
import { usePopup } from "@/src/contexts/PopupContext";
import { useFocusEffect } from "@react-navigation/native";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import {
  getCustomCoursesWithCardCounts,
  type CustomCourseSummary,
} from "@/src/db/sqlite/db";
import { getCourseIconById } from "@/src/constants/customCourse";
import { getFlagSource } from "@/src/constants/languageFlags";
import type { LanguageCourse } from "@/src/types/course";

type BuiltinCourseGroup = {
  key: string;
  targetLang: LanguageCourse["targetLang"];
  targetFlag: ReturnType<typeof getFlagSource>;
  items: Array<{ course: LanguageCourse; index: number }>;
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
  } = useSettings();

  const lang: Record<string, Record<string, string>> = {
    pl: { en: "angielski", fr: "francuski", es: "hiszpański" },
  };

  const [selectedCourse, setSelectedCourse] =
    useState<SelectedCourse | null>(null);
  const [committedCourse, setCommittedCourse] =
    useState<SelectedCourse | null>(null);
  const [customCourses, setCustomCourses] = useState<CustomCourseSummary[]>(
    []
  );
  const router = useRouter();
  const setPopup = usePopup();

  const builtinCourseGroups = useMemo(() => {
    const groups: BuiltinCourseGroup[] = [];
    const groupIndex = new Map<string, number>();

    courses.forEach((course, index) => {
      const targetLang = course.targetLang;
      const groupKey = targetLang ?? "unknown";
      let position = groupIndex.get(groupKey);

      if (position == null) {
        position = groups.length;
        groupIndex.set(groupKey, position);
        groups.push({
          key: groupKey,
          targetLang,
          targetFlag: getFlagSource(targetLang),
          items: [],
        });
      }

      groups[position].items.push({ course, index });
    });

    return groups;
  }, [courses]);

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
      return () => {
        isMounted = false;
      };
    }, [])
  );

  const styles = useStyles();

  const handleClick = () => {
    setPopup({
      message: "Zapisano pomyślnie!",
      color: "my_green",
      duration: 3000,
    });
  };

  const confirmSelection = async () => {
    if (!selectedCourse) return;

    if (selectedCourse.type === "builtin") {
      const selected = courses[selectedCourse.index];
      if (selected?.level) {
        setLevel(selected.level);
      }
      await setActiveCourseIdx(selectedCourse.index);
    } else {
      await setActiveCustomCourseId(selectedCourse.id);
    }

    setSelectedCourse(null);
  };

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
          <Text style={styles.title}>Stworzone przez nas</Text>

          <View style={styles.builtinSection}>
            {builtinCourseGroups.map((group) => {
              const headerCode = group.targetLang
                ? group.targetLang.toUpperCase()
                : group.key.toUpperCase();
              const showHeader = group.items.length > 1;

              return (
                <View key={`builtin-group-${group.key}`} style={styles.groupSection}>
                  {showHeader ? (
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
                  ) : null}

                  <View style={styles.groupCourses}>
                    {group.items.map(({ course: item, index }) => {
                      const highlightCourse = selectedCourse ?? committedCourse;
                      const isHighlighted =
                        highlightCourse?.type === "builtin" &&
                        highlightCourse.index === index;
                      const targetFlag = showHeader ? null : group.targetFlag;
                      const sourceFlag = getFlagSource(item.sourceLang);

                      return (
                        <Pressable
                          key={index}
                          onPress={() =>
                            setSelectedCourse({ type: "builtin", index })
                          }
                          style={[styles.courseCard, isHighlighted && styles.clicked]}
                        >
                          {targetFlag ? (
                            <View style={styles.courseCardBadge}>
                              <Image
                                style={styles.courseCardBadgeFlag}
                                source={targetFlag}
                              />
                              <Text style={styles.courseCardBadgeText}>
                                {item.targetLang?.toUpperCase()}
                              </Text>
                            </View>
                          ) : null}
                          {sourceFlag ? (
                            <Image style={styles.flag} source={sourceFlag} />
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
                </View>
              );
            })}
          </View>

          <View style={styles.customSection}>
            <Text style={styles.customSectionTitle}>Stworzone przez Ciebie</Text>
            {customCourses.length === 0 ? (
              <Text style={styles.customEmptyText}>
                Nie masz jeszcze własnych fiszek.
              </Text>
            ) : (
              <View style={styles.customList}>
                {customCourses.map((course) => {
                  const iconMeta = getCourseIconById(course.iconId);
                  const IconComponent = iconMeta?.Component ?? Ionicons;
                  const iconName = (iconMeta?.name ?? "grid-outline") as never;
                  const highlightCourse = selectedCourse ?? committedCourse;
                  const isHighlighted =
                    highlightCourse?.type === "custom" &&
                    highlightCourse.id === course.id;
                  return (
                    <Pressable
                      key={course.id}
                      onPress={() =>
                        setSelectedCourse({ type: "custom", id: course.id })
                      }
                      style={[styles.customCard, isHighlighted && styles.clicked]}
                    >
                      <View style={styles.customCardContent}>
                        <View
                          style={[
                            styles.customIconBadge,
                            { borderColor: course.iconColor },
                          ]}
                        >
                          <IconComponent
                            name={iconName}
                            size={60}
                            color={course.iconColor}
                          />
                        </View>
                        <View style={styles.customCardInfo}>
                          <Text style={styles.customCardTitle}>
                            {course.name}
                          </Text>
                          <Text style={styles.customCardMeta}>
                            fiszki: {course.cardsCount}
                          </Text>
                        </View>
                      </View>
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
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
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

          <MyButton
            text="aktywuj"
            color="my_green"
            onPress={() => {
              confirmSelection();
              handleClick();
            }}
            disabled={
              !selectedCourse ||
              (selectedCourse.type === "builtin" &&
                committedCourse?.type === "builtin" &&
                committedCourse.index === selectedCourse.index) ||
              (selectedCourse.type === "custom" &&
                committedCourse?.type === "custom" &&
                committedCourse.id === selectedCourse.id)
            }
          />
        </View>
      </View>
    </View>
  );
}
