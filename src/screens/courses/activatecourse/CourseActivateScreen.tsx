import MyButton from "@/src/components/button/button";
import { CourseListCard } from "@/src/components/course/CourseListCard";
import LogoMessage from "@/src/components/logoMessage/LogoMessage";
import { COURSE_CATEGORIES, CourseCategory } from "@/src/constants/courseCategories";
import { getFlagSource } from "@/src/constants/languageFlags";
import { OFFICIAL_PACKS } from "@/src/constants/officialPacks";
import { usePopup } from "@/src/contexts/PopupContext";
import { useSettings } from "@/src/contexts/SettingsContext";
import {
  getCustomCoursesWithCardCounts,
  getOfficialCustomCoursesWithCardCounts,
  type CustomCourseSummary,
} from "@/src/db/sqlite/db";
import {
  getOnboardingCheckpoint,
  setOnboardingCheckpoint,
} from "@/src/services/onboardingCheckpoint";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useStyles } from "./CourseActivateScreen-styles";

type OfficialCourseListItem = CustomCourseSummary & {
  sourceLang: string | null;
  targetLang: string | null;
  smallFlag: string | null;
  isMini: boolean;
  categoryId?: string;
};

type CourseGroup = {
  key: string;
  category?: CourseCategory;
  sourceLang: string | null;
  targetLang: string | null;
  sourceFlag?: ReturnType<typeof getFlagSource>;
  targetFlag?: ReturnType<typeof getFlagSource>;
  official: OfficialCourseListItem[];
};

type SelectedCourse = { type: "custom"; id: number };
const INTRO_STORAGE_KEY = "@course_activate_intro_seen_v1";

