import MyButton from "@/src/components/button/button";
import { CourseListCard } from "@/src/components/course/CourseListCard";
import LogoMessage from "@/src/components/logoMessage/LogoMessage";
import {
  COURSE_CATEGORIES,
  CourseCategory,
} from "@/src/constants/courseCategories";
import { getFlagSource } from "@/src/constants/languageFlags";
import { OFFICIAL_PACKS } from "@/src/constants/officialPacks";
import { useSettings } from "@/src/contexts/SettingsContext";
import { getOfficialCustomCoursesWithCardCounts } from "@/src/db/sqlite/db";
import {
  getOnboardingCheckpoint,
  OnboardingCheckpoint,
  setOnboardingCheckpoint,
} from "@/src/services/onboardingCheckpoint";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import Ionicons from "@expo/vector-icons/Ionicons";
import Octicons from "@expo/vector-icons/Octicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useStyles } from "./CoursePinScreen-styles";

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
  categoryId?: string;
};

type CourseGroup = {
  key: string;
  category?: CourseCategory;
  sourceLang: string | null;
  targetLang: string | null;
  sourceFlag: ReturnType<typeof getFlagSource>;
  targetFlag: ReturnType<typeof getFlagSource>;
  officialPacks: OfficialCourseListItem[];
};

const INTRO_STORAGE_KEY = "@course_pin_intro_seen_v1";

export default function CoursePinScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { colors, pinnedOfficialCourseIds, pinOfficialCourse, unpinOfficialCourse } =
    useSettings();
  const [officialCourses, setOfficialCourses] = useState<
    OfficialCourseListItem[]
  >([]);
  const [showIntro, setShowIntro] = useState(false);
  const [introStep, setIntroStep] = useState(0);
  const [checkpoint, setCheckpoint] = useState<OnboardingCheckpoint | null>(
    null
  );

  const persistCheckpointIfNeeded = useCallback(
    (next: OnboardingCheckpoint) => {
      setCheckpoint((prev) => {
        const current = prev ?? "pin_required";
        if (current === "done") {
          return current;
        }
        if (current === next) {
          void setOnboardingCheckpoint(next);
          return current;
        }
        void setOnboardingCheckpoint(next);
        return next;
      });
    },
    []
  );

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
            categoryId: manifest?.categoryId,
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

  const groupedCourses = useMemo(() => {
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
        key = `${sourceLang ?? "unknown"} -${targetLang ?? "unknown"} `;
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
          officialPacks: [],
        };
        map.set(key, group);
      }
      return group;
    };

    officialCourses.forEach((pack) => {
      ensureGroup(
        pack.sourceLang,
        pack.targetLang,
        pack.categoryId
      ).officialPacks.push(pack);
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
      group.officialPacks.sort(compareByName);
    });

    return sortedGroups;
  }, [officialCourses]);

  const handleOfficialPinToggle = useCallback(
    async (id: number) => {
      const isPinned = pinnedOfficialCourseIds.includes(id);
      try {
        if (isPinned) {
          await unpinOfficialCourse(id);
          const remaining = pinnedOfficialCourseIds.length - 1;
          if (remaining <= 0) {
            persistCheckpointIfNeeded("pin_required");
          }
        } else {
          await pinOfficialCourse(id);
          persistCheckpointIfNeeded("activate_required");
        }
      } catch (error) {
        console.error(
          `[CoursePin] Failed to toggle official pack ${id} `,
          error
        );
      }
    },
    [pinOfficialCourse, pinnedOfficialCourseIds, persistCheckpointIfNeeded, unpinOfficialCourse]
  );

  const hasAnyPinned = useMemo(() => {
    return pinnedOfficialCourseIds.length > 0;
  }, [pinnedOfficialCourseIds]);

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
      const isPinned = pinnedOfficialCourseIds.includes(pack.id);
      const flagLang = pack.smallFlag ?? pack.sourceLang;

      return (
        <CourseListCard
          key={`official-${pack.id}`}
          title={pack.name}
          subtitle={`fiszki: ${pack.cardsCount}`}
          iconId={pack.iconId}
          iconColor={pack.iconColor}
          flagCode={flagLang}
          onPress={() => void handleOfficialPinToggle(pack.id)}
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
            const regularOfficialPacks = group.officialPacks.filter(
              (pack) => pack.isMini === false
            );
            const miniOfficialPacks = group.officialPacks.filter(
              (pack) => pack.isMini !== false
            );
            const hasOfficial =
              regularOfficialPacks.length > 0 || miniOfficialPacks.length > 0;
            if (!hasOfficial) {
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
                    {group.category ? (
                      <View style={styles.groupHeaderLanguage}>
                        {group.category.icon ? (
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
                      </>
                    )}
                  </View>
                </View>

                {hasOfficial ? (
                  <>
                    {regularOfficialPacks.length ? (
                      <>
                        <Text style={styles.subTitle}>Kursy</Text>
                        <View style={styles.cardsList}>
                          {regularOfficialPacks.map(renderOfficialPackCard)}
                        </View>
                      </>
                    ) : null}

                    {miniOfficialPacks.length ? (
                      <>
                        <Text style={styles.subTitle}>Mini kursy</Text>
                        <View style={styles.cardsList}>
                          {miniOfficialPacks.map(renderOfficialPackCard)}
                        </View>
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
