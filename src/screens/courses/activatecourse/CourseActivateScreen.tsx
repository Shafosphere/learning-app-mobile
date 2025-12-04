import MyButton from "@/src/components/button/button";
import { CourseCard } from "@/src/components/course/CourseCard";
import LogoMessage from "@/src/components/logoMessage/LogoMessage";
import {
  resolveCourseIconProps
} from "@/src/constants/customCourse";
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
  OnboardingCheckpoint,
  setOnboardingCheckpoint,
} from "@/src/services/onboardingCheckpoint";
import type { LanguageCourse } from "@/src/types/course";
import AsyncStorage from "@react-native-async-storage/async-storage";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useStyles } from "./CourseActivateScreen-styles";

type BuiltinCourseItem = { course: LanguageCourse; index: number };

type OfficialCourseListItem = CustomCourseSummary & {
  sourceLang: string | null;
  targetLang: string | null;
  smallFlag: string | null;
  isMini: boolean;
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

const LEVEL_REGEX = /(a1|a2|b1|b2|c1|c2)$/i;
const INTRO_STORAGE_KEY = "@course_activate_intro_seen_v1";

const LANGUAGE_LABELS: Record<string, Record<string, string>> = {
  pl: { en: "angielski", fr: "francuski", es: "hiszpański" },
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

export default function CourseActivateScreen() {
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
  const [checkpoint, setCheckpoint] = useState<OnboardingCheckpoint | null>(
    null
  );
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

  const allowedBuiltinCourseKeys = useMemo(() => {
    const set = new Set<string>();
    OFFICIAL_PACKS.forEach((pack) => {
      if (!pack.sourceLang || !pack.targetLang) return;
      const match = pack.slug.match(LEVEL_REGEX);
      const base: LanguageCourse = {
        sourceLang: pack.sourceLang,
        targetLang: pack.targetLang,
      };
      if (match) {
        set.add(
          createCourseKey({
            ...base,
            level: match[1].toUpperCase(),
          })
        );
      }
      set.add(createCourseKey(base));
    });
    return set;
  }, []);

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
      const keyWithLevel = createCourseKey(course);
      const keyWithoutLevel = createCourseKey({ ...course, level: undefined });
      if (
        allowedBuiltinCourseKeys.size > 0 &&
        !allowedBuiltinCourseKeys.has(keyWithLevel) &&
        !allowedBuiltinCourseKeys.has(keyWithoutLevel)
      ) {
        return;
      }
      const targetLang = course.targetLang ?? null;
      const sourceLang = course.sourceLang ?? null;
      ensureGroup(sourceLang, targetLang).builtin.push({ course, index });
    });

    pinnedOfficialCourses.forEach((course) => {
      ensureGroup(course.sourceLang, course.targetLang).official.push(course);
    });

    const compareLangs = (
      a: string | null | undefined,
      b: string | null | undefined
    ) => {
      const first = a ?? "";
      const second = b ?? "";
      return first.localeCompare(second);
    };

    return Array.from(map.values()).sort((a, b) => {
      const targetDiff = compareLangs(a.targetLang, b.targetLang);
      if (targetDiff !== 0) return targetDiff;
      return compareLangs(a.sourceLang, b.sourceLang);
    });
  }, [allowedBuiltinCourseKeys, courses, pinnedOfficialCourses]);

  const hasBuiltInCourses = useMemo(
    () => courseGroups.some((group) => group.builtin.length > 0),
    [courseGroups]
  );

  const hasPinnedOfficialCourses = pinnedOfficialCourses.length > 0;
  const hasUserCustomCourses = userCustomCourses.length > 0;
  const isEmptyState =
    !hasBuiltInCourses && !hasPinnedOfficialCourses && !hasUserCustomCourses;

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
        setCheckpoint(resolved);

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
    setCheckpoint("done");
    setPopup({
      message: "Aktywowałem kurs :3",
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
    [
      canActivate,
      committedCourse,
      courses,
      notifyActivated,
      setActiveCourseIdx,
      setLevel,
    ]
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
    const params = [`id=${course.id.toString()}`, `name=${encodedName}`];
    if (course.isOfficial) {
      params.push("lockAppearance=1");
    }
    router.push(`/editcourse?${params.join("&")}`);
  };

  const handleEditBuiltinCourse = useCallback(
    (course: LanguageCourse) => {
      const baseLabel =
        LANGUAGE_LABELS[course.targetLang]?.[course.sourceLang] ??
        course.sourceLang;
      const displayName = `${baseLabel}${course.level ? ` ${course.level}` : ""
        }`;
      const params = [
        `name=${encodeURIComponent(displayName)}`,
        `targetLang=${encodeURIComponent(course.targetLang)}`,
      ];
      if (course.sourceLang) {
        params.push(`sourceLang=${encodeURIComponent(course.sourceLang)}`);
      }
      if (course.level) {
        params.push(`level=${encodeURIComponent(course.level)}`);
      }
      router.push(`/editcourse?${params.join("&")}`);
    },
    [router]
  );

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
          const iconProps = resolveCourseIconProps(
            course.iconId,
            course.iconColor
          );
          const flagLang = course.smallFlag ?? course.sourceLang;
          const sourceFlag = flagLang ? getFlagSource(flagLang) : undefined;

          return (
            <CourseCard
              key={`official-${course.id}`}
              onPress={() => handleCustomCoursePress(course.id)}
              containerStyle={styles.customCard}
              contentStyle={styles.customCardContent}
              {...iconProps}
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

  const hasActiveCourse =
    activeCourseIdx != null || activeCustomCourseId != null;
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
              {hasBuiltInCourses || hasPinnedOfficialCourses ? (
                <>
                  <Text style={styles.title}>Stworzone przez nas</Text>
                  <View style={styles.builtinSection}>
                    {courseGroups.map((group) => {
                      const hasBuiltin = group.builtin.length > 0;
                      const regularOfficial = group.official.filter(
                        (course) => course.isMini === false
                      );
                      const miniOfficial = group.official.filter(
                        (course) => course.isMini !== false
                      );
                      const hasOfficial =
                        regularOfficial.length > 0 || miniOfficial.length > 0;
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
                                const sourceFlag = getFlagSource(
                                  item.sourceLang
                                );
                                const languageLabel =
                                  item.targetLang && item.sourceLang
                                    ? LANGUAGE_LABELS[item.targetLang]?.[
                                    item.sourceLang
                                    ]
                                    : undefined;
                                const displayTitle = `${languageLabel ?? item.sourceLang ?? ""
                                  }${item.level ? ` ${item.level}` : ""}`;

                                return (
                                  <Pressable
                                    key={index}
                                    onPress={() =>
                                      handleBuiltinCoursePress(index)
                                    }
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
                                      {displayTitle}
                                    </Text>
                                    <Pressable
                                      accessibilityRole="button"
                                      accessibilityLabel={`Edytuj kurs ${displayTitle}`}
                                      style={styles.courseEditButton}
                                      onPress={(event) => {
                                        event.stopPropagation();
                                        handleEditBuiltinCourse(item);
                                      }}
                                      hitSlop={8}
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
                          ) : null}

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
                      const iconProps = resolveCourseIconProps(
                        course.iconId,
                        course.iconColor
                      );
                      const isHighlighted =
                        committedCourse?.type === "custom" &&
                        committedCourse.id === course.id;
                      return (
                        <CourseCard
                          key={course.id}
                          onPress={() => handleCustomCoursePress(course.id)}
                          containerStyle={styles.customCard}
                          contentStyle={styles.customCardContent}
                          {...iconProps}
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
                setCheckpoint("done");
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