export default function CourseActivateScreen() {
  const {
    activeCustomCourseId,
    setActiveCustomCourseId,
    colors,
    pinnedOfficialCourseIds,
  } = useSettings();

  const [committedCourse, setCommittedCourse] = useState<SelectedCourse | null>(
    null
  );
  const [customCourses, setCustomCourses] = useState<CustomCourseSummary[]>([]);
  const [officialCourses, setOfficialCourses] = useState<
    OfficialCourseListItem[]
  >([]);
  const router = useRouter();
  const setPopup = usePopup();
  const [showIntro, setShowIntro] = useState(false);
  const [introStep, setIntroStep] = useState(0);
  const [startedInOnboarding, setStartedInOnboarding] = useState(false);

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
      group.official.sort(compareByName);
    });

    return sortedGroups;
  }, [pinnedOfficialCourses]);

  const hasPinnedOfficialCourses = pinnedOfficialCourses.length > 0;
  const hasUserCustomCourses = userCustomCourses.length > 0;
  const isEmptyState =
    !hasPinnedOfficialCourses && !hasUserCustomCourses;

  useEffect(() => {
    if (activeCustomCourseId != null) {
      setCommittedCourse({ type: "custom", id: activeCustomCourseId });
      return;
    }
    setCommittedCourse(null);
  }, [activeCustomCourseId]);

  useEffect(() => {
    let mounted = true;
    async function hydrateIntro() {
      try {
        const [cp, seen] = await Promise.all([
          getOnboardingCheckpoint(),
          AsyncStorage.getItem(INTRO_STORAGE_KEY),
        ]);
        if (!mounted) return;

        const resolved = cp ?? "activate_required";

        if (resolved !== "done") {
          setStartedInOnboarding(true);
          if (seen !== "1") {
            setShowIntro(true);
            setIntroStep(0);
          }
        }
      } catch {
        // ignore
      }
    }

    void hydrateIntro();
    return () => {
      mounted = false;
    };
  }, []);

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
      color: "my_green",
      duration: 3000,
    });
  }, [setPopup]);

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
    const params = [`id=${course.id.toString()}`, `name=${encodedName}`];
    if (course.isOfficial) {
      params.push("lockAppearance=1");
    }
    router.push(`/editcourse?${params.join("&")}`);
  };

  const renderOfficialCourseSection = (
    title: string,
    list: OfficialCourseListItem[]
  ) => {
    if (!list.length) return null;

    return (
      <View style={styles.groupCourses}>
        <Text style={styles.groupSubtitle}>{title}</Text>
        {list.map((course) => {
          const isHighlighted =
            committedCourse?.type === "custom" &&
            committedCourse.id === course.id;
          const flagLang = course.smallFlag ?? course.sourceLang;

          return (
            <CourseListCard
              key={`official-${course.id}`}
              title={course.name}
              subtitle={`fiszki: ${course.cardsCount}`}
              iconId={course.iconId}
              iconColor={course.iconColor}
              flagCode={flagLang}
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
    );
  };

  const introMessages = useMemo(
    () => [
      {
        title: "Aktywuj kurs",
        description:
          "Tutaj aktywujesz kurs, gry będą używać fiszek z aktywnego kursu.",
      },
      {
        title: "Ustawienia kursu",
        description:
          "Każdy kurs ma swoje ustawienia, które możesz zmieniać w kazdej chwili.",
      },
    ],
    []
  );

  const handleIntroClose = useCallback(() => {
    setIntroStep((prev) => {
      const next = prev + 1;
      if (next >= introMessages.length) {
        setShowIntro(false);
        void AsyncStorage.setItem(INTRO_STORAGE_KEY, "1");
        return prev;
      }
      return next;
    });
  }, [introMessages.length]);

  const hasActiveCourse = activeCustomCourseId != null;
  const showOnboardingNext = startedInOnboarding;

  return (
    <View style={styles.container}>
      {showIntro ? (
        <View style={styles.introOverlay} pointerEvents="box-none">
          <LogoMessage
            floating
            offset={{ top: 8, left: 8, right: 8 }}
            title={introMessages[introStep]?.title}
            description={introMessages[introStep]?.description}
            onClose={handleIntroClose}
            closeLabel="Następny komunikat"
          />
        </View>
      ) : null}
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
                  <View style={styles.builtinSection}>
                    {courseGroups.map((group) => {
                      const regularOfficial = group.official.filter(
                        (course) => course.isMini === false
                      );
                      const miniOfficial = group.official.filter(
                        (course) => course.isMini !== false
                      );
                      const hasOfficial =
                        regularOfficial.length > 0 || miniOfficial.length > 0;
                      if (!hasOfficial) {
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
                              {group.category ? (
                                <View style={styles.groupHeaderLanguage}>
                                  {group.category?.icon ? (
                                    <FontAwesome6
                                      name={group.category.icon}
                                      size={16}
                                      color={colors.headline}
                                      style={{ marginRight: 6 }}
                                    />
                                  ) : null}
                                  <Text style={[styles.groupHeaderCode, { fontSize: 24 }]}>
                                    {group.category.label.toUpperCase()}
                                  </Text>
                                </View>
                              ) : (
                                <>
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
                                </>
                              )}
                            </View>
                          </View>

                          {hasOfficial ? (
                            <>
                              {renderOfficialCourseSection(
                                "Kursy",
                                regularOfficial
                              )}
                              {renderOfficialCourseSection(
                                "Mini kursy",
                                miniOfficial
                              )}
                            </>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                </>
              ) : null}

              {hasUserCustomCourses ? (
                <View style={styles.customSection}>
                  <Text style={styles.customSectionTitle}>
                    Stworzone przez Ciebie
                  </Text>
                  <View style={styles.customList}>
                    {userCustomCourses.map((course) => {
                      const isHighlighted =
                        committedCourse?.type === "custom" &&
                        committedCourse.id === course.id;
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
            <Pressable
              accessibilityRole="button"
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
              style={[
                styles.nextButton,
                !hasActiveCourse && styles.nextButtonDisabled,
              ]}
            >
              <Text
                style={[
                  styles.nextButtonLabel,
                  !hasActiveCourse && styles.nextButtonLabelDisabled,
                ]}
              >
                Dalej
              </Text>
            </Pressable>
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
