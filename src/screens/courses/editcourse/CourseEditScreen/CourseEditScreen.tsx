import type { CourseSettingsSectionProps } from "@/src/components/courseEditor/SettingsCourse";
import type { CourseSettingsTabKey } from "@/src/components/courseEditor/courseSettings/useCourseSettingsTabs";
import { SettingsTabPager } from "@/src/components/settings/SettingsTabPager";
import { useCourseResetActions } from "@/src/components/courseEditor/courseSettings/useCourseResetActions";
import { resolveCourseSettingsDefaults } from "@/src/contexts/settings/courseSettingsDefaults";
import { SettingsTabBar } from "@/src/components/settings/SettingsTabBar";
import { useCourseSettingsTabs } from "@/src/components/courseEditor/courseSettings/useCourseSettingsTabs";
import MyButton from "@/src/components/button/button";
import { usePopup } from "@/src/contexts/PopupContext";
import { useSettings } from "@/src/contexts/SettingsContext";
import CustomCourseEditor from "@/src/components/courseEditor/CustomCourseEditor";
import { CourseSettingsPanel } from "@/src/components/courseEditor/CourseSettingsPanel";
import { CourseNameField } from "@/src/components/courseEditor/nameEdit/nameEdit";
import { useCourseEditStyles } from "@/src/screens/courses/editcourse/CourseEditScreen/CourseEditScreen-styles";
import {
  getCustomCourseBySlug,
  resetCustomReviewsForCourse,
  setCustomCourseReviewsEnabled,
} from "@/src/db/sqlite/db";
import type { CEFRLevel } from "@/src/types/language";
import type {
  FlashcardsCardSize,
  FlashcardsImageSize,
  TrueFalseButtonsVariant,
} from "@/src/contexts/SettingsContext";
import { useDeviceLayout } from "@/src/hooks/useDeviceLayout";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  clearPersistedBoxesKeepProgress,
  makeScopeId,
} from "@/src/hooks/useBoxesPersistenceSnapshot";
import { OFFICIAL_PACKS } from "@/src/constants/officialPacks";

type CourseEditParams = {
  id?: string | string[];
  name?: string | string[];
  lockAppearance?: string | string[];
  sourceLang?: string | string[];
  targetLang?: string | string[];
  level?: string | string[];
};

function getFirstParamValue(
  value: string | string[] | undefined
): string | null {
  if (Array.isArray(value)) {
    return value.length > 0 ? value[0] ?? null : null;
  }
  return value ?? null;
}

function decodeParam(value: string | string[] | undefined): string {
  const first = getFirstParamValue(value);
  if (!first) {
    return "";
  }
  try {
    return decodeURIComponent(first);
  } catch {
    return first;
  }
}

