import MyButton from "@/src/components/button/button";
import { CourseListCard } from "@/src/components/course/CourseListCard";
import {
  COURSE_CATEGORIES,
  CourseCategory,
} from "@/src/constants/courseCategories";
import { COURSE_PIN_INTRO_MESSAGES } from "@/src/constants/introMessages";
import { getFlagSource } from "@/src/constants/languageFlags";
import { OFFICIAL_PACKS } from "@/src/constants/officialPacks";
import { useSettings } from "@/src/contexts/SettingsContext";
import { getOfficialCustomCoursesWithCardCounts } from "@/src/db/sqlite/db";
import { useScreenIntro } from "@/src/hooks/useScreenIntro";
import {
  OnboardingCheckpoint,
  setOnboardingCheckpoint
} from "@/src/services/onboardingCheckpoint";
import Ionicons from "@expo/vector-icons/Ionicons";
import Octicons from "@expo/vector-icons/Octicons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Animated,
  Image,
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import {
  AccordionGroupItem,
  CoursePinAccordion,
} from "./components/CoursePinAccordion";
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
  sourceFlag?: ReturnType<typeof getFlagSource>;
  targetFlag?: ReturnType<typeof getFlagSource>;
  officialPacks: OfficialCourseListItem[];
};

type CourseViewMode = "languages" | "general";

export default function CoursePinScreen() {
  const segmentedPad = 4;
  const styles = useStyles();
  const router = useRouter();
  const { colors, pinnedOfficialCourseIds, pinOfficialCourse, unpinOfficialCourse } =
    useSettings();
  const [officialCourses, setOfficialCourses] = useState<
    OfficialCourseListItem[]
  >([]);
  const [viewMode, setViewMode] = useState<CourseViewMode>("languages");
  const [tabsWidth, setTabsWidth] = useState(0);
  const sliderX = useState(() => new Animated.Value(0))[0];
  // Local checkpoint state used for immediate UI updates (buttons)
  const [checkpoint, setCheckpoint] = useState<OnboardingCheckpoint | null>(
    null
  );
  const tabSliderWidth = Math.max(0, (tabsWidth - segmentedPad * 2) / 2);

  const handleTabsLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    setTabsWidth(nextWidth);
  }, []);

  const { IntroOverlay, unlockGate } = useScreenIntro({
    messages: COURSE_PIN_INTRO_MESSAGES,
    storageKey: "@course_pin_intro_seen_v1",
    triggerStrategy: "on_onboarding",
    onCheckpointLoaded: (cp) => {
      setCheckpoint(cp ?? "pin_required");
    },
    floatingOffset: { top: 12, left: 12, right: 12 },
  });

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
          unlockGate("course_pinned");
          persistCheckpointIfNeeded("activate_required");
        }
      } catch (error) {
        console.error(
          `[CoursePin] Failed to toggle official pack ${id} `,
          error
        );
      }
    },
    [pinOfficialCourse, pinnedOfficialCourseIds, persistCheckpointIfNeeded, unpinOfficialCourse, unlockGate]
  );

  const hasAnyPinned = useMemo(() => {
    return pinnedOfficialCourseIds.length > 0;
  }, [pinnedOfficialCourseIds]);

  useEffect(() => {
    if (hasAnyPinned) {
      unlockGate("course_pinned");
    }
  }, [hasAnyPinned, unlockGate]);

  useEffect(() => {
    if (tabSliderWidth <= 0) {
      return;
    }
    const targetX = viewMode === "general" ? tabSliderWidth : 0;
    Animated.timing(sliderX, {
      toValue: targetX,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [sliderX, tabSliderWidth, viewMode]);

  const introActive = checkpoint !== "done";
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
      <IntroOverlay />
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.minicontainer}>
          <Text style={styles.title}>Czego sie uczymy?</Text>
          <View
            style={styles.viewModeTabs}
            accessibilityRole="tablist"
            accessibilityLabel="Filtr typu kursów"
            onLayout={handleTabsLayout}
          >
            <Animated.View
              pointerEvents="none"
              style={[
                styles.viewModeThumb,
                {
                  width: tabSliderWidth,
                  left: segmentedPad,
                  transform: [{ translateX: sliderX }],
                },
              ]}
            />
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: viewMode === "languages" }}
              style={styles.viewModeTab}
              onPress={() => setViewMode("languages")}
            >
              <View style={styles.viewModeTabContent}>
                <View
                  style={[
                    styles.viewModeDot,
                    viewMode === "languages" && styles.viewModeDotActive,
                  ]}
                />
                <Text
                  style={[
                    styles.viewModeTabText,
                    viewMode === "languages" && styles.viewModeTabTextActive,
                  ]}
                >
                  Języki
                </Text>
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: viewMode === "general" }}
              style={styles.viewModeTab}
              onPress={() => setViewMode("general")}
            >
              <View style={styles.viewModeTabContent}>
                <View
                  style={[
                    styles.viewModeDot,
                    viewMode === "general" && styles.viewModeDotActive,
                  ]}
                />
                <Text
                  style={[
                    styles.viewModeTabText,
                    viewMode === "general" && styles.viewModeTabTextActive,
                  ]}
                >
                  Wiedza
                </Text>
              </View>
            </Pressable>
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
            <MyButton
              text="Dalej"
              accessibilityLabel="Przejdź dalej do aktywacji"
              disabled={!hasAnyPinned}
              onPress={() => {
                setCheckpoint("activate_required");
                void setOnboardingCheckpoint("activate_required");
                router.replace("/coursepanel");
              }}
              color="my_green"
              width={90}
            />
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
