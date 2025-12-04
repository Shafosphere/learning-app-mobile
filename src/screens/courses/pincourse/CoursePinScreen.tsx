
import MyButton from "@/src/components/button/button";
import { CourseCard } from "@/src/components/course/CourseCard";
import LogoMessage from "@/src/components/logoMessage/LogoMessage";
import {
  resolveCourseIconProps
} from "@/src/constants/customCourse";
import { getFlagSource } from "@/src/constants/languageFlags";
import { OFFICIAL_PACKS } from "@/src/constants/officialPacks";
import { useSettings } from "@/src/contexts/SettingsContext";
import { getOfficialCustomCoursesWithCardCounts } from "@/src/db/sqlite/db";
import {
  getOnboardingCheckpoint,
  OnboardingCheckpoint,
  setOnboardingCheckpoint,
} from "@/src/services/onboardingCheckpoint";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { LanguageCourse } from "@/src/types/course";
import Ionicons from "@expo/vector-icons/Ionicons";
import Octicons from "@expo/vector-icons/Octicons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GestureResponderEvent,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useStyles } from "./CoursePinScreen-styles";

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
  smallFlag: string | null;
  isMini: boolean;
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

const LEVEL_REGEX = /(a1|a2|b1|b2|c1|c2)$/i;
const INTRO_STORAGE_KEY = "@course_pin_intro_seen_v1";

