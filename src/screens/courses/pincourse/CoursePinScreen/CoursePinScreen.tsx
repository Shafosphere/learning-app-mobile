import MyButton from "@/src/components/button/button";
import { SegmentedTabs } from "@/src/components/segmentedTabs/SegmentedTabs";
import { CourseListCard } from "@/src/components/course/CourseListCard";
import { useCoachmarkLayerPortal } from "@/src/components/onboarding/CoachmarkLayerPortal";
import { COURSE_PIN_COACHMARK_STEPS } from "@/src/constants/coachmarkFlows";
import {
  COURSE_CATEGORIES,
  CourseCategory,
} from "@/src/constants/courseCategories";
import { getFlagSource } from "@/src/constants/languageFlags";
import { OFFICIAL_PACKS } from "@/src/constants/officialPacks";
import { useSettings } from "@/src/contexts/SettingsContext";
import { getOfficialCustomCoursesWithCardCounts } from "@/src/db/sqlite/db";
import { useCoachmarkFlow } from "@/src/hooks/useCoachmarkFlow";
import {
  getOnboardingCheckpoint,
  OnboardingCheckpoint,
  setOnboardingCheckpoint
} from "@/src/services/onboardingCheckpoint";
import { CoachmarkAnchor } from "@edwardloopez/react-native-coachmark";
import Ionicons from "@expo/vector-icons/Ionicons";
import Octicons from "@expo/vector-icons/Octicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import {
  AccordionGroupItem,
  CoursePinAccordion,
} from "@/src/components/course/CoursePinAccordion";
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
  position?: number;
};

type CourseGroup = {
  key: string;
  category?: CourseCategory;
  sourceLang: string | null;
  targetLang: string | null;
  sourceFlag?: ReturnType<typeof getFlagSource>;
  targetFlag?: ReturnType<typeof getFlagSource>;
  officialPacks: OfficialCourseListItem[];
};

type CourseViewMode = "languages" | "general";

