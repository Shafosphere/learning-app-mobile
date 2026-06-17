import MyButton from "@/src/components/button/button";
import { useSettings } from "@/src/contexts/SettingsContext";
import CustomCourseEditor from "@/src/components/courseEditor/CustomCourseEditor";
import { CourseSettingsPanel } from "@/src/components/courseEditor/CourseSettingsPanel";
import { CourseNameField } from "@/src/components/courseEditor/nameEdit/nameEdit";
import { useCourseEditStyles } from "@/src/screens/courses/editcourse/CourseEditScreen/CourseEditScreen-styles";
import {
  getCustomCourseBySlug,
  resetCustomReviewsForCourse,
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
import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
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
    courses,
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
    getBuiltinCourseCardSize,
    setBuiltinCourseCardSize,
    getBuiltinCourseImageSize,
    setBuiltinCourseImageSize,
    getBuiltinCourseImageFrameEnabled,
    setBuiltinCourseImageFrameEnabled,
    getBuiltinCourseTrueFalseButtonsVariant,
    setBuiltinCourseTrueFalseButtonsVariant,
  } = useSettings();

  const normalizedSource = sourceLang ? sourceLang.toLowerCase() : null;
  const normalizedTarget = targetLang ? targetLang.toLowerCase() : null;
  const normalizedLevel = level ? (level.toUpperCase() as CEFRLevel) : null;

  const [boxZeroEnabled, setBoxZeroEnabled] = useState(() =>
    getBuiltinCourseBoxZeroEnabled({
      sourceLang: normalizedSource,
      targetLang: normalizedTarget,
      level: normalizedLevel,
    })
  );
  const [autoflowEnabled, setAutoflowEnabled] = useState(() =>
    getBuiltinCourseAutoflowEnabled({
      sourceLang: normalizedSource,
      targetLang: normalizedTarget,
      level: normalizedLevel,
    })
  );
  const [skipCorrectionEnabled, setSkipCorrectionEnabled] = useState(() =>
    getBuiltinCourseSkipCorrectionEnabled({
      sourceLang: normalizedSource,
      targetLang: normalizedTarget,
      level: normalizedLevel,
    })
  );
  const [showExplanationEnabled, setShowExplanationEnabled] = useState(() =>
    getBuiltinCourseShowExplanationEnabled({
      sourceLang: normalizedSource,
      targetLang: normalizedTarget,
      level: normalizedLevel,
    })
  );
  const [explanationOnlyOnWrong, setExplanationOnlyOnWrong] = useState(() =>
    getBuiltinCourseExplanationOnlyOnWrong({
      sourceLang: normalizedSource,
      targetLang: normalizedTarget,
      level: normalizedLevel,
    })
  );
  const [cardSize, setCardSize] = useState<FlashcardsCardSize>(() =>
    getBuiltinCourseCardSize({
      sourceLang: normalizedSource,
      targetLang: normalizedTarget,
      level: normalizedLevel,
    })
  );
  const [imageSize, setImageSize] = useState<FlashcardsImageSize>(() =>
    getBuiltinCourseImageSize({
      sourceLang: normalizedSource,
      targetLang: normalizedTarget,
      level: normalizedLevel,
    })
  );
  const [imageFrameEnabled, setImageFrameEnabled] = useState<boolean>(() =>
    getBuiltinCourseImageFrameEnabled({
      sourceLang: normalizedSource,
      targetLang: normalizedTarget,
      level: normalizedLevel,
    })
  );
  const [trueFalseButtonsVariant, setTrueFalseButtonsVariant] =
    useState<TrueFalseButtonsVariant>(() =>
      getBuiltinCourseTrueFalseButtonsVariant({
        sourceLang: normalizedSource,
        targetLang: normalizedTarget,
        level: normalizedLevel,
      })
    );
  const [reviewsEnabled, setReviewsEnabled] = useState(true);
  const [resettingBoxes, setResettingBoxes] = useState(false);
  const [resettingReviews, setResettingReviews] = useState(false);
  const [resettingAll, setResettingAll] = useState(false);

  const getMatchingCourse = () =>
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
    });

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

  const handleBoxZeroToggle = async (value: boolean) => {
    setBoxZeroEnabled(value);
    await setBuiltinCourseBoxZeroEnabled(
      {
        sourceLang: normalizedSource,
        targetLang: normalizedTarget,
        level: normalizedLevel,
      },
      value
    );
  };

  const handleAutoflowToggle = async (value: boolean) => {
    setAutoflowEnabled(value);
    await setBuiltinCourseAutoflowEnabled(
      {
        sourceLang: normalizedSource,
        targetLang: normalizedTarget,
        level: normalizedLevel,
      },
      value
    );
  };

  const handleSkipCorrectionToggle = async (value: boolean) => {
    setSkipCorrectionEnabled(value);
    await setBuiltinCourseSkipCorrectionEnabled(
      {
        sourceLang: normalizedSource,
        targetLang: normalizedTarget,
        level: normalizedLevel,
      },
      value
    );
  };

  const handleShowExplanationToggle = async (value: boolean) => {
    setShowExplanationEnabled(value);
    await setBuiltinCourseShowExplanationEnabled(
      {
        sourceLang: normalizedSource,
        targetLang: normalizedTarget,
        level: normalizedLevel,
      },
      value
    );
  };

  const handleExplanationOnlyOnWrongToggle = async (value: boolean) => {
    setExplanationOnlyOnWrong(value);
    await setBuiltinCourseExplanationOnlyOnWrong(
      {
        sourceLang: normalizedSource,
        targetLang: normalizedTarget,
        level: normalizedLevel,
      },
      value
    );
  };

  const handleCardSizeChange = async (value: FlashcardsCardSize) => {
    setCardSize(value);
    await setBuiltinCourseCardSize(
      {
        sourceLang: normalizedSource,
        targetLang: normalizedTarget,
        level: normalizedLevel,
      },
      value
    );
  };

  const handleImageSizeChange = async (value: FlashcardsImageSize) => {
    setImageSize(value);
    await setBuiltinCourseImageSize(
      {
        sourceLang: normalizedSource,
        targetLang: normalizedTarget,
        level: normalizedLevel,
      },
      value
    );
  };

  const handleTrueFalseButtonsVariantChange = async (
    value: TrueFalseButtonsVariant
  ) => {
    setTrueFalseButtonsVariant(value);
    await setBuiltinCourseTrueFalseButtonsVariant(
      {
        sourceLang: normalizedSource,
        targetLang: normalizedTarget,
        level: normalizedLevel,
      },
      value
    );
  };

  const handleImageFrameToggle = async (value: boolean) => {
    setImageFrameEnabled(value);
    await setBuiltinCourseImageFrameEnabled(
      {
        sourceLang: normalizedSource,
        targetLang: normalizedTarget,
        level: normalizedLevel,
      },
      value
    );
  };

  const performResetBoxes = async () => {
    setResettingBoxes(true);
    const scope = await resolveBuiltinReviewResetScope();

    if (!scope) {
      setResettingBoxes(false);
      Alert.alert(
        t("screens.courses.editcourse.courseEdit.courseEdit.alert.brakDanychKursu"),
        t(
          "screens.courses.editcourse.courseEdit.courseEdit.alert.nieUdaloSieOdnalezcLokalnych"
        )
      );
      return;
    }

    try {
      await clearPersistedBoxesKeepProgress(scope.boxesStorageKey);
      Alert.alert(
        t("components.courseEditor.customEditor.alerts.resetBoxesDoneTitle"),
        t("components.courseEditor.customEditor.alerts.resetBoxesDoneMessage")
      );
    } catch {
      Alert.alert(
        t("components.courseEditor.customEditor.alerts.error"),
        t("components.courseEditor.customEditor.alerts.resetBoxesFailed")
      );
    } finally {
      setResettingBoxes(false);
    }
  };

  const handleResetBoxes = () => {
    Alert.alert(
      t("components.courseEditor.customEditor.alerts.resetBoxesConfirmTitle"),
      t("components.courseEditor.customEditor.alerts.resetBoxesConfirmMessage"),
      [
        {
          text: t("components.courseEditor.customEditor.alerts.cancel"),
          style: "cancel",
        },
        {
          text: t("components.courseEditor.customEditor.alerts.resetBoxesAction"),
          style: "destructive",
          onPress: performResetBoxes,
        },
      ]
    );
  };

  const performResetReviews = async () => {
    setResettingReviews(true);
    const scope = await resolveBuiltinReviewResetScope();

    if (!scope) {
      setResettingReviews(false);
      Alert.alert(
        t("screens.courses.editcourse.courseEdit.courseEdit.alert.brakDanychKursu"),
        t(
          "screens.courses.editcourse.courseEdit.courseEdit.alert.nieUdaloSieOdnalezcLokalnych"
        )
      );
      return;
    }

    try {
      const deleted = await resetCustomReviewsForCourse(scope.courseId);
      Alert.alert(
        t("components.courseEditor.customEditor.alerts.resetReviewsDoneTitle"),
        deleted > 0
          ? t(
              "screens.courses.editcourse.courseEdit.courseEdit.alert.usunietoValueZapisanychPowtorekTego",
              { value: deleted }
            )
          : t("components.courseEditor.customEditor.alerts.resetReviewsDoneEmpty")
      );
    } catch {
      Alert.alert(
        t("components.courseEditor.customEditor.alerts.error"),
        t("components.courseEditor.customEditor.alerts.resetReviewsFailed")
      );
    } finally {
      setResettingReviews(false);
    }
  };

  const handleResetReviews = () => {
    Alert.alert(
      t("components.courseEditor.customEditor.alerts.resetReviewsConfirmTitle"),
      t("components.courseEditor.customEditor.alerts.resetReviewsConfirmMessage"),
      [
        {
          text: t("components.courseEditor.customEditor.alerts.cancel"),
          style: "cancel",
        },
        {
          text: t("components.courseEditor.customEditor.alerts.resetReviewsAction"),
          style: "destructive",
          onPress: performResetReviews,
        },
      ]
    );
  };

  const performResetAll = async () => {
    setResettingAll(true);
    const scope = await resolveBuiltinReviewResetScope();

    if (!scope) {
      setResettingAll(false);
      Alert.alert(
        t("screens.courses.editcourse.courseEdit.courseEdit.alert.brakDanychKursu"),
        t(
          "screens.courses.editcourse.courseEdit.courseEdit.alert.nieUdaloSieOdnalezcLokalnych"
        )
      );
      return;
    }

    try {
      await AsyncStorage.removeItem(scope.boxesStorageKey);
      await resetCustomReviewsForCourse(scope.courseId);
      Alert.alert(
        t("components.courseEditor.customEditor.alerts.resetAllDoneTitle"),
        t("components.courseEditor.customEditor.alerts.resetAllDoneMessage")
      );
    } catch {
      Alert.alert(
        t("components.courseEditor.customEditor.alerts.error"),
        t("components.courseEditor.customEditor.alerts.resetAllFailed")
      );
    } finally {
      setResettingAll(false);
    }
  };

  const handleResetAll = () => {
    Alert.alert(
      t("components.courseEditor.customEditor.alerts.resetAllConfirmTitle"),
      t("components.courseEditor.customEditor.alerts.resetAllConfirmMessage"),
      [
        {
          text: t("components.courseEditor.customEditor.alerts.cancel"),
          style: "cancel",
        },
        {
          text: t("components.courseEditor.customEditor.alerts.resetAllAction"),
          style: "destructive",
          onPress: performResetAll,
        },
      ]
    );
  };

  const matchingCourse = getMatchingCourse();
  const courseSlug = (matchingCourse as { slug?: string } | undefined)?.slug ?? null;
  const matchingManifest = OFFICIAL_PACKS.find(
    (pack) =>
      (courseSlug && pack.slug === courseSlug) || pack.name === courseName
  );
  const imageSizeOptions: FlashcardsImageSize[] = [
    "dynamic",
    "small",
    "medium",
    "large",
    "very_large",
  ];
  const courseHasImages = Boolean(matchingManifest?.imageMap);
  const imageSizeEnabled = cardSize === "large" && courseHasImages;

  return (
    <View style={styles.container}>
      <ScrollView
        style={[
          styles.scrollView,
          useCenteredTabletLayout && styles.scrollViewTablet,
        ]}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
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
            styles={styles}
            settingsProps={{
              styles,
              switchColors: {
                thumb: colors.background,
                trackFalse: colors.border,
                trackTrue: colors.my_green,
              },
              colors,
              boxZeroEnabled,
              onToggleBoxZero: handleBoxZeroToggle,
              autoflowEnabled,
              onToggleAutoflow: handleAutoflowToggle,
              reviewsEnabled,
              onToggleReviews: setReviewsEnabled,
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
            }}
            resetActions={[
              {
                key: "boxes",
                title: t("components.courseEditor.customEditor.resetActions.boxes.title"),
                subtitle: t(
                  "components.courseEditor.customEditor.resetActions.boxes.subtitle"
                ),
                ctaText: t("components.courseEditor.customEditor.alerts.resetBoxesAction"),
                loadingText: t(
                  "components.courseEditor.customEditor.resetActions.boxes.loading"
                ),
                loading: resettingBoxes,
                onPress: handleResetBoxes,
                disabled: resettingBoxes,
              },
              {
                key: "reviews",
                title: t("components.courseEditor.customEditor.resetActions.reviews.title"),
                subtitle: t(
                  "components.courseEditor.customEditor.resetActions.reviews.subtitle"
                ),
                ctaText: t("components.courseEditor.customEditor.alerts.resetReviewsAction"),
                loadingText: t(
                  "components.courseEditor.customEditor.resetActions.reviews.loading"
                ),
                loading: resettingReviews,
                onPress: handleResetReviews,
                disabled: resettingReviews,
              },
              {
                key: "all",
                title: t("components.courseEditor.customEditor.resetActions.all.title"),
                subtitle: t(
                  "components.courseEditor.customEditor.resetActions.all.subtitle"
                ),
                ctaText: t("components.courseEditor.customEditor.alerts.resetAllAction"),
                loadingText: t(
                  "components.courseEditor.customEditor.resetActions.all.loading"
                ),
                loading: resettingAll,
                onPress: handleResetAll,
                disabled: resettingAll,
              },
            ]}
          />
        </View>
      </ScrollView>

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