function parseBooleanParam(value: string | string[] | undefined): boolean {
  const raw = getFirstParamValue(value);
  if (!raw) return false;
  const normalized = raw.toString().toLowerCase().trim();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function parseCourseId(value: string | string[] | undefined): number | null {
  const raw = getFirstParamValue(value);
  if (!raw) {
    return null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

type BuiltinProps = {
  courseName: string;
  sourceLang: string | null;
  targetLang: string | null;
  level: string | null;
};

type BuiltinReviewResetScope = {
  courseId: number;
  boxesStorageKey: string;
};

export default function CourseEditScreen() {
  const params = useLocalSearchParams<CourseEditParams>();

  const courseId = parseCourseId(params.id);

  if (courseId != null) {
    const initialName = decodeParam(params.name);
    const lockAppearance = parseBooleanParam(params.lockAppearance);
    return (
      <CustomCourseEditor
        courseId={courseId}
        initialName={initialName}
        lockAppearance={lockAppearance}
      />
    );
  }

  const targetLang = decodeParam(params.targetLang);
  const sourceLang = decodeParam(params.sourceLang);
  const level = decodeParam(params.level);
  const courseName = decodeParam(params.name) || "Kurs językowy";

  if (!targetLang && !sourceLang) {
    return <MissingCourseFallback />;
  }

  return (
    <BuiltinCourseEditor
      courseName={courseName}
      sourceLang={sourceLang || null}
      targetLang={targetLang || null}
      level={level || null}
    />
  );
}

function BuiltinCourseEditor({
  courseName,
  sourceLang,
  targetLang,
  level,
}: BuiltinProps) {
  const styles = useCourseEditStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const { isTabletLayout } = useDeviceLayout();
  const useCenteredTabletLayout = isTabletLayout;
  const {
    colors,
    getBuiltinCourseAudioSettings,
    setBuiltinCourseAudioSettings,
    courseAudioSettingsHydrated,
    courseSettingsResetHydrated,
    resetBuiltinCourseSettings,
    courses,
    getBuiltinCourseBoxZeroAnswerSide,
    setBuiltinCourseBoxZeroAnswerSide,
    getBuiltinCourseBoxZeroEnabled,
    setBuiltinCourseBoxZeroEnabled,
    getBuiltinCourseAutoflowEnabled,
    setBuiltinCourseAutoflowEnabled,
    getBuiltinCourseShowExplanationEnabled,
    setBuiltinCourseShowExplanationEnabled,
    getBuiltinCourseExplanationOnlyOnWrong,
    setBuiltinCourseExplanationOnlyOnWrong,
    getBuiltinCourseSkipCorrectionEnabled,
    setBuiltinCourseSkipCorrectionEnabled,
    getBuiltinCourseFrontImageRole,
    setBuiltinCourseFrontImageRole,
    courseFrontImageRoleHydrated,
    getBuiltinCourseLetterHintSettings,
    setBuiltinCourseLetterHintSettings,
    letterHintSettingsHydrated,
    getBuiltinCourseCardSize,
    setBuiltinCourseCardSize,
    getBuiltinCourseImageSize,
    setBuiltinCourseImageSize,
    getBuiltinCourseImageFrameEnabled,
    setBuiltinCourseImageFrameEnabled,
    getBuiltinCourseTrueFalseButtonsVariant,
    setBuiltinCourseTrueFalseButtonsVariant,
  } = useSettings();

  const setPopup = usePopup();

  const normalizedSource = sourceLang ? sourceLang.toLowerCase() : null;
  const normalizedTarget = targetLang ? targetLang.toLowerCase() : null;
  const normalizedLevel = level ? (level.toUpperCase() as CEFRLevel) : null;

  const courseParams = {
    sourceLang: normalizedSource,
    targetLang: normalizedTarget,
    level: normalizedLevel,
  };
  const boxZeroAnswerSide = getBuiltinCourseBoxZeroAnswerSide(courseParams);
  const boxZeroEnabled = getBuiltinCourseBoxZeroEnabled(courseParams);
  const autoflowEnabled = getBuiltinCourseAutoflowEnabled(courseParams);
  const skipCorrectionEnabled = getBuiltinCourseSkipCorrectionEnabled(courseParams);
  const showExplanationEnabled = getBuiltinCourseShowExplanationEnabled(courseParams);
  const explanationOnlyOnWrong = getBuiltinCourseExplanationOnlyOnWrong(courseParams);
  const cardSize = getBuiltinCourseCardSize(courseParams);
  const imageSize = getBuiltinCourseImageSize(courseParams);
  const imageFrameEnabled = getBuiltinCourseImageFrameEnabled(courseParams);
  const trueFalseButtonsVariant = getBuiltinCourseTrueFalseButtonsVariant(courseParams);
  const [reviewsEnabled, setReviewsEnabled] = useState(true);

  const getMatchingCourse = useCallback(
    () =>
      courses.find((course) => {
        const sameSource = normalizedSource
          ? course.sourceLang?.toLowerCase() === normalizedSource
          : true;
        const sameTarget = normalizedTarget
          ? course.targetLang?.toLowerCase() === normalizedTarget
          : true;
        const sameLevel =
          normalizedLevel != null ? course.level === normalizedLevel : true;
        return sameSource && sameTarget && sameLevel;
      }),
    [courses, normalizedLevel, normalizedSource, normalizedTarget],
  );

  useEffect(() => {
    const matchingCourse = getMatchingCourse();
    const slug =
      (matchingCourse as { slug?: string | null } | undefined)?.slug ??
      OFFICIAL_PACKS.find((pack) => pack.name === courseName)?.slug ??
      null;
    if (!slug) return;

    void getCustomCourseBySlug(slug).then((course) => {
      if (course) setReviewsEnabled(course.reviewsEnabled);
    });
  }, [courseName, getMatchingCourse]);

  const handleReviewsToggle = useCallback((value: boolean) => {
    setReviewsEnabled(value);
    const matchingCourse = getMatchingCourse();
    const slug =
      (matchingCourse as { slug?: string | null } | undefined)?.slug ??
      OFFICIAL_PACKS.find((pack) => pack.name === courseName)?.slug ??
      null;
    if (!slug) return;

    void getCustomCourseBySlug(slug).then((course) => {
      if (course) {
        void setCustomCourseReviewsEnabled(course.id, value);
      }
    });
  }, [courseName, getMatchingCourse]);

  const getBuiltinReviewResetScope = (): BuiltinReviewResetScope | null => {
    const matchingCourse = getMatchingCourse();
    const courseSlug =
      (matchingCourse as { slug?: string | null } | undefined)?.slug ?? null;
    const matchingManifest = OFFICIAL_PACKS.find(
      (pack) => (courseSlug && pack.slug === courseSlug) || pack.name === courseName
    );
    const effectiveSlug = courseSlug ?? matchingManifest?.slug ?? null;

    if (!effectiveSlug) {
      return null;
    }
    return {
      courseId: -1,
      boxesStorageKey: effectiveSlug,
    };
  };

  const resolveBuiltinReviewResetScope =
    async (): Promise<BuiltinReviewResetScope | null> => {
      const provisionalScope = getBuiltinReviewResetScope();
      if (!provisionalScope) {
        return null;
      }

      const courseRow = await getCustomCourseBySlug(provisionalScope.boxesStorageKey);
      if (!courseRow?.id) {
        return null;
      }

      return {
        courseId: courseRow.id,
        boxesStorageKey: `customBoxes:${makeScopeId(
          courseRow.id,
          courseRow.id,
          `custom-${courseRow.id}`
        )}`,
      };
    };

  const persistCourseSetting = useCallback(async (save: () => Promise<void>) => {
    try {
      await save();
    } catch (error) {
      console.error("Failed to save course setting", error);
      setPopup({
        message: t("courseCreator.customEditor.popups.saveFailed"),
        color: "angry",
        duration: 4000,
      });
    }
  }, [setPopup, t]);

  const handleBoxZeroToggle = useCallback(async (value: boolean) => {
    await persistCourseSetting(() => setBuiltinCourseBoxZeroEnabled(
      {
        sourceLang: normalizedSource,
        targetLang: normalizedTarget,
        level: normalizedLevel,
      },
      value
    ));
  }, [normalizedLevel, normalizedSource, normalizedTarget, setBuiltinCourseBoxZeroEnabled, persistCourseSetting]);

  const handleAutoflowToggle = useCallback(async (value: boolean) => {
    await persistCourseSetting(() => setBuiltinCourseAutoflowEnabled(
      {
        sourceLang: normalizedSource,
        targetLang: normalizedTarget,
        level: normalizedLevel,
      },
      value
    ));
  }, [normalizedLevel, normalizedSource, normalizedTarget, setBuiltinCourseAutoflowEnabled, persistCourseSetting]);

  const handleSkipCorrectionToggle = useCallback(async (value: boolean) => {
    await persistCourseSetting(() => setBuiltinCourseSkipCorrectionEnabled(
      {
        sourceLang: normalizedSource,
        targetLang: normalizedTarget,
        level: normalizedLevel,
      },
      value
    ));
  }, [normalizedLevel, normalizedSource, normalizedTarget, setBuiltinCourseSkipCorrectionEnabled, persistCourseSetting]);

  const handleShowExplanationToggle = useCallback(async (value: boolean) => {
    await persistCourseSetting(() => setBuiltinCourseShowExplanationEnabled(
      {
        sourceLang: normalizedSource,
        targetLang: normalizedTarget,
        level: normalizedLevel,
      },
      value
    ));
  }, [normalizedLevel, normalizedSource, normalizedTarget, setBuiltinCourseShowExplanationEnabled, persistCourseSetting]);

  const handleExplanationOnlyOnWrongToggle = useCallback(async (value: boolean) => {
    await persistCourseSetting(() => setBuiltinCourseExplanationOnlyOnWrong(
      {
        sourceLang: normalizedSource,
        targetLang: normalizedTarget,
        level: normalizedLevel,
      },
      value
    ));
  }, [normalizedLevel, normalizedSource, normalizedTarget, setBuiltinCourseExplanationOnlyOnWrong, persistCourseSetting]);

  const handleCardSizeChange = useCallback(async (value: FlashcardsCardSize) => {
    await persistCourseSetting(() => setBuiltinCourseCardSize(
      {
        sourceLang: normalizedSource,
        targetLang: normalizedTarget,
        level: normalizedLevel,
      },
      value
    ));
  }, [normalizedLevel, normalizedSource, normalizedTarget, setBuiltinCourseCardSize, persistCourseSetting]);

  const handleImageSizeChange = useCallback(async (value: FlashcardsImageSize) => {
    await persistCourseSetting(() => setBuiltinCourseImageSize(
      {
        sourceLang: normalizedSource,
        targetLang: normalizedTarget,
        level: normalizedLevel,
      },
      value
    ));
  }, [normalizedLevel, normalizedSource, normalizedTarget, setBuiltinCourseImageSize, persistCourseSetting]);

  const handleTrueFalseButtonsVariantChange = useCallback(async (
    value: TrueFalseButtonsVariant
  ) => {
    await persistCourseSetting(() => setBuiltinCourseTrueFalseButtonsVariant(
      {
        sourceLang: normalizedSource,
        targetLang: normalizedTarget,
        level: normalizedLevel,
      },
      value
    ));
  }, [normalizedLevel, normalizedSource, normalizedTarget, setBuiltinCourseTrueFalseButtonsVariant, persistCourseSetting]);

  const handleImageFrameToggle = useCallback(async (value: boolean) => {
    await persistCourseSetting(() => setBuiltinCourseImageFrameEnabled(
      {
        sourceLang: normalizedSource,
        targetLang: normalizedTarget,
        level: normalizedLevel,
      },
      value
    ));
  }, [normalizedLevel, normalizedSource, normalizedTarget, setBuiltinCourseImageFrameEnabled, persistCourseSetting]);

  const matchingCourse = getMatchingCourse();
  const courseSlug = (matchingCourse as { slug?: string } | undefined)?.slug ?? null;
  const matchingManifest = OFFICIAL_PACKS.find(
    (pack) =>
      (courseSlug && pack.slug === courseSlug) || pack.name === courseName
  );
  const imageSizeOptions: FlashcardsImageSize[] = useMemo(() => ([
    "dynamic",
    "small",
    "medium",
    "large",
    "very_large",
  ]), []);
  const courseHasImages = Boolean(matchingManifest?.imageMap);
  const categoryTabs = useCourseSettingsTabs({
    scopeKey: `${normalizedSource}|${normalizedTarget}|${normalizedLevel}|${courseName}`,
    hasAudio: true,
    hasResetActions: true,
  });
  const resetControls = useCourseResetActions({
    scopeKey: `${normalizedSource}|${normalizedTarget}|${normalizedLevel}|${courseName}`,
    disabled: !courseSettingsResetHydrated,
    onResetSettings: async () => {
      if (!matchingManifest) throw new Error("Official course defaults not found");
      const scope = await resolveBuiltinReviewResetScope();
      if (!scope) throw new Error("Course not found");
      const values = resolveCourseSettingsDefaults(matchingManifest, matchingManifest.defaultType === "true_false" || matchingManifest.defaultType === "self_assess");
      await resetBuiltinCourseSettings({ sourceLang: normalizedSource, targetLang: normalizedTarget, level: normalizedLevel }, values);
      await setCustomCourseReviewsEnabled(scope.courseId, values.reviewsEnabled, { seedCompletedReviews: false });
      setReviewsEnabled(values.reviewsEnabled);
    },
    onResetBoxes: async () => {
      const scope = await resolveBuiltinReviewResetScope();
      if (!scope) throw new Error("Course not found");
      await clearPersistedBoxesKeepProgress(scope.boxesStorageKey);
    },
    onResetReviews: async () => {
      const scope = await resolveBuiltinReviewResetScope();
      if (!scope) throw new Error("Course not found");
      return resetCustomReviewsForCourse(scope.courseId);
    },
    onResetAll: async () => {
      const scope = await resolveBuiltinReviewResetScope();
      if (!scope) throw new Error("Course not found");
      await AsyncStorage.removeItem(scope.boxesStorageKey);
      await resetCustomReviewsForCourse(scope.courseId);
    },
  });
  const imageSizeEnabled = cardSize === "large" && courseHasImages;

  const settingsScrollProps = useMemo(() => ({
    style: [styles.scrollView, useCenteredTabletLayout && styles.scrollViewTablet],
    contentContainerStyle: styles.scrollContent,
    keyboardShouldPersistTaps: "handled" as const,
  }), [styles.scrollContent, styles.scrollView, styles.scrollViewTablet, useCenteredTabletLayout]);
  const courseSettingsProps = useMemo<CourseSettingsSectionProps>(() => ({
    styles,
    switchColors: {
      thumb: colors.background,
      trackFalse: colors.border,
      trackTrue: colors.my_green,
    },
    colors,
    audioSettings: getBuiltinCourseAudioSettings({ sourceLang: normalizedSource, targetLang: normalizedTarget, level: normalizedLevel }),
    audioSettingsDisabled: !courseAudioSettingsHydrated,
    onChangeAudioSettings: (value) => { void persistCourseSetting(() => setBuiltinCourseAudioSettings({ sourceLang: normalizedSource, targetLang: normalizedTarget, level: normalizedLevel }, value)); },
    frontImageRole: getBuiltinCourseFrontImageRole({ sourceLang: normalizedSource, targetLang: normalizedTarget, level: normalizedLevel }),
    frontImageRoleDisabled: !courseFrontImageRoleHydrated,
    onChangeFrontImageRole: (value) => { void persistCourseSetting(() => setBuiltinCourseFrontImageRole({ sourceLang: normalizedSource, targetLang: normalizedTarget, level: normalizedLevel }, value)); },
    letterHintSettings: getBuiltinCourseLetterHintSettings({ sourceLang: normalizedSource, targetLang: normalizedTarget, level: normalizedLevel }),
    letterHintSettingsDisabled: !letterHintSettingsHydrated,
    onChangeLetterHintSettings: (value) => { void persistCourseSetting(() => setBuiltinCourseLetterHintSettings({ sourceLang: normalizedSource, targetLang: normalizedTarget, level: normalizedLevel }, value)); },
    boxZeroAnswerSide,
    onSelectBoxZeroAnswerSide: async (side) => {
      await persistCourseSetting(() => setBuiltinCourseBoxZeroAnswerSide(
        {
          sourceLang: normalizedSource,
          targetLang: normalizedTarget,
          level: normalizedLevel,
        },
        side
      ));
    },
    boxZeroEnabled,
    onToggleBoxZero: handleBoxZeroToggle,
    autoflowEnabled,
    onToggleAutoflow: handleAutoflowToggle,
    reviewsEnabled,
    onToggleReviews: handleReviewsToggle,
    showExplanationEnabled,
    onToggleShowExplanation: handleShowExplanationToggle,
    explanationOnlyOnWrong,
    onToggleExplanationOnlyOnWrong:
      handleExplanationOnlyOnWrongToggle,
    skipCorrectionEnabled,
    onToggleSkipCorrection: handleSkipCorrectionToggle,
    hideSkipCorrectionOption: false,
    showTrueFalseButtonsVariant: false,
    trueFalseButtonsVariant,
    onSelectTrueFalseButtonsVariant: handleTrueFalseButtonsVariantChange,
    cardSize,
    onSelectCardSize: handleCardSizeChange,
    showImageSizeOptions: courseHasImages,
    imageSize,
    imageSizeOptions,
    onSelectImageSize: handleImageSizeChange,
    imageSizeEnabled,
    showImageFrameOption: courseHasImages,
    imageFrameEnabled,
    onToggleImageFrame: handleImageFrameToggle,
  }), [
    autoflowEnabled,
    boxZeroAnswerSide,
    boxZeroEnabled,
    cardSize,
    colors,
    courseAudioSettingsHydrated,
    courseFrontImageRoleHydrated,
    courseHasImages,
    explanationOnlyOnWrong,
    getBuiltinCourseAudioSettings,
    getBuiltinCourseFrontImageRole,
    getBuiltinCourseLetterHintSettings,
    handleAutoflowToggle,
    handleBoxZeroToggle,
    handleCardSizeChange,
    handleExplanationOnlyOnWrongToggle,
    handleImageFrameToggle,
    handleImageSizeChange,
    handleReviewsToggle,
    handleShowExplanationToggle,
    handleSkipCorrectionToggle,
    handleTrueFalseButtonsVariantChange,
    imageFrameEnabled,
    imageSize,
    imageSizeEnabled,
    imageSizeOptions,
    letterHintSettingsHydrated,
    normalizedLevel,
    normalizedSource,
    normalizedTarget,
    reviewsEnabled,
    persistCourseSetting,
    setBuiltinCourseAudioSettings,
    setBuiltinCourseBoxZeroAnswerSide,
    setBuiltinCourseFrontImageRole,
    setBuiltinCourseLetterHintSettings,
    showExplanationEnabled,
    skipCorrectionEnabled,
    styles,
    trueFalseButtonsVariant,
  ]);
  const renderSettingsPage = useCallback((pageTab: CourseSettingsTabKey) => (
    <>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeader}>
          {t(
            "screens.courses.editcourse.courseEdit.courseEdit.textChild.ustawieniaKursu"
          )}
        </Text>
        {/* {languagePair ? (
          <Text
            style={styles.sectionDescription}
          >{`Para języków: ${languagePair}`}</Text>
        ) : null}
        {level ? (
          <Text style={styles.sectionDescription}>{`Poziom: ${level}`}</Text>
        ) : null} */}
        <CourseNameField
          value={courseName}
          onChange={() => {}}
          editable={false}
          disabled
        />
      </View>

      <View style={styles.sectionCard}>
        <CourseSettingsPanel
          activeTab={pageTab}
          styles={styles}
          settingsProps={courseSettingsProps}
          resetActions={resetControls.resetActions}
        />
      </View>
    </>
  ), [courseName, courseSettingsProps, resetControls.resetActions, styles, t]);

  return (
    <View style={styles.container}>
      <SettingsTabPager
        ref={categoryTabs.pagerRef}
        options={categoryTabs.options}
        value={categoryTabs.activeTab}
        onChange={categoryTabs.onCommit}
        scopeKey={categoryTabs.scopeKey}
        scrollViewProps={settingsScrollProps}
        renderPage={renderSettingsPage}
      />

      <View style={styles.buttonscontainer}>
        <View
          style={[
            styles.buttonsRow,
            useCenteredTabletLayout && styles.buttonsRowTablet,
          ]}
        >
          <MyButton
            color="my_yellow"
            width={60}
            onPress={() => router.back()}
            accessibilityLabel={t(
              "repeats.a11y.backToCoursesPanel"
            )}
          >
            <Ionicons name="arrow-back" size={28} color={colors.headline} />
          </MyButton>
        </View>
      </View>
      <SettingsTabBar
        options={categoryTabs.options}
        value={categoryTabs.activeTab}
        onChange={categoryTabs.onChange}
      />
      {resetControls.modal}
    </View>
  );
}

function MissingCourseFallback() {
  const styles = useCourseEditStyles();
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <View
      style={[
        styles.container,
        { justifyContent: "center", alignItems: "center", padding: 24 },
      ]}
    >
      <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 16 }}>
        {t(
          "screens.courses.editcourse.courseEdit.courseEdit.textChild.nieZnalezionoDanychKursu"
        )}
      </Text>
      <MyButton
        text={t("screens.courses.editcourse.courseEdit.courseEdit.text.wroc")}
        color="my_yellow"
        width={120}
        onPress={() => router.back()}
      />
    </View>
  );
}
