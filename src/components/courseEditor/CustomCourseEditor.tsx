import type { CourseSettingsSectionProps } from "@/src/components/courseEditor/SettingsCourse";
import type { CourseSettingsTabKey } from "@/src/components/courseEditor/courseSettings/useCourseSettingsTabs";
import { SettingsTabPager } from "@/src/components/settings/SettingsTabPager";
import { useCourseResetActions } from "./courseSettings/useCourseResetActions";
import { resolveCourseSettingsDefaults } from "@/src/contexts/settings/courseSettingsDefaults";
import { OFFICIAL_PACKS } from "@/src/constants/officialPacks";
import { SettingsTabBar } from "@/src/components/settings/SettingsTabBar";
import { useCourseSettingsTabs } from "@/src/components/courseEditor/courseSettings/useCourseSettingsTabs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import Entypo from "@expo/vector-icons/Entypo";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTranslation } from "react-i18next";

import MyButton from "@/src/components/button/button";
import { SegmentedTabs } from "@/src/components/segmentedTabs/SegmentedTabs";
import { DEFAULT_COURSE_COLOR } from "@/src/constants/customCourse";
import { usePopup } from "@/src/contexts/PopupContext";
import { useSettings } from "@/src/contexts/SettingsContext";
import {
  clearCustomLearningEventsForCourse,
  deleteCustomCourse,
  getCustomCourseById,
  getCustomCourseNameCandidates,
  getCustomFlashcards,
  resetCustomReviewsForCourse,
  setCustomCourseReviewsEnabled,
  saveCustomCourseEdits,
  updateCustomCourse,
} from "@/src/db/sqlite/db";
import type { CustomFlashcardInput } from "@/src/db/sqlite/repositories/flashcards";
import type {
  FlashcardsCardSize,
  FlashcardsImageSize,
  TrueFalseButtonsVariant,
} from "@/src/contexts/SettingsContext";
import {
  clearPersistedBoxesKeepProgress,
  makeScopeId,
} from "@/src/hooks/useBoxesPersistenceSnapshot";
import { useCustomCourseDraft } from "@/src/hooks/useCustomCourseDraft";
import { useDeviceLayout } from "@/src/hooks/useDeviceLayout";
import {
  createEmptyManualCard,
  ensureCardsNormalized,
  normalizeAnswers,
  useManualCardsForm,
  type ManualCardType,
} from "@/src/hooks/useManualCardsForm";
import {
  findCourseNameConflict,
  type CourseNameCandidate,
} from "@/src/utils/customCourseNameConflicts";
import {
  ManualCardsEditor,
  type ManualCardsEditorStyles,
} from "@/src/components/courseEditor/editFlashcards/editFlashcards";
import {
  CardTypeSelector,
  type CardTypeOption,
} from "@/src/components/courseEditor/CardTypeSelector";
import { CourseIconColorSelector } from "@/src/components/courseEditor/iconEdit/iconEdit";
import { CourseSettingsPanel } from "@/src/components/courseEditor/CourseSettingsPanel";
import { clearCourseCompletionRun } from "@/src/features/flashcards/courseCompletionRun";
import { useStyles } from "./CustomCourseEditor-styles";
type CustomCourseEditorProps = {
  courseId: number;
  initialName: string;
  lockAppearance: boolean;
};

type CustomCourseEditTab = "options" | "content";