const createCourseKey = (course: LanguageCourse) => {
  const sourceKey =
    course.sourceLangId != null
      ? `id:${course.sourceLangId} `
      : `code:${course.sourceLang} `;
  const targetKey =
    course.targetLangId != null
      ? `id:${course.targetLangId} `
      : `code:${course.targetLang} `;
  const levelKey = course.level ? `level:${course.level} ` : "level:default";
  return `${sourceKey} -> ${targetKey} -> ${levelKey} `;
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
  const [showIntro, setShowIntro] = useState(false);
  const [introStep, setIntroStep] = useState(0);
  const [checkpoint, setCheckpoint] = useState<OnboardingCheckpoint | null>(
    null
  );

  // Legacy course derivation removed to prevent ghost courses
  useEffect(() => {
    setAvailableCourses([]);
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
            smallFlag: manifest?.smallFlag ?? manifest?.sourceLang ?? null,
            isMini: manifest?.isMini ?? true,
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

  useEffect(() => {
    let mounted = true;

    async function hydrateIntro() {
      try {
        const [cp, seen] = await Promise.all([
          getOnboardingCheckpoint(),
          AsyncStorage.getItem(INTRO_STORAGE_KEY),
        ]);
        if (!mounted) return;

        const resolved = cp ?? "pin_required";
        setCheckpoint(resolved);

        if (resolved !== "done" && seen !== "1") {
          setShowIntro(true);
          setIntroStep(0);
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

  const displayedCourses = availableCourses;

  const groupedCourses = useMemo(() => {
    const map = new Map<string, CourseGroup>();

    const ensureGroup = (
      sourceLang: string | null | undefined,
      targetLang: string | null | undefined
    ): CourseGroup => {
      const key = `${sourceLang ?? "unknown"} -${targetLang ?? "unknown"} `;
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

    displayedCourses.forEach((course) => {
      ensureGroup(course.sourceLang, course.targetLang).courses.push(course);
    });

    officialCourses.forEach((pack) => {
      ensureGroup(pack.sourceLang, pack.targetLang).officialPacks.push(pack);
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
  }, [displayedCourses, officialCourses]);

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

      const isPinned = pinnedKeys.has(key);

      try {
        if (isPinned) {
          await removeCourse(course);
          const remaining = courses.length - 1;
          if (remaining <= 0) {
            setCheckpoint("pin_required");
            void setOnboardingCheckpoint("pin_required");
          }
        } else {
          await addCourse(course);
          setCheckpoint("activate_required");
          void setOnboardingCheckpoint("activate_required");
        }
      } catch (error) {
        console.error(`[CoursePin] Failed to toggle course ${key} `, error);
      }
    },
    [addCourse, courses.length, pinnedKeys, removeCourse, setCheckpoint]
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
          const remaining = pinnedOfficialCourseIds.length - 1;
          if (remaining <= 0 && courses.length === 0) {
            setCheckpoint("pin_required");
            void setOnboardingCheckpoint("pin_required");
          }
        } else {
          await pinOfficialCourse(id);
          setCheckpoint("activate_required");
          void setOnboardingCheckpoint("activate_required");
        }
      } catch (error) {
        console.error(
          `[CoursePin] Failed to toggle official pack ${id} `,
          error
        );
      }
    },
    [
      courses.length,
      pinOfficialCourse,
      pinnedOfficialCourseIds,
      unpinOfficialCourse,
      setCheckpoint,
    ]
  );

  const isCoursePinned = useCallback(
    (course: LanguageCourse) => {
      const key = createCourseKey(course);
      return pinnedKeys.has(key);
    },
    [pinnedKeys]
  );

  const hasAnyPinned = useMemo(() => {
    return pinnedKeys.size > 0 || pinnedOfficialCourseIds.length > 0;
  }, [
    pinnedKeys,
    pinnedOfficialCourseIds,
  ]);

  const handleCardPress = useCallback(
    (course: LanguageCourse) => {
      if (course.level) {
        setLevel(course.level);
      }
      void handlePinToggle(course);
    },
    [handlePinToggle, setLevel]
  );

  const introMessages = useMemo(
    () => [
      {
        title: "Cześć, jestem X",
        description: "Oprowadzę Cię po aplikacji. Zacznijmy od wybrania kursów",
      },
      {
        title: "Przypnij kilka kursów",
        description:
          "Możesz przypiąć więcej niż jeden kurs naraz. Po prostu zaznacz te, które cie interesują.",
      },
      {
        title: "Po przypięciu kliknij Dalej",
        description:
          "Przycisk u dołu włączy się, gdy przypniesz co najmniej jeden kurs.",
      },
      {
        title: "Własne kursy!",
        description:
          "Pożniej bedziesz mógł zrobić własne kursy z swoimi fiszkami! :3",
      },
    ],
    []
  );

  const handleCloseIntro = useCallback(() => {
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

  const introActive = checkpoint !== "done";
  const renderOfficialPackCard = useCallback(
    (pack: OfficialCourseListItem) => {
      const iconProps = resolveCourseIconProps(pack.iconId, pack.iconColor);
      const isPinned = pinnedOfficialCourseIds.includes(pack.id);
      const flagLang = pack.smallFlag ?? pack.sourceLang;
      const flagSource = flagLang ? getFlagSource(flagLang) : undefined;
      return (
        <CourseCard
          key={`official-${pack.id}`}
          onPress={() => void handleOfficialPinToggle(pack.id)}
          containerStyle={styles.courseCard}
          {...iconProps}
          flagSource={flagSource}
          flagStyle={styles.officialFlagBadge}
          infoStyle={styles.courseCardInfo}
          title={pack.name}
          titleContainerStyle={styles.courseCardTitleContainer}
          titleTextStyle={styles.customCardTitle}
          meta={`fiszki: ${pack.cardsCount} `}
          metaTextStyle={styles.customCardMeta}
          rightAccessory={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                isPinned
                  ? `Odepnij zestaw ${pack.name} `
                  : `Przypnij zestaw ${pack.name} `
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
                  <Octicons name="pin" size={20} color={colors.headline} />
                ) : null}
              </View>
            </Pressable>
          }
        />
      );
    },
    [colors.headline, handleOfficialPinToggle, pinnedOfficialCourseIds, styles]
  );

  return (
    <View style={styles.container}>
      {showIntro && introMessages[introStep] ? (
        <View style={styles.introOverlay} pointerEvents="box-none">
          <LogoMessage
            floating
            offset={{ top: 12, left: 12, right: 12 }}
            title={introMessages[introStep].title}
            description={introMessages[introStep].description}
            onClose={handleCloseIntro}
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
          <Text style={styles.title}>Czego sie uczymy?</Text>

          {groupedCourses.map((group) => {
            const hasCourses = group.courses.length > 0;
            const regularOfficialPacks = group.officialPacks.filter(
              (pack) => pack.isMini === false
            );
            const miniOfficialPacks = group.officialPacks.filter(
              (pack) => pack.isMini !== false
            );
            const hasOfficial =
              regularOfficialPacks.length > 0 || miniOfficialPacks.length > 0;
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
              <View key={`group - ${group.key} `} style={styles.groupSection}>
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
                          {`${sourceLabel} → ${targetLabel} ${course.level ?? ""
                            } `.trim()}
                        </Text>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={
                            isPinned
                              ? `Odepnij kurs ${targetLabel} `
                              : `Przypnij kurs ${targetLabel} `
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
                    {regularOfficialPacks.length ? (
                      <>
                        <Text style={styles.subTitle}>Kursy</Text>
                        {regularOfficialPacks.map(renderOfficialPackCard)}
                      </>
                    ) : null}

                    {miniOfficialPacks.length ? (
                      <>
                        <Text style={styles.subTitle}>Mini kursy</Text>
                        {miniOfficialPacks.map(renderOfficialPackCard)}
                      </>
                    ) : null}
                  </>
                ) : null}
              </View>
            );
          })}

          <Text style={styles.footerNote}>kiedys bedzie tu ich wiecej :)</Text>
        </View>
      </ScrollView>

      {introActive ? (
        <View style={styles.buttonscontainer}>
          <View style={styles.buttonsRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Przejdź dalej do aktywacji"
              disabled={!hasAnyPinned}
              onPress={() => {
                setCheckpoint("activate_required");
                void setOnboardingCheckpoint("activate_required");
                router.replace("/coursepanel");
              }}
              style={[
                styles.nextButton,
                !hasAnyPinned && styles.nextButtonDisabled,
              ]}
            >
              <Text
                style={[
                  styles.nextButtonLabel,
                  !hasAnyPinned && styles.nextButtonLabelDisabled,
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
      )}
    </View>
  );
}
