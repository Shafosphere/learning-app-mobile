import { useCallback, useEffect, useMemo, useState } from "react";
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
  saveCustomCourseEdits,
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
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [existingCourses, setExistingCourses] = useState<CourseNameCandidate[]>([]);
  const [isOfficialCourse, setIsOfficialCourse] = useState(lockAppearance);
  const [resettingBoxes, setResettingBoxes] = useState(false);
  const [resettingReviews, setResettingReviews] = useState(false);
  const [resettingAll, setResettingAll] = useState(false);
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
  const imageSizeOptions: FlashcardsImageSize[] = [
    "dynamic",
    "small",
    "medium",
    "large",
    "very_large",
  ];
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
        setCourseBoxZeroEnabled(initialBoxZeroEnabled);
        setCourseAutoflowEnabled(initialAutoflowEnabled);
        setCourseSkipCorrectionEnabled(initialSkipCorrectionEnabled);
        setCourseShowExplanationEnabled(initialShowExplanationEnabled);
        setCourseExplanationOnlyOnWrong(initialExplanationOnlyOnWrong);
        setCourseCardSize(initialCardSize);
        setCourseImageFrameEnabled(initialImageFrameEnabled);
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
      setCourseBoxZeroEnabled(getCustomCourseBoxZeroEnabled(courseRow.id));
      setCourseAutoflowEnabled(getCustomCourseAutoflowEnabled(courseRow.id));
      setCourseShowExplanationEnabled(getCustomCourseShowExplanationEnabled(courseRow.id));
      setCourseExplanationOnlyOnWrong(
        getCustomCourseExplanationOnlyOnWrong(courseRow.id)
      );
      setCourseSkipCorrectionEnabled(
        getCustomCourseSkipCorrectionEnabled(courseRow.id)
      );
      setCourseCardSize(getCustomCourseCardSize(courseRow.id));
      setCourseImageSize(getCustomCourseImageSize(courseRow.id));
      setCourseImageFrameEnabled(getCustomCourseImageFrameEnabled(courseRow.id));
      setCourseTrueFalseButtonsVariant(
        getCustomCourseTrueFalseButtonsVariant(courseRow.id)
      );

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
      setCourseBoxZeroEnabled(initialBoxZeroEnabled);
      setCourseAutoflowEnabled(initialAutoflowEnabled);
      setCourseSkipCorrectionEnabled(initialSkipCorrectionEnabled);
      setCourseShowExplanationEnabled(initialShowExplanationEnabled);
      setCourseExplanationOnlyOnWrong(initialExplanationOnlyOnWrong);
      setCourseCardSize(initialCardSize);
      setCourseImageFrameEnabled(initialImageFrameEnabled);
      setCourseTrueFalseButtonsVariant(
        getCustomCourseTrueFalseButtonsVariant(courseId)
      );
    } finally {
      setLoading(false);
    }
  }, [
    courseId,
    getCustomCourseAutoflowEnabled,
    getCustomCourseBoxZeroEnabled,
    getCustomCourseCardSize,
    getCustomCourseExplanationOnlyOnWrong,
    getCustomCourseImageSize,
    getCustomCourseImageFrameEnabled,
    getCustomCourseShowExplanationEnabled,
    getCustomCourseSkipCorrectionEnabled,
    getCustomCourseTrueFalseButtonsVariant,
    hydrateDraft,
    initialAutoflowEnabled,
    initialBoxZeroEnabled,
    initialCardSize,
    initialExplanationOnlyOnWrong,
    initialImageFrameEnabled,
    initialShowExplanationEnabled,
    initialSkipCorrectionEnabled,
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

  const handleCourseBoxZeroToggle = async (value: boolean) => {
    setCourseBoxZeroEnabled(value);
    await setCustomCourseBoxZeroEnabled(courseId, value);
  };

  const handleCourseAutoflowToggle = async (value: boolean) => {
    setCourseAutoflowEnabled(value);
    await setCustomCourseAutoflowEnabled(courseId, value);
  };

  const handleCourseSkipCorrectionToggle = async (value: boolean) => {
    setCourseSkipCorrectionEnabled(value);
    await setCustomCourseSkipCorrectionEnabled(courseId, value);
  };

  const handleCourseShowExplanationToggle = async (value: boolean) => {
    setCourseShowExplanationEnabled(value);
    await setCustomCourseShowExplanationEnabled(courseId, value);
  };

  const handleCourseExplanationOnlyOnWrongToggle = async (value: boolean) => {
    setCourseExplanationOnlyOnWrong(value);
    await setCustomCourseExplanationOnlyOnWrong(courseId, value);
  };

  const handleCourseCardSizeChange = async (value: FlashcardsCardSize) => {
    setCourseCardSize(value);
    await setCustomCourseCardSize(courseId, value);
  };

  const handleCourseImageSizeChange = async (value: FlashcardsImageSize) => {
    setCourseImageSize(value);
    await setCustomCourseImageSize(courseId, value);
  };

  const handleCourseImageFrameToggle = async (value: boolean) => {
    setCourseImageFrameEnabled(value);
    await setCustomCourseImageFrameEnabled(courseId, value);
  };

  const handleCourseTrueFalseButtonsVariantChange = async (
    value: TrueFalseButtonsVariant
  ) => {
    setCourseTrueFalseButtonsVariant(value);
    await setCustomCourseTrueFalseButtonsVariant(courseId, value);
  };

  useEffect(() => {
    if (courseIsTrueFalseOnly && !courseSkipCorrectionEnabled) {
      setCourseSkipCorrectionEnabled(true);
      void setCustomCourseSkipCorrectionEnabled(courseId, true);
    }
  }, [
    courseId,
    courseIsTrueFalseOnly,
    courseSkipCorrectionEnabled,
    setCustomCourseSkipCorrectionEnabled,
  ]);

  const handleCourseReviewsToggle = (value: boolean) => {
    setReviewsEnabled(value);
  };

  const performResetBoxes = async () => {
    setResettingBoxes(true);
    try {
      await clearPersistedBoxesKeepProgress(customBoxesStorageKey);
      Alert.alert(
        t("courseCreator.customEditor.alerts.resetBoxesDoneTitle"),
        t("courseCreator.customEditor.alerts.resetBoxesDoneMessage")
      );
    } catch {
      Alert.alert(
        t("app.status.error"),
        t("courseCreator.customEditor.alerts.resetBoxesFailed")
      );
    } finally {
      setResettingBoxes(false);
    }
  };

  const handleResetBoxes = () => {
    Alert.alert(
      t("courseCreator.customEditor.alerts.resetBoxesConfirmTitle"),
      t("courseCreator.customEditor.alerts.resetBoxesConfirmMessage"),
      [
        { text: t("app.actions.cancel"), style: "cancel" },
        {
          text: t("app.actions.clear"),
          style: "destructive",
          onPress: performResetBoxes,
        },
      ]
    );
  };

  const performResetReviews = async () => {
    setResettingReviews(true);
    try {
      const deleted = await resetCustomReviewsForCourse(courseId);
      Alert.alert(
        t("courseCreator.customEditor.alerts.resetReviewsDoneTitle"),
        deleted > 0
          ? t("courseCreator.customEditor.alerts.resetReviewsDoneMessage", {
              count: deleted,
            })
          : t("courseCreator.customEditor.alerts.resetReviewsDoneEmpty")
      );
    } catch {
      Alert.alert(
        t("app.status.error"),
        t("courseCreator.customEditor.alerts.resetReviewsFailed")
      );
    } finally {
      setResettingReviews(false);
    }
  };

  const handleResetReviews = () => {
    Alert.alert(
      t("courseCreator.customEditor.alerts.resetReviewsConfirmTitle"),
      t("courseCreator.customEditor.alerts.resetReviewsConfirmMessage"),
      [
        { text: t("app.actions.cancel"), style: "cancel" },
        {
          text: t("app.actions.delete"),
          style: "destructive",
          onPress: performResetReviews,
        },
      ]
    );
  };

  const performResetAll = async () => {
    setResettingAll(true);
    try {
      await AsyncStorage.removeItem(customBoxesStorageKey);
      await resetCustomReviewsForCourse(courseId);
      await clearCustomLearningEventsForCourse(courseId);
      await clearCourseCompletionRun(courseId).catch((error) => {
        console.warn("Failed to clear course completion run", error);
      });
      Alert.alert(
        t("courseCreator.customEditor.alerts.resetAllDoneTitle"),
        t("courseCreator.customEditor.alerts.resetAllDoneMessage")
      );
    } catch {
      Alert.alert(
        t("app.status.error"),
        t("courseCreator.customEditor.alerts.resetAllFailed")
      );
    } finally {
      setResettingAll(false);
    }
  };

  const handleResetAll = () => {
    Alert.alert(
      t("courseCreator.customEditor.alerts.resetAllConfirmTitle"),
      t("courseCreator.customEditor.alerts.resetAllConfirmMessage"),
      [
        { text: t("app.actions.cancel"), style: "cancel" },
        {
          text: t("app.actions.restore"),
          style: "destructive",
          onPress: performResetAll,
        },
      ]
    );
  };

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
      await saveCustomCourseEdits(courseId, {
        name: cleanName,
        iconId: iconId ?? "heart",
        iconColor,
        colorId: colorId ?? undefined,
        reviewsEnabled,
      }, trimmedCards);
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

  return (
    <View style={styles.container}>
      <ScrollView
        style={[
          styles.scrollView,
          useCenteredTabletLayout && styles.scrollViewTablet,
        ]}
        contentContainerStyle={[
          styles.scrollContent,
          shouldShowManualToolbar && styles.scrollContentWithManualToolbar,
        ]}
        keyboardShouldPersistTaps="handled"
      >
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
              onChange={setActiveTab}
              accessibilityLabel={t("courseCreator.customEditor.tabs.a11y")}
              containerStyle={styles.viewModeTabs}
            />
          </View>
        ) : null}

        {isOfficialCourse || activeTab === "options" ? (
          <>
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
                }}
                resetActions={[
                  {
                    key: "boxes",
                    title: t("courseCreator.customEditor.resetActions.boxes.title"),
                    subtitle: t("courseCreator.customEditor.resetActions.boxes.subtitle"),
                    ctaText: t("app.actions.clear"),
                    loadingText: t("courseCreator.customEditor.resetActions.boxes.loading"),
                    loading: resettingBoxes,
                    onPress: handleResetBoxes,
                    disabled: resettingBoxes,
                  },
                  {
                    key: "reviews",
                    title: t("courseCreator.customEditor.resetActions.reviews.title"),
                    subtitle: t("courseCreator.customEditor.resetActions.reviews.subtitle"),
                    ctaText: t("app.actions.delete"),
                    loadingText: t("courseCreator.customEditor.resetActions.reviews.loading"),
                    loading: resettingReviews,
                    onPress: handleResetReviews,
                    disabled: resettingReviews,
                  },
                  {
                    key: "all",
                    title: t("courseCreator.customEditor.resetActions.all.title"),
                    subtitle: t("courseCreator.customEditor.resetActions.all.subtitle"),
                    ctaText: t("app.actions.restore"),
                    loadingText: t("courseCreator.customEditor.resetActions.all.loading"),
                    loading: resettingAll,
                    onPress: handleResetAll,
                    disabled: resettingAll,
                  },
                ]}
              />
            </View>

          </>
        ) : null}

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
                    onCardFrontChange={handleManualCardFrontChange}
                    onCardAnswerChange={handleManualCardAnswerChange}
                    onAddAnswer={handleAddAnswer}
                    onRemoveAnswer={handleRemoveAnswer}
                    onAddCard={() => handleAddCard(newCardType)}
                    onRemoveCard={handleRemoveCard}
                    onToggleFlipped={handleToggleFlipped}
                    onCardImageChange={handleManualCardImageChange}
                    onCardExplanationChange={handleManualCardExplanationChange}
                    showDefaultBottomAddButton={false}
                  />
                </View>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>

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
              onPress={() => handleAddCard(newCardType)}
            >
              <Text style={styles.manualAddIcon}>+</Text>
            </Pressable>
          </View>
        </Animated.View>
      ) : null}

      <View style={styles.buttonscontainer}>
        <View
          style={[
            styles.buttonsRow,
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
    </View>
  );
}