export default function CustomCourseEditor({
  courseId,
  initialName,
  lockAppearance,
}: CustomCourseEditorProps) {
  const { t } = useTranslation();
  const styles = useStyles();
  const router = useRouter();
  const setPopup = usePopup();
  const { isTabletLayout } = useDeviceLayout();
  const useCenteredTabletLayout = isTabletLayout;
  const {
    activeCustomCourseId,
    setActiveCustomCourseId,
    colors,
    getCustomCourseAudioSettings,
    setCustomCourseAudioSettings,
    courseAudioSettingsHydrated,
    courseSettingsResetHydrated,
    resetCustomCourseSettings,
    getCustomCourseBoxZeroAnswerSide,
    setCustomCourseBoxZeroAnswerSide,
    getCustomCourseBoxZeroEnabled,
    setCustomCourseBoxZeroEnabled,
    getCustomCourseAutoflowEnabled,
    setCustomCourseAutoflowEnabled,
    getCustomCourseShowExplanationEnabled,
    setCustomCourseShowExplanationEnabled,
    getCustomCourseExplanationOnlyOnWrong,
    setCustomCourseExplanationOnlyOnWrong,
    getCustomCourseSkipCorrectionEnabled,
    setCustomCourseSkipCorrectionEnabled,
    getCustomCourseFrontImageRole,
    setCustomCourseFrontImageRole,
    courseFrontImageRoleHydrated,
    getCustomCourseLetterHintSettings,
    setCustomCourseLetterHintSettings,
    letterHintSettingsHydrated,
    getCustomCourseCardSize,
    setCustomCourseCardSize,
    getCustomCourseImageSize,
    setCustomCourseImageSize,
    getCustomCourseImageFrameEnabled,
    setCustomCourseImageFrameEnabled,
    getCustomCourseTrueFalseButtonsVariant,
    setCustomCourseTrueFalseButtonsVariant,
  } = useSettings();

  const {
    courseName,
    setCourseName,
    iconId,
    setIconId,
    iconColor,
    setIconColor,
    colorId,
    setColorId,
    reviewsEnabled,
    setReviewsEnabled,
    handleColorChange,
    hydrateDraft,
  } = useCustomCourseDraft({ initialName });

  const {
    manualCards,
    replaceManualCards,
    handleManualCardFrontChange,
    handleManualCardAnswerChange,
    handleAddAnswer,
    handleRemoveAnswer,
    handleAddCard,
    handleRemoveCard,
    handleToggleFlipped,
    handleManualCardImageChange,
    handleManualCardExplanationChange,
    canUndo,
    undo,
  } = useManualCardsForm({
    initialCards: [createEmptyManualCard("card-0")],
    enableHistory: true,
    historyLimit: 50,
  });
  const [newCardType, setNewCardType] = useState<ManualCardType>("text");

  const initialBoxZeroAnswerSide = useMemo(
    () => getCustomCourseBoxZeroAnswerSide(courseId),
    [courseId, getCustomCourseBoxZeroAnswerSide]
  );
  const [courseBoxZeroAnswerSide, setCourseBoxZeroAnswerSide] = useState(
    initialBoxZeroAnswerSide
  );

  const initialBoxZeroEnabled = useMemo(
    () => getCustomCourseBoxZeroEnabled(courseId),
    [courseId, getCustomCourseBoxZeroEnabled]
  );
  const initialAutoflowEnabled = useMemo(
    () => getCustomCourseAutoflowEnabled(courseId),
    [courseId, getCustomCourseAutoflowEnabled]
  );
  const initialSkipCorrectionEnabled = useMemo(
    () => getCustomCourseSkipCorrectionEnabled(courseId),
    [courseId, getCustomCourseSkipCorrectionEnabled]
  );
  const initialShowExplanationEnabled = useMemo(
    () => getCustomCourseShowExplanationEnabled(courseId),
    [courseId, getCustomCourseShowExplanationEnabled]
  );
  const initialExplanationOnlyOnWrong = useMemo(
    () => getCustomCourseExplanationOnlyOnWrong(courseId),
    [courseId, getCustomCourseExplanationOnlyOnWrong]
  );
  const initialCardSize = useMemo(
    () => getCustomCourseCardSize(courseId),
    [courseId, getCustomCourseCardSize]
  );
  const initialImageSize = useMemo(
    () => getCustomCourseImageSize(courseId),
    [courseId, getCustomCourseImageSize]
  );
  const initialImageFrameEnabled = useMemo(
    () => getCustomCourseImageFrameEnabled(courseId),
    [courseId, getCustomCourseImageFrameEnabled]
  );

  const [courseBoxZeroEnabled, setCourseBoxZeroEnabled] = useState(
    initialBoxZeroEnabled
  );
  const [courseAutoflowEnabled, setCourseAutoflowEnabled] = useState(
    initialAutoflowEnabled
  );
  const [courseSkipCorrectionEnabled, setCourseSkipCorrectionEnabled] = useState(
    initialSkipCorrectionEnabled
  );
  const [courseShowExplanationEnabled, setCourseShowExplanationEnabled] = useState(
    initialShowExplanationEnabled
  );
  const [courseExplanationOnlyOnWrong, setCourseExplanationOnlyOnWrong] = useState(
    initialExplanationOnlyOnWrong
  );
  const [courseCardSize, setCourseCardSize] = useState<FlashcardsCardSize>(
    initialCardSize
  );
  const [courseImageSize, setCourseImageSize] = useState<FlashcardsImageSize>(
    initialImageSize
  );
  const [courseImageFrameEnabled, setCourseImageFrameEnabled] = useState(
    initialImageFrameEnabled
  );
  const [courseTrueFalseButtonsVariant, setCourseTrueFalseButtonsVariant] =
    useState<TrueFalseButtonsVariant>(() =>
      getCustomCourseTrueFalseButtonsVariant(courseId)
    );
  const [activeTab, setActiveTab] = useState<CustomCourseEditTab>("options");
  const [contentDirty, setContentDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [existingCourses, setExistingCourses] = useState<CourseNameCandidate[]>([]);
  const [isOfficialCourse, setIsOfficialCourse] = useState(lockAppearance);
  const customBoxesStorageKey = useMemo(
    () =>
      `customBoxes:${makeScopeId(
        courseId,
        courseId,
        `custom-${courseId}`
      )}`,
    [courseId]
  );

  const newCardTypeOptions: CardTypeOption<ManualCardType>[] = [
    { key: "text", label: t("courseCreator.customEditor.cardTypes.text") },
    { key: "true_false", label: t("repeats.cardTypes.trueFalse") },
    { key: "know_dont_know", label: t("repeats.cardTypes.knowDontKnow") },
  ];

  const courseIsTrueFalseOnly = useMemo(
    () =>
      manualCards.length > 0 &&
      manualCards.every((card) => {
        const type = card.type ?? "text";
        return type === "true_false" || type === "know_dont_know";
      }),
    [manualCards]
  );
  const courseHasImageCards = useMemo(
    () =>
      manualCards.some(
        (card) =>
          Boolean(card.imageFront) ||
          Boolean(card.imageBack)
      ),
    [manualCards]
  );
  const imageSizeOptionsEnabled =
    courseCardSize === "large" && courseHasImageCards;
  const imageSizeOptions: FlashcardsImageSize[] = useMemo(() => ([
    "dynamic",
    "small",
    "medium",
    "large",
    "very_large",
  ]), []);
  const categoryTabs = useCourseSettingsTabs({
    scopeKey: courseId,
    hasAudio: true,
    hasResetActions: true,
  });
  const shouldShowTabSwitcher = !isOfficialCourse;
  const shouldShowManualToolbar =
    !isOfficialCourse && !loading && !loadError && activeTab === "content";
  const nameConflict = useMemo(
    () => findCourseNameConflict(courseName, existingCourses, courseId),
    [courseId, courseName, existingCourses],
  );
  const nameValidationMessage = useMemo(() => {
    if (nameConflict.kind === "duplicate" && nameConflict.matchedCourse) {
      return `Kurs o nazwie „${nameConflict.matchedCourse.name}” już istnieje.`;
    }
    if (nameConflict.kind === "similar" && nameConflict.matchedCourse) {
      return `Podobna nazwa już istnieje: „${nameConflict.matchedCourse.name}”.`;
    }
    return null;
  }, [nameConflict]);

  // Settings overrides can change getter identities. Sync their values separately
  // so updating an option never reloads the content draft or clears undo history.
  const initialTrueFalseButtonsVariant = getCustomCourseTrueFalseButtonsVariant(courseId);
  useEffect(() => {
    setCourseBoxZeroAnswerSide(initialBoxZeroAnswerSide);
    setCourseBoxZeroEnabled(initialBoxZeroEnabled);
    setCourseAutoflowEnabled(initialAutoflowEnabled);
    setCourseSkipCorrectionEnabled(initialSkipCorrectionEnabled);
    setCourseShowExplanationEnabled(initialShowExplanationEnabled);
    setCourseExplanationOnlyOnWrong(initialExplanationOnlyOnWrong);
    setCourseCardSize(initialCardSize);
    setCourseImageSize(initialImageSize);
    setCourseImageFrameEnabled(initialImageFrameEnabled);
    setCourseTrueFalseButtonsVariant(initialTrueFalseButtonsVariant);
  }, [
    courseId,
    initialBoxZeroAnswerSide,
    initialBoxZeroEnabled,
    initialAutoflowEnabled,
    initialSkipCorrectionEnabled,
    initialShowExplanationEnabled,
    initialExplanationOnlyOnWrong,
    initialCardSize,
    initialImageSize,
    initialImageFrameEnabled,
    initialTrueFalseButtonsVariant,
  ]);

  const hydrateFromDb = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [courseRow, nameRows, flashcardRows] = await Promise.all([
        getCustomCourseById(courseId),
        getCustomCourseNameCandidates(),
        getCustomFlashcards(courseId),
      ]);

      if (!courseRow) {
        setLoadError("Kurs nie istnieje.");
        replaceManualCards([createEmptyManualCard("card-0")]);
        setIsOfficialCourse(lockAppearance);
        setLoading(false);
        return;
      }
      setExistingCourses(nameRows);

      hydrateDraft({
        courseName: courseRow.name,
        iconId: courseRow.iconId,
        iconColor: courseRow.iconColor ?? DEFAULT_COURSE_COLOR,
        colorId: courseRow.colorId ?? null,
        reviewsEnabled: courseRow.reviewsEnabled,
      });
      setIsOfficialCourse(courseRow.isOfficial === true);

      const incomingCards = flashcardRows.map((card, index) => {
        const answersSource =
          card.answers && card.answers.length > 0
            ? card.answers
            : [card.backText ?? ""];
        const normalizedAnswersList = normalizeAnswers(answersSource);
        const answers =
          normalizedAnswersList.length > 0 ? normalizedAnswersList : [""];
        return {
          id: `card-${card.id ?? index}`,
          front: card.frontText,
          answers,
          flipped: card.flipped,
          answerOnly: card.answerOnly ?? false,
          type:
            (card.type as "text" | "true_false" | "know_dont_know") ?? "text",
          hintFront: card.hintFront,
          hintBack: card.hintBack,
          imageFront: card.imageFront ?? null,
          imageBack: card.imageBack ?? null,
          explanation: card.explanation ?? null,
        };
      });
      replaceManualCards(ensureCardsNormalized(incomingCards));
    } catch (error) {
      console.error("Failed to load custom course for edit", error);
      setLoadError(t("courseCreator.customEditor.popups.loadFailed"));
      setIsOfficialCourse(lockAppearance);
    } finally {
      setLoading(false);
    }
  }, [
    courseId,
    hydrateDraft,
    lockAppearance,
    replaceManualCards,
    t,
  ]);

  useFocusEffect(
    useCallback(() => {
      void hydrateFromDb();
    }, [hydrateFromDb])
  );

  const hasManualChanges = canUndo;

  const handleUndoManualChanges = () => {
    if (!canUndo) return;
    undo();
    setPopup({
      message: t("courseCreator.customEditor.popups.undo"),
      color: "disoriented",
      duration: 2500,
    });
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

  const handleCourseBoxZeroToggle = useCallback(async (value: boolean) => {
    await persistCourseSetting(() => setCustomCourseBoxZeroEnabled(courseId, value));
  }, [courseId, setCustomCourseBoxZeroEnabled, persistCourseSetting]);

  const handleCourseAutoflowToggle = useCallback(async (value: boolean) => {
    await persistCourseSetting(() => setCustomCourseAutoflowEnabled(courseId, value));
  }, [courseId, setCustomCourseAutoflowEnabled, persistCourseSetting]);

  const handleCourseSkipCorrectionToggle = useCallback(async (value: boolean) => {
    await persistCourseSetting(() => setCustomCourseSkipCorrectionEnabled(courseId, value));
  }, [courseId, setCustomCourseSkipCorrectionEnabled, persistCourseSetting]);

  const handleCourseShowExplanationToggle = useCallback(async (value: boolean) => {
    await persistCourseSetting(() => setCustomCourseShowExplanationEnabled(courseId, value));
  }, [courseId, setCustomCourseShowExplanationEnabled, persistCourseSetting]);

  const handleCourseExplanationOnlyOnWrongToggle = useCallback(async (value: boolean) => {
    await persistCourseSetting(() => setCustomCourseExplanationOnlyOnWrong(courseId, value));
  }, [courseId, setCustomCourseExplanationOnlyOnWrong, persistCourseSetting]);

  const handleCourseCardSizeChange = useCallback(async (value: FlashcardsCardSize) => {
    await persistCourseSetting(() => setCustomCourseCardSize(courseId, value));
  }, [courseId, setCustomCourseCardSize, persistCourseSetting]);

  const handleCourseImageSizeChange = useCallback(async (value: FlashcardsImageSize) => {
    await persistCourseSetting(() => setCustomCourseImageSize(courseId, value));
  }, [courseId, setCustomCourseImageSize, persistCourseSetting]);

  const handleCourseImageFrameToggle = useCallback(async (value: boolean) => {
    await persistCourseSetting(() => setCustomCourseImageFrameEnabled(courseId, value));
  }, [courseId, setCustomCourseImageFrameEnabled, persistCourseSetting]);

  const handleCourseTrueFalseButtonsVariantChange = useCallback(async (
    value: TrueFalseButtonsVariant
  ) => {
    await persistCourseSetting(() => setCustomCourseTrueFalseButtonsVariant(courseId, value));
  }, [courseId, setCustomCourseTrueFalseButtonsVariant, persistCourseSetting]);

  const skipCorrectionAttempt = useRef<number | null>(null);
  useEffect(() => {
    if (!courseIsTrueFalseOnly) skipCorrectionAttempt.current = null;
    if (courseIsTrueFalseOnly && !courseSkipCorrectionEnabled && skipCorrectionAttempt.current !== courseId) {
      // Do not retry automatically on every rollback when storage is unavailable.
      skipCorrectionAttempt.current = courseId;
      setCourseSkipCorrectionEnabled(true);
      void persistCourseSetting(() => setCustomCourseSkipCorrectionEnabled(courseId, true));
    }
  }, [
    courseId,
    courseIsTrueFalseOnly,
    courseSkipCorrectionEnabled,
    setCustomCourseSkipCorrectionEnabled,
    persistCourseSetting,
  ]);

  const handleCourseReviewsToggle = useCallback((value: boolean) => {
    setReviewsEnabled(value);
  }, [setReviewsEnabled]);

  const resetControls = useCourseResetActions({
    scopeKey: courseId,
    disabled: loading || isSaving || isDeleting || !courseSettingsResetHydrated,
    onResetSettings: async () => {
      const row = await getCustomCourseById(courseId);
      if (!row) throw new Error("Course not found");
      const pack = row.isOfficial ? OFFICIAL_PACKS.find((pack) => pack.slug === row.slug) : undefined;
      if (row.isOfficial && !pack) throw new Error("Official course defaults not found");
      const values = resolveCourseSettingsDefaults(pack, courseIsTrueFalseOnly);
      await resetCustomCourseSettings(courseId, values);
      await setCustomCourseReviewsEnabled(courseId, values.reviewsEnabled, { seedCompletedReviews: false });
      setReviewsEnabled(values.reviewsEnabled);
    },
    onResetBoxes: () => clearPersistedBoxesKeepProgress(customBoxesStorageKey),
    onResetReviews: () => resetCustomReviewsForCourse(courseId),
    onResetAll: async () => {
      await AsyncStorage.removeItem(customBoxesStorageKey);
      await resetCustomReviewsForCourse(courseId);
      await clearCustomLearningEventsForCourse(courseId);
      await clearCourseCompletionRun(courseId);
    },
  });

  const handleDeleteCourse = () => {
    if (isOfficialCourse) {
      setPopup({
        message: t("courseCreator.customEditor.popups.officialDeleteBlocked"),
        color: "angry",
        duration: 4000,
      });
      return;
    }

    Alert.alert(
      t("courseCreator.customEditor.alerts.deleteTitle"),
      t("courseCreator.customEditor.alerts.deleteMessage"),
      [
        { text: t("app.actions.cancel"), style: "cancel" },
        {
          text: t("app.actions.delete"),
          style: "destructive",
          onPress: () => {
            if (isDeleting) return;
            void (async () => {
              setIsDeleting(true);
              try {
                await deleteCustomCourse(courseId);
                await AsyncStorage.removeItem(customBoxesStorageKey);
                await clearCourseCompletionRun(courseId).catch((error) => {
                  console.warn("Failed to clear course completion run", error);
                });
                if (activeCustomCourseId === courseId) {
                  await setActiveCustomCourseId(null);
                }
                setPopup({
                  message: t("courseCreator.customEditor.popups.deleted"),
                  color: "calm",
                  duration: 3500,
                });
                router.back();
              } catch (error) {
                console.error("Failed to delete custom course", error);
                setPopup({
                  message: t("courseCreator.customEditor.popups.deleteFailed"),
                  color: "angry",
                  duration: 4000,
                });
              } finally {
                setIsDeleting(false);
              }
            })();
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    const cleanName = courseName.trim();
    if (!cleanName) {
      setPopup({
        message: t("courseCreator.customEditor.popups.missingName"),
        color: "angry",
        duration: 3000,
      });
      return;
    }
    if (nameConflict.kind === "duplicate") {
      setPopup({
        message: t("repeats.messages.duplicateCourseName"),
        color: "angry",
        duration: 3200,
      });
      return;
    }

    const trimmedCards = manualCards.reduce<CustomFlashcardInput[]>(
      (acc, card) => {
      const frontText = card.front.trim();
      const answers = normalizeAnswers(card.answers);
      const hasFrontImage = Boolean(card.imageFront);
      if (!frontText && answers.length === 0 && !hasFrontImage) {
        return acc;
      }
      const backText = answers[0] ?? "";
      acc.push({
        frontText,
        backText,
        answers,
        position: acc.length,
        flipped: card.flipped,
        answerOnly: card.answerOnly ?? false,
        type: card.type ?? "text",
        hintFront: card.hintFront ?? null,
        hintBack: card.hintBack ?? null,
        imageFront: card.imageFront ?? null,
        imageBack: card.imageBack ?? null,
        explanation: card.explanation ?? null,
      });
      return acc;
      },
      []
    );

    if (trimmedCards.length === 0) {
      setPopup({
        message: t("courseCreator.customEditor.popups.missingCards"),
        color: "angry",
        duration: 3000,
      });
      return;
    }

    setIsSaving(true);
    try {
      const courseInput = {
        name: cleanName,
        iconId: iconId ?? "heart",
        iconColor,
        colorId: colorId ?? undefined,
        reviewsEnabled,
      };

      if (contentDirty) {
        await saveCustomCourseEdits(courseId, courseInput, trimmedCards);
      } else {
        await updateCustomCourse(courseId, courseInput);
      }
      await clearCourseCompletionRun(courseId).catch((error) => {
        console.warn("Failed to clear course completion run", error);
      });

      setPopup({
        message: t("courseCreator.customEditor.popups.saved"),
        color: "calm",
        duration: 3500,
      });
      router.back();
    } catch (error) {
      console.error("Failed to save custom course", error);
      setPopup({
        message: t("courseCreator.customEditor.popups.saveFailed"),
        color: "angry",
        duration: 4000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const tabSwitcher = useMemo(() => (<>

    {shouldShowTabSwitcher ? (
      <View style={styles.topSection}>
        <Text style={styles.topSectionTitle}>
          {activeTab === "options"
            ? t("courseCreator.customEditor.tabs.options")
            : t("courseCreator.customEditor.tabs.content")}
        </Text>
        <SegmentedTabs
          options={[
            {
              key: "options",
              label: t("courseCreator.customEditor.tabs.optionsLabel"),
            },
            {
              key: "content",
              label: t("courseCreator.customEditor.tabs.contentLabel"),
            },
          ]}
          value={activeTab}
          onChange={(tab) => {
            if (tab !== activeTab) {
              setActiveTab(tab);
              categoryTabs.pagerRef.current?.scrollToTop();
            }
          }}
          accessibilityLabel={t("courseCreator.customEditor.tabs.a11y")}
          containerStyle={styles.viewModeTabs}
        />
      </View>
    ) : null}

  </>), [
    activeTab,
    categoryTabs.pagerRef,
    shouldShowTabSwitcher,
    styles.topSection,
    styles.topSectionTitle,
    styles.viewModeTabs,
    t,
  ]);
  const settingsScrollProps = useMemo(() => ({
    style: [styles.scrollView, useCenteredTabletLayout && styles.scrollViewTablet],
    contentContainerStyle: [styles.scrollContent, shouldShowManualToolbar && styles.scrollContentWithManualToolbar],
    keyboardShouldPersistTaps: "handled" as const,
  }), [
    shouldShowManualToolbar,
    styles.scrollContent,
    styles.scrollContentWithManualToolbar,
    styles.scrollView,
    styles.scrollViewTablet,
    useCenteredTabletLayout,
  ]);
  const courseSettingsProps = useMemo<CourseSettingsSectionProps>(() => ({
    styles,
    switchColors: {
      thumb: colors.background,
      trackFalse: colors.border,
      trackTrue: colors.my_green,
    },
    colors,
    audioSettings: getCustomCourseAudioSettings(courseId),
    audioSettingsDisabled: !courseAudioSettingsHydrated,
    showAudioLanguages: !isOfficialCourse,
    onChangeAudioSettings: (value) => { void persistCourseSetting(() => setCustomCourseAudioSettings(courseId, value)); },
    frontImageRole: getCustomCourseFrontImageRole(courseId),
    frontImageRoleDisabled: !courseFrontImageRoleHydrated,
    onChangeFrontImageRole: (value) => { void persistCourseSetting(() => setCustomCourseFrontImageRole(courseId, value)); },
    letterHintSettings: getCustomCourseLetterHintSettings(courseId),
    letterHintSettingsDisabled: !letterHintSettingsHydrated,
    onChangeLetterHintSettings: (value) => { void persistCourseSetting(() => setCustomCourseLetterHintSettings(courseId, value)); },
    boxZeroAnswerSide: courseBoxZeroAnswerSide,
    onSelectBoxZeroAnswerSide: async (side) => {
      await persistCourseSetting(() => setCustomCourseBoxZeroAnswerSide(courseId, side));
    },
    boxZeroEnabled: courseBoxZeroEnabled,
    onToggleBoxZero: handleCourseBoxZeroToggle,
    autoflowEnabled: courseAutoflowEnabled,
    onToggleAutoflow: handleCourseAutoflowToggle,
    reviewsEnabled,
    onToggleReviews: handleCourseReviewsToggle,
    showExplanationEnabled: courseShowExplanationEnabled,
    onToggleShowExplanation: handleCourseShowExplanationToggle,
    explanationOnlyOnWrong: courseExplanationOnlyOnWrong,
    onToggleExplanationOnlyOnWrong:
      handleCourseExplanationOnlyOnWrongToggle,
    skipCorrectionEnabled: courseSkipCorrectionEnabled,
    onToggleSkipCorrection: handleCourseSkipCorrectionToggle,
    skipCorrectionLocked: courseIsTrueFalseOnly,
    hideSkipCorrectionOption: courseIsTrueFalseOnly,
    showTrueFalseButtonsVariant: false,
    trueFalseButtonsVariant: courseTrueFalseButtonsVariant,
    onSelectTrueFalseButtonsVariant:
      handleCourseTrueFalseButtonsVariantChange,
    cardSize: courseCardSize,
    onSelectCardSize: handleCourseCardSizeChange,
    showImageSizeOptions: courseHasImageCards,
    imageSize: courseImageSize,
    imageSizeOptions,
    onSelectImageSize: handleCourseImageSizeChange,
    imageSizeEnabled: imageSizeOptionsEnabled,
    showImageFrameOption: courseHasImageCards,
    imageFrameEnabled: courseImageFrameEnabled,
    onToggleImageFrame: handleCourseImageFrameToggle,
  }), [
    colors,
    courseAudioSettingsHydrated,
    courseAutoflowEnabled,
    courseBoxZeroAnswerSide,
    courseBoxZeroEnabled,
    courseCardSize,
    courseExplanationOnlyOnWrong,
    courseFrontImageRoleHydrated,
    courseHasImageCards,
    courseId,
    courseImageFrameEnabled,
    courseImageSize,
    courseIsTrueFalseOnly,
    courseShowExplanationEnabled,
    courseSkipCorrectionEnabled,
    courseTrueFalseButtonsVariant,
    getCustomCourseAudioSettings,
    getCustomCourseFrontImageRole,
    getCustomCourseLetterHintSettings,
    handleCourseAutoflowToggle,
    handleCourseBoxZeroToggle,
    handleCourseCardSizeChange,
    handleCourseExplanationOnlyOnWrongToggle,
    handleCourseImageFrameToggle,
    handleCourseImageSizeChange,
    handleCourseReviewsToggle,
    handleCourseShowExplanationToggle,
    handleCourseSkipCorrectionToggle,
    handleCourseTrueFalseButtonsVariantChange,
    imageSizeOptions,
    imageSizeOptionsEnabled,
    isOfficialCourse,
    letterHintSettingsHydrated,
    reviewsEnabled,
    persistCourseSetting,
    setCustomCourseAudioSettings,
    setCustomCourseBoxZeroAnswerSide,
    setCustomCourseFrontImageRole,
    setCustomCourseLetterHintSettings,
    styles,
  ]);
  const renderSettingsPage = useCallback((pageTab: CourseSettingsTabKey) => (
    <>
      {tabSwitcher}
      {isOfficialCourse || activeTab === "options" ? (
        <>
          <View style={styles.sectionCard}>
            <CourseSettingsPanel
              activeTab={pageTab}
              styles={styles}
              settingsProps={courseSettingsProps}
              resetActions={resetControls.resetActions}
            />
          </View>

        </>
      ) : null}

    </>
  ), [activeTab, courseSettingsProps, isOfficialCourse, resetControls.resetActions, styles, tabSwitcher]);

  return (
    <View style={styles.container}>
      {isOfficialCourse || activeTab === "options" ? (
      <SettingsTabPager
        ref={categoryTabs.pagerRef}
        options={categoryTabs.options}
        value={categoryTabs.activeTab}
        onChange={categoryTabs.onCommit}
        scopeKey={categoryTabs.scopeKey}
        scrollViewProps={settingsScrollProps}
        renderPage={renderSettingsPage}
      />
      ) : (
        <ScrollView {...settingsScrollProps}>
          {tabSwitcher}
            {!isOfficialCourse && activeTab === "content" ? (
              <>
                <View style={styles.sectionCard}>
                  <View style={styles.sectionGroup}>
                    <Text style={styles.settingsGroupLabel}>
                      {t("courseCreator.customEditor.appearance.section")}
                    </Text>
                    <View style={styles.iconSelectorWrapper}>
                      <CourseIconColorSelector
                        courseName={courseName}
                        onCourseNameChange={setCourseName}
                        selectedIcon={iconId}
                        selectedColor={iconColor}
                        selectedColorId={colorId ?? undefined}
                        onIconChange={(value) => setIconId(value)}
                        onColorChange={handleColorChange}
                        onColorHexChange={(hex) => {
                          setIconColor(hex);
                          setColorId(null);
                        }}
                        previewName={courseName}
                        nameValidationState={nameConflict.kind}
                        nameValidationMessage={nameValidationMessage}
                        nameEditable={!isOfficialCourse}
                        disabled={isSaving}
                        styles={{
                          container: styles.iconSection,
                        }}
                        iconSectionDescription={t(
                          "courseCreator.customEditor.appearance.iconDescription"
                        )}
                        colorSectionDescription={t(
                          "courseCreator.customEditor.appearance.colorDescription"
                        )}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.sectionCard}>
                  {loading ? (
                    <View style={{ alignItems: "center", paddingVertical: 32 }}>
                      <ActivityIndicator size="large" />
                    </View>
                  ) : loadError ? (
                    <Text style={{ color: "#ff5470", fontSize: 16 }}>
                      {loadError}
                    </Text>
                  ) : (
                    <View style={styles.sectionGroup}>
                      <View style={styles.manualHeader}>
                        <Text style={styles.settingsGroupLabel}>
                          {t("courseCreator.customEditor.flashcardsSection")}
                        </Text>
                      </View>
                      <ManualCardsEditor
                        manualCards={manualCards}
                        cardType={newCardType}
                        styles={{} as ManualCardsEditorStyles}
                        onCardFrontChange={(id, value) => {
                          setContentDirty(true);
                          handleManualCardFrontChange(id, value);
                        }}
                        onCardAnswerChange={(id, answerIndex, value) => {
                          setContentDirty(true);
                          handleManualCardAnswerChange(id, answerIndex, value);
                        }}
                        onAddAnswer={(id) => {
                          setContentDirty(true);
                          handleAddAnswer(id);
                        }}
                        onRemoveAnswer={(id, answerIndex) => {
                          setContentDirty(true);
                          handleRemoveAnswer(id, answerIndex);
                        }}
                        onAddCard={() => {
                          setContentDirty(true);
                          handleAddCard(newCardType);
                        }}
                        onRemoveCard={(id) => {
                          setContentDirty(true);
                          handleRemoveCard(id);
                        }}
                        onToggleFlipped={(id) => {
                          setContentDirty(true);
                          handleToggleFlipped(id);
                        }}
                        onCardImageChange={(id, side, uri) => {
                          setContentDirty(true);
                          handleManualCardImageChange(id, side, uri);
                        }}
                        onCardExplanationChange={(id, value) => {
                          setContentDirty(true);
                          handleManualCardExplanationChange(id, value);
                        }}
                        showDefaultBottomAddButton={false}
                      />
                    </View>
                  )}
                </View>
              </>
            ) : null}

        </ScrollView>
      )}

      {shouldShowManualToolbar ? (
        <Animated.View
          style={[
            styles.manualToolbarWrap,
            useCenteredTabletLayout && styles.manualToolbarWrapTablet,
          ]}
        >
          <View style={styles.manualToolbar}>
            <CardTypeSelector
              options={newCardTypeOptions}
              value={newCardType}
              onChange={setNewCardType}
              label={t("courseCreator.customEditor.cardTypeLabel")}
              labelHidden
              size="compact"
              dropdownDirection="up"
              containerStyle={styles.manualTypeSelector}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("courseCreator.customEditor.addCardA11y")}
              style={styles.manualAddButton}
              hitSlop={8}
              onPress={() => {
                setContentDirty(true);
                handleAddCard(newCardType);
              }}
            >
              <Text style={styles.manualAddIcon}>+</Text>
            </Pressable>
          </View>
        </Animated.View>
      ) : null}

      <View
        style={[
          styles.buttonscontainer,
          (isOfficialCourse || activeTab === "options") && styles.settingsButtonsContainer,
        ]}
      >
        <View
          style={[
            styles.buttonsRow,
            (isOfficialCourse || activeTab === "options") && styles.settingsButtonsRow,
            useCenteredTabletLayout && styles.buttonsRowTablet,
          ]}
        >
          {!isOfficialCourse ? (
            <MyButton
              text={t("courseCreator.customEditor.deleteButton")}
              color="my_red"
              width={90}
              disabled={isSaving || isDeleting}
              onPress={handleDeleteCourse}
              accessibilityLabel={t("courseCreator.customEditor.deleteA11y")}
            />
          ) : null}

          {/* separator rozciąga się i odsuwa prawą grupę na skraj */}
          <View style={styles.spacer} />

          <View style={styles.rightGroup}>
            {!isOfficialCourse && hasManualChanges ? (
              <>
                <MyButton
                  text={t("courseCreator.customEditor.saveButton")}
                  color="my_green"
                  width={90}
                  disabled={isSaving || nameConflict.kind === "duplicate"}
                  onPress={handleSave}
                  accessibilityLabel={t("courseCreator.customEditor.saveA11y")}
                />
                <MyButton
                  color="my_yellow"
                  width={60}
                  disabled={!hasManualChanges}
                  onPress={handleUndoManualChanges}
                  accessibilityLabel={t("courseCreator.customEditor.undoA11y")}
                >
                  <Entypo name="ccw" size={32} color={colors.headline} />
                </MyButton>
              </>
            ) : null}

            <MyButton
              color="my_yellow"
              width={60}
              onPress={() => router.back()}
              accessibilityLabel={t("repeats.a11y.backToCoursesPanel")}
            >
              <Ionicons name="arrow-back" size={32} color={colors.headline} />
            </MyButton>
          </View>
        </View>
      </View>
      {isOfficialCourse || activeTab === "options" ? (
        <SettingsTabBar
          options={categoryTabs.options}
          value={categoryTabs.activeTab}
          onChange={categoryTabs.onChange}
        />
      ) : null}
      {resetControls.modal}
    </View>
  );
}