export default function CoursePinScreen() {
  const styles = useStyles();
  const router = useRouter();
  const params = useLocalSearchParams<{ replayIntro?: string }>();
  const scrollRef = useRef<ScrollView | null>(null);
  const tabSwitcherRef = useRef<View | null>(null);
  const { colors, pinnedOfficialCourseIds, pinOfficialCourse, unpinOfficialCourse } =
    useSettings();
  const [officialCourses, setOfficialCourses] = useState<
    OfficialCourseListItem[]
  >([]);
  const [viewMode, setViewMode] = useState<CourseViewMode>("languages");
  // Local checkpoint state used for immediate UI updates (buttons)
  const [checkpoint, setCheckpoint] = useState<OnboardingCheckpoint | null>(
    null
  );
  const [coachmarkTargetsReady, setCoachmarkTargetsReady] = useState(false);

  const persistCheckpointIfNeeded = useCallback(
    (next: OnboardingCheckpoint) => {
      const current = checkpoint ?? "pin_required";
      if (current === "done") {
        return;
      }
      if (current !== next) {
        setCheckpoint(next);
      }
      void setOnboardingCheckpoint(next);
    },
    [checkpoint]
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
            position: manifest?.position,
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
    const compareByPositionThenName = (
      a: OfficialCourseListItem,
      b: OfficialCourseListItem
    ) => {
      const aPos = a.position ?? Number.POSITIVE_INFINITY;
      const bPos = b.position ?? Number.POSITIVE_INFINITY;
      if (aPos !== bPos) return aPos - bPos;
      return compareByName(a, b);
    };

    const compareLangs = (
      a: string | null | undefined,
      b: string | null | undefined
    ) => {
      const first = a ?? "";
      const second = b ?? "";
      return first.localeCompare(second);
    };

    const sortedGroups = Array.from(map.values()).sort((a, b) => {
      const categoryA = a.category?.label ?? "";
      const categoryB = b.category?.label ?? "";
      const categoryDiff = categoryA.localeCompare(categoryB);
      if (categoryDiff !== 0) return categoryDiff;
      const targetDiff = compareLangs(a.targetLang, b.targetLang);
      if (targetDiff !== 0) return targetDiff;
      return compareLangs(a.sourceLang, b.sourceLang);
    });

    sortedGroups.forEach((group) => {
      group.officialPacks.sort(compareByPositionThenName);
    });

    return sortedGroups;
  }, [officialCourses]);

  const hasAnyPinned = useMemo(() => {
    return pinnedOfficialCourseIds.length > 0;
  }, [pinnedOfficialCourseIds]);

  useEffect(() => {
    let mounted = true;
    getOnboardingCheckpoint().then((value) => {
      if (!mounted) return;
      setCheckpoint(value ?? "pin_required");
    });
    return () => {
      mounted = false;
    };
  }, []);

  const categorizedCourses = useMemo(
    () => groupedCourses.filter((group) => Boolean(group.category)),
    [groupedCourses]
  );
  const languageCourses = useMemo(
    () => groupedCourses.filter((group) => !group.category),
    [groupedCourses]
  );

  const accordionGroups = useMemo<AccordionGroupItem[]>(() => {
    const nextGroups: AccordionGroupItem[] = [];

    categorizedCourses.forEach((group) => {
      const regularItems = group.officialPacks.filter(
        (pack) => pack.isMini === false
      );
      const miniItems = group.officialPacks.filter(
        (pack) => pack.isMini !== false
      );
      const count = regularItems.length + miniItems.length;
      if (count === 0) {
        return;
      }

      const targetCode = group.targetLang ? group.targetLang.toUpperCase() : "?";
      const sourceCode = group.sourceLang ? group.sourceLang.toUpperCase() : "?";
      const title = group.category?.label ?? (group.sourceLang
        ? `${targetCode} / ${sourceCode}`
        : targetCode);

      const icon: AccordionGroupItem["icon"] = group.category?.icon
        ? { kind: "fa6", name: group.category.icon }
        : undefined;

      nextGroups.push({
        key: group.key,
        title,
        subtitle: group.category?.description ?? "",
        count,
        regularItems,
        miniItems,
        icon,
      });
    });

    return nextGroups;
  }, [categorizedCourses]);

  const firstVisiblePackId = useMemo(() => {
    const firstLanguagePack = languageCourses[0]?.officialPacks[0]?.id ?? null;
    const firstGeneralPack =
      accordionGroups[0]?.regularItems[0]?.id ??
      accordionGroups[0]?.miniItems[0]?.id ??
      null;
    return viewMode === "languages"
      ? firstLanguagePack ?? firstGeneralPack
      : firstGeneralPack ?? firstLanguagePack;
  }, [accordionGroups, languageCourses, viewMode]);

  const introActive = checkpoint !== "done";
  const coachmark = useCoachmarkFlow({
    flowKey: "course-pin-guided",
    storageKey: "@course_pin_intro_seen_v1",
    shouldStart:
      introActive && coachmarkTargetsReady && firstVisiblePackId !== null,
    steps: COURSE_PIN_COACHMARK_STEPS,
    completionState: {
      pin_course: hasAnyPinned,
    },
    restartToken: params.replayIntro,
  });

  const coachmarkLayer = useMemo(
    () =>
      coachmark.isActive
        ? {
            currentStep: coachmark.currentStep,
            currentIndex: coachmark.currentIndex,
            totalSteps: coachmark.totalSteps,
            canGoBack: coachmark.canGoBack,
            canGoNext: coachmark.canGoNext,
            onBack: coachmark.goBack,
            onNext: coachmark.goNext,
          }
        : null,
    [
      coachmark.canGoBack,
      coachmark.canGoNext,
      coachmark.currentIndex,
      coachmark.currentStep,
      coachmark.goBack,
      coachmark.goNext,
      coachmark.isActive,
      coachmark.totalSteps,
    ],
  );

  useCoachmarkLayerPortal(
    "course-pin-screen",
    coachmarkLayer,
  );

  useEffect(() => {
    const currentTarget = coachmark.currentStep?.targetId;
    if (
      coachmark.isActive &&
      (currentTarget === "course-pin-first-card" ||
        currentTarget === "course-pin-first-pin-button") &&
      viewMode !== "languages"
    ) {
      setViewMode("languages");
    }
  }, [coachmark.currentStep?.targetId, coachmark.isActive, viewMode]);

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
          return;
        }

        await pinOfficialCourse(id);
        persistCheckpointIfNeeded("activate_required");
        void coachmark.advanceByEvent("pin_course");
      } catch (error) {
        console.error(
          `[CoursePin] Failed to toggle official pack ${id} `,
          error
        );
      }
    },
    [
      coachmark,
      pinOfficialCourse,
      pinnedOfficialCourseIds,
      persistCheckpointIfNeeded,
      unpinOfficialCourse,
    ]
  );

  const renderOfficialPackCard = useCallback(
    (pack: OfficialCourseListItem) => {
      const isPinned = pinnedOfficialCourseIds.includes(pack.id);
      const flagLang = pack.smallFlag ?? pack.sourceLang;
      const isFirstVisible = pack.id === firstVisiblePackId;

      const card = (
        <CourseListCard
          key={`official-${pack.id}`}
          title={pack.name}
          subtitle={`fiszki: ${pack.cardsCount}`}
          iconId={pack.iconId}
          iconColor={pack.iconColor}
          flagCode={flagLang}
          onPress={() => void handleOfficialPinToggle(pack.id)}
          rightAccessory={
            isFirstVisible ? (
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
                <CoachmarkAnchor
                  id="course-pin-first-pin-button"
                  shape="rect"
                  radius={14}
                  padding={1}
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
                </CoachmarkAnchor>
              </Pressable>
            ) : (
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
            )
          }
        />
      );

      if (isFirstVisible) {
        return (
          <CoachmarkAnchor
            key={`anchor-official-${pack.id}`}
            id="course-pin-first-card"
            shape="rect"
            radius={20}
            padding={2}
            scrollRef={scrollRef}
            style={{ alignSelf: "stretch" }}
          >
            {card}
          </CoachmarkAnchor>
        );
      }

      return card;
    },
    [
      colors.headline,
      firstVisiblePackId,
      handleOfficialPinToggle,
      pinnedOfficialCourseIds,
      styles,
    ]
  );

  return (
    <View
      style={styles.container}
      onLayout={() => {
        if (!coachmarkTargetsReady) {
          setCoachmarkTargetsReady(true);
        }
      }}
    >
      <CoachmarkAnchor
        id="course-pin-bubble-anchor"
        shape="rect"
        radius={12}
        style={{ position: "absolute", top: 1, left: 1, width: 1, height: 1 }}
      />
      <ScrollView
        ref={scrollRef}
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!coachmark.currentStep?.scrollLocked}
      >
        <View style={styles.minicontainer}>
          <Text style={styles.title}>Czego sie uczymy?</Text>
          <View style={styles.viewModeTabsSection}>
            <CoachmarkAnchor
              id="course-pin-tab-switcher"
              shape="rect"
              radius={18}
              padding={2}
              style={styles.viewModeTabsAnchor}
            >
              <View
                ref={tabSwitcherRef}
                style={styles.viewModeTabsAnchor}
              >
                <SegmentedTabs
                  options={[
                    { key: "languages", label: "Języki" },
                    { key: "general", label: "Wiedza" },
                  ]}
                  value={viewMode}
                  onChange={setViewMode}
                  accessibilityLabel="Filtr typu kursów"
                  containerStyle={styles.viewModeTabs}
                />
              </View>
            </CoachmarkAnchor>
          </View>

          {viewMode === "languages" ? (
            <>
              {languageCourses.length === 0 ? (
                <Text style={styles.emptyStateText}>Brak kursów językowych</Text>
              ) : null}
              {languageCourses.map((group) => {
                const regularOfficialPacks = group.officialPacks.filter(
                  (pack) => pack.isMini === false
                );
                const miniOfficialPacks = group.officialPacks.filter(
                  (pack) => pack.isMini !== false
                );
                const showRegular = regularOfficialPacks.length > 0;
                const showMini = miniOfficialPacks.length > 0;
                const hasOfficial =
                  showRegular || showMini;
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

                    {showRegular ? (
                      <>
                        <Text style={styles.subTitle}>Kursy</Text>
                        <View style={styles.cardsList}>
                          {regularOfficialPacks.map(renderOfficialPackCard)}
                        </View>
                      </>
                    ) : null}

                    {showMini ? (
                      <>
                        {showRegular ? (
                          <Text style={styles.subTitle}>Mini kursy</Text>
                        ) : null}
                        <View style={styles.cardsList}>
                          {miniOfficialPacks.map(renderOfficialPackCard)}
                        </View>
                      </>
                    ) : null}
                  </View>
                );
              })}
            </>
          ) : (
            <>
              {accordionGroups.length === 0 ? (
                <Text style={styles.emptyStateText}>
                  Brak kursów wiedzy ogólnej
                </Text>
              ) : null}
              <CoursePinAccordion
                groups={accordionGroups}
                renderCourseCard={renderOfficialPackCard}
              />
            </>
          )}

          <Text style={styles.footerNote}>kiedys bedzie tu ich wiecej :)</Text>
        </View>
      </ScrollView>

      {introActive ? (
        <View style={styles.buttonscontainer}>
          <View style={styles.buttonsRow}>
            <CoachmarkAnchor
              id="course-pin-next-button"
              shape="rect"
              radius={18}
              padding={2}
              style={{ alignSelf: "flex-end" }}
            >
              <MyButton
                text="Dalej"
                accessibilityLabel="Przejdź dalej do aktywacji"
                disabled={!hasAnyPinned}
                onPress={() => {
                  if (coachmark.isActive) {
                    void coachmark.advanceByEvent("press_next").then((allowed) => {
                      if (!allowed) return;
                      setCheckpoint("activate_required");
                      void setOnboardingCheckpoint("activate_required");
                      router.replace("/coursepanel");
                    });
                    return;
                  }
                  setCheckpoint("activate_required");
                  void setOnboardingCheckpoint("activate_required");
                  router.replace("/coursepanel");
                }}
                color="my_green"
                width={90}
              />
            </CoachmarkAnchor>
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
              text="zrób własny"
              color="my_green"
              onPress={() => router.push("/custom_course")}
              disabled={false}
              width={140}
            />
          </View>
        </View>
      )}
    </View>
  );
}
