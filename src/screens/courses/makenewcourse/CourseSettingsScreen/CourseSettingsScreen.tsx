import MyButton from "@/src/components/button/button";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_COURSE_COLOR } from "@/src/constants/customCourse";
import { usePopup } from "@/src/contexts/PopupContext";
import {
  createCustomCourse,
  getCustomCourseNameCandidates,
  replaceCustomFlashcards,
} from "@/src/db/sqlite/db";
import {
  findCourseNameConflict,
  type CourseNameCandidate,
} from "@/src/utils/customCourseNameConflicts";
import {
  useSettings,
  type FlashcardsImageSize,
} from "@/src/contexts/SettingsContext";
import { normalizeAnswers, type ManualCard } from "@/src/hooks/useManualCardsForm";
import { CourseSettingsPanel } from "@/src/components/courseEditor/CourseSettingsPanel";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { useCourseEditStyles } from "./CourseSettingsScreen-styles";
import {
  CONTENT_DRAFT_STORAGE_KEY,
  SETTINGS_DRAFT_STORAGE_KEY,
  type ContentDraftPayload,
  type SettingsDraftPayload,
  makeCustomCourseDraftScopeKey,
  normalizeDraftCards,
} from "@/src/features/customCourse/contentDraft";

type LocalSearchParams = {
  name?: string | string[];
  iconId?: string | string[];
  iconColor?: string | string[];
  colorId?: string | string[];
  reviewsEnabled?: string | string[];
};

const getFirstValue = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
};

export default function CourseSettingsScreen() {
  const styles = useCourseEditStyles();
  const router = useRouter();
  const pathname = usePathname();
  const setPopup = usePopup();
  const params = useLocalSearchParams<LocalSearchParams>();
  const {
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

  const courseName = useMemo(() => getFirstValue(params.name).trim(), [params.name]);
  const iconId = useMemo(() => getFirstValue(params.iconId).trim(), [params.iconId]);
  const iconColor = useMemo(
    () => getFirstValue(params.iconColor).trim(),
    [params.iconColor]
  );
  const colorId = useMemo(() => {
    const value = getFirstValue(params.colorId).trim();
    return value.length > 0 ? value : null;
  }, [params.colorId]);
  const initialReviewsEnabled = useMemo(() => {
    const normalized = getFirstValue(params.reviewsEnabled).trim().toLowerCase();
    return normalized === "1" || normalized === "true";
  }, [params.reviewsEnabled]);
  const hasRequiredRouteParams = useMemo(
    () =>
      courseName.length > 0 &&
      iconId.length > 0 &&
      iconColor.length > 0,
    [courseName, iconColor, iconId]
  );

  const contentPath = pathname.startsWith("/custom_profile")
    ? "/custom_profile/content"
    : "/custom_course/content";

  const draftScopeKey = useMemo(
    () =>
      makeCustomCourseDraftScopeKey({
        courseName,
        iconId,
        iconColor,
        colorId,
        reviewsEnabled: initialReviewsEnabled,
      }),
    [colorId, courseName, iconColor, iconId, initialReviewsEnabled]
  );
  const contentRouteParams = useMemo(() => {
    const next: Record<string, string> = {
      name: courseName,
      iconId,
      iconColor,
      reviewsEnabled: initialReviewsEnabled ? "1" : "0",
    };
    if (colorId) {
      next.colorId = colorId;
    }
    return next;
  }, [colorId, courseName, iconColor, iconId, initialReviewsEnabled]);

  const [manualCards, setManualCards] = useState<ManualCard[]>([]);
  const [existingCourses, setExistingCourses] = useState<CourseNameCandidate[]>([]);
  const [hydrating, setHydrating] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const restoredScopeRef = useRef<string | null>(null);

  const [boxZeroEnabled, setBoxZeroEnabled] = useState(
    getCustomCourseBoxZeroEnabled(-1)
  );
  const [autoflowEnabled, setAutoflowEnabled] = useState(
    getCustomCourseAutoflowEnabled(-1)
  );
  const [reviewsEnabled, setReviewsEnabled] = useState(initialReviewsEnabled);
  const [showExplanationEnabled, setShowExplanationEnabled] = useState(
    getCustomCourseShowExplanationEnabled(-1)
  );
  const [explanationOnlyOnWrong, setExplanationOnlyOnWrong] = useState(
    getCustomCourseExplanationOnlyOnWrong(-1)
  );
  const [skipCorrectionEnabled, setSkipCorrectionEnabled] = useState(
    getCustomCourseSkipCorrectionEnabled(-1)
  );
  const [trueFalseButtonsVariant, setTrueFalseButtonsVariant] = useState(
    getCustomCourseTrueFalseButtonsVariant(-1)
  );
  const [cardSize, setCardSize] = useState(getCustomCourseCardSize(-1));
  const [imageSize, setImageSize] = useState(getCustomCourseImageSize(-1));
  const [imageFrameEnabled, setImageFrameEnabled] = useState(
    getCustomCourseImageFrameEnabled(-1)
  );
  const nameConflict = useMemo(
    () => findCourseNameConflict(courseName, existingCourses),
    [courseName, existingCourses],
  );

  useEffect(() => {
    setReviewsEnabled(initialReviewsEnabled);
  }, [initialReviewsEnabled]);

  useEffect(() => {
    let isMounted = true;
    void getCustomCourseNameCandidates()
      .then((rows) => {
        if (isMounted) {
          setExistingCourses(rows);
        }
      })
      .catch((error) => {
        console.error("Failed to load custom course names", error);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (restoredScopeRef.current === draftScopeKey) {
      if (hydrating) {
        setHydrating(false);
      }
      return;
    }
    let isMounted = true;
    const restore = async () => {
      if (!hasRequiredRouteParams) {
        if (__DEV__) {
          console.log("[CourseSettingsScreen] Waiting for route params", {
            courseName,
            iconId,
            iconColor,
            colorId,
            reviewsEnabled: initialReviewsEnabled,
          });
        }
        return;
      }
      try {
        if (__DEV__) {
          console.log("[CourseSettingsScreen] Restore start", {
            draftScopeKey,
            courseName,
            iconId,
            iconColor,
            colorId,
            reviewsEnabled: initialReviewsEnabled,
          });
        }
        const rawDraft = await AsyncStorage.getItem(CONTENT_DRAFT_STORAGE_KEY);
        const parsedDraft = rawDraft
          ? (JSON.parse(rawDraft) as Partial<ContentDraftPayload>)
          : null;

        if (!parsedDraft || parsedDraft.scopeKey !== draftScopeKey) {
          if (__DEV__) {
            console.log("[CourseSettingsScreen] Draft missing or scope mismatch", {
              expectedScope: draftScopeKey,
              draftScope: parsedDraft?.scopeKey ?? null,
              hasDraft: Boolean(parsedDraft),
            });
          }
          setPopup({
            message: "Brak zawartości kursu. Uzupełnij fiszki najpierw.",
            color: "angry",
            duration: 3500,
          });
          router.replace({ pathname: contentPath, params: contentRouteParams });
          return;
        }

        const restoredCards = normalizeDraftCards(parsedDraft.manualCards);
        const validCards = restoredCards.filter((card) => {
          const hasFront = card.front.trim().length > 0;
          const hasAnswers = normalizeAnswers(card.answers).length > 0;
          const hasImage = Boolean(card.imageFront || card.imageBack);
          return hasFront || hasAnswers || hasImage;
        });
        if (__DEV__) {
          console.log("[CourseSettingsScreen] Restored cards", {
            restored: restoredCards.length,
            valid: validCards.length,
          });
        }

        if (validCards.length === 0) {
          if (__DEV__) {
            console.log("[CourseSettingsScreen] No valid cards in draft");
          }
          setPopup({
            message: "Dodaj przynajmniej jedną fiszkę przed ustawieniami.",
            color: "angry",
            duration: 3500,
          });
          router.replace({ pathname: contentPath, params: contentRouteParams });
          return;
        }

        const rawSettingsDraft = await AsyncStorage.getItem(
          SETTINGS_DRAFT_STORAGE_KEY
        );
        const parsedSettingsDraft = rawSettingsDraft
          ? (JSON.parse(rawSettingsDraft) as Partial<SettingsDraftPayload>)
          : null;
        if (parsedSettingsDraft?.scopeKey === draftScopeKey) {
          if (__DEV__) {
            console.log("[CourseSettingsScreen] Restoring settings draft");
          }
          if (typeof parsedSettingsDraft.boxZeroEnabled === "boolean") {
            setBoxZeroEnabled(parsedSettingsDraft.boxZeroEnabled);
          }
          if (typeof parsedSettingsDraft.autoflowEnabled === "boolean") {
            setAutoflowEnabled(parsedSettingsDraft.autoflowEnabled);
          }
          if (typeof parsedSettingsDraft.reviewsEnabled === "boolean") {
            setReviewsEnabled(parsedSettingsDraft.reviewsEnabled);
          }
          if (typeof parsedSettingsDraft.showExplanationEnabled === "boolean") {
            setShowExplanationEnabled(parsedSettingsDraft.showExplanationEnabled);
          }
          if (typeof parsedSettingsDraft.explanationOnlyOnWrong === "boolean") {
            setExplanationOnlyOnWrong(parsedSettingsDraft.explanationOnlyOnWrong);
          }
          if (typeof parsedSettingsDraft.skipCorrectionEnabled === "boolean") {
            setSkipCorrectionEnabled(parsedSettingsDraft.skipCorrectionEnabled);
          }
          if (
            parsedSettingsDraft.trueFalseButtonsVariant === "true_false" ||
            parsedSettingsDraft.trueFalseButtonsVariant === "know_dont_know"
          ) {
            setTrueFalseButtonsVariant(parsedSettingsDraft.trueFalseButtonsVariant);
          }
          if (
            parsedSettingsDraft.cardSize === "large" ||
            parsedSettingsDraft.cardSize === "small"
          ) {
            setCardSize(parsedSettingsDraft.cardSize);
          }
          if (
            parsedSettingsDraft.imageSize === "dynamic" ||
            parsedSettingsDraft.imageSize === "small" ||
            parsedSettingsDraft.imageSize === "medium" ||
            parsedSettingsDraft.imageSize === "large" ||
            parsedSettingsDraft.imageSize === "very_large"
          ) {
            setImageSize(parsedSettingsDraft.imageSize);
          }
          if (typeof parsedSettingsDraft.imageFrameEnabled === "boolean") {
            setImageFrameEnabled(parsedSettingsDraft.imageFrameEnabled);
          }
        }

        if (isMounted) {
          setManualCards(validCards);
          restoredScopeRef.current = draftScopeKey;
        }
      } catch (error) {
        console.error("Failed to restore course settings draft", error);
        setPopup({
          message: "Nie udało się odczytać danych kreatora.",
          color: "angry",
          duration: 3500,
        });
      } finally {
        if (isMounted) {
          setHydrating(false);
        }
      }
    };

    void restore();
    return () => {
      isMounted = false;
    };
  }, [
    colorId,
    contentPath,
    contentRouteParams,
    courseName,
    draftScopeKey,
    hasRequiredRouteParams,
    iconColor,
    iconId,
    initialReviewsEnabled,
    router,
    setPopup,
    hydrating,
  ]);

  useEffect(() => {
    if (hydrating) return;
    const timeoutId = setTimeout(() => {
      const payload: SettingsDraftPayload = {
        scopeKey: draftScopeKey,
        boxZeroEnabled,
        autoflowEnabled,
        reviewsEnabled,
        showExplanationEnabled,
        explanationOnlyOnWrong,
        skipCorrectionEnabled,
        trueFalseButtonsVariant,
        cardSize,
        imageSize,
        imageFrameEnabled,
      };
      void AsyncStorage.setItem(SETTINGS_DRAFT_STORAGE_KEY, JSON.stringify(payload));
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [
    autoflowEnabled,
    boxZeroEnabled,
    cardSize,
    draftScopeKey,
    hydrating,
    imageSize,
    imageFrameEnabled,
    reviewsEnabled,
    showExplanationEnabled,
    explanationOnlyOnWrong,
    skipCorrectionEnabled,
    trueFalseButtonsVariant,
  ]);

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
    () => manualCards.some((card) => Boolean(card.imageFront || card.imageBack)),
    [manualCards]
  );

  const imageSizeEnabled = cardSize === "large" && courseHasImageCards;
  const imageSizeOptions: FlashcardsImageSize[] = [
    "dynamic",
    "small",
    "medium",
    "large",
    "very_large",
  ];

  const handleCreateCourse = async () => {
    if (nameConflict.kind === "duplicate") {
      setPopup({
        message: "Ta nazwa kursu jest już zajęta.",
        color: "angry",
        duration: 3200,
      });
      return;
    }
    if (!courseName || !iconId) {
      setPopup({
        message: "Brak nazwy lub ikony kursu.",
        color: "angry",
        duration: 3000,
      });
      router.replace({ pathname: contentPath, params: contentRouteParams });
      return;
    }
    if (manualCards.length === 0) {
      setPopup({
        message: "Brak fiszek do zapisania.",
        color: "angry",
        duration: 3000,
      });
      router.replace({ pathname: contentPath, params: contentRouteParams });
      return;
    }

    const trimmedCards = manualCards.reduce<
      {
        frontText: string;
        backText: string;
        answers: string[];
        position: number;
        flipped: boolean;
        hintFront?: string | null;
        hintBack?: string | null;
        answerOnly?: boolean;
        imageFront?: string | null;
        imageBack?: string | null;
        explanation?: string | null;
        type?: "text" | "true_false" | "know_dont_know";
      }[]
    >((acc, card) => {
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
        hintFront: card.hintFront ?? "",
        hintBack: card.hintBack ?? "",
        answerOnly: card.answerOnly ?? false,
        imageFront: card.imageFront ?? null,
        imageBack: card.imageBack ?? null,
        explanation: card.explanation ?? null,
        type: card.type ?? "text",
      });
      return acc;
    }, []);

    if (trimmedCards.length === 0) {
      setPopup({
        message: "Dodaj przynajmniej jedną fiszkę.",
        color: "angry",
        duration: 3000,
      });
      return;
    }

    setIsSaving(true);
    try {
      const courseId = await createCustomCourse({
        name: courseName,
        iconId,
        iconColor: iconColor || DEFAULT_COURSE_COLOR,
        colorId: colorId ?? undefined,
        reviewsEnabled,
      });

      await replaceCustomFlashcards(courseId, trimmedCards);
      await setCustomCourseBoxZeroEnabled(courseId, boxZeroEnabled);
      await setCustomCourseAutoflowEnabled(courseId, autoflowEnabled);
      await setCustomCourseShowExplanationEnabled(courseId, showExplanationEnabled);
      await setCustomCourseExplanationOnlyOnWrong(
        courseId,
        explanationOnlyOnWrong
      );
      await setCustomCourseSkipCorrectionEnabled(courseId, skipCorrectionEnabled);
      await setCustomCourseTrueFalseButtonsVariant(
        courseId,
        trueFalseButtonsVariant
      );
      await setCustomCourseCardSize(courseId, cardSize);
      await setCustomCourseImageSize(courseId, imageSize);
      await setCustomCourseImageFrameEnabled(courseId, imageFrameEnabled);

      await Promise.all([
        AsyncStorage.removeItem(CONTENT_DRAFT_STORAGE_KEY),
        AsyncStorage.removeItem(SETTINGS_DRAFT_STORAGE_KEY),
      ]);

      setPopup({
        message: "Kurs zapisany!",
        color: "calm",
        duration: 3200,
      });
      router.replace("/coursepanel");
    } catch (error) {
      console.error("Failed to create custom course", error);
      setPopup({
        message: "Nie udało się stworzyć kursu.",
        color: "angry",
        duration: 3500,
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (hydrating) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
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
              onToggleBoxZero: setBoxZeroEnabled,
              autoflowEnabled,
              onToggleAutoflow: setAutoflowEnabled,
              reviewsEnabled,
              onToggleReviews: setReviewsEnabled,
              showExplanationEnabled,
              onToggleShowExplanation: setShowExplanationEnabled,
              explanationOnlyOnWrong,
              onToggleExplanationOnlyOnWrong: setExplanationOnlyOnWrong,
              skipCorrectionEnabled,
              onToggleSkipCorrection: setSkipCorrectionEnabled,
              skipCorrectionLocked: courseIsTrueFalseOnly,
              hideSkipCorrectionOption: courseIsTrueFalseOnly,
              showTrueFalseButtonsVariant: false,
              trueFalseButtonsVariant,
              onSelectTrueFalseButtonsVariant: setTrueFalseButtonsVariant,
              cardSize,
              onSelectCardSize: setCardSize,
              showImageSizeOptions: courseHasImageCards,
              imageSize,
              imageSizeOptions,
              onSelectImageSize: setImageSize,
              imageSizeEnabled,
              showImageFrameOption: courseHasImageCards,
              imageFrameEnabled,
              onToggleImageFrame: setImageFrameEnabled,
            }}
          />
        </View>
      </ScrollView>

      <View style={styles.buttonscontainer}>
        <View style={styles.buttonsRow}>
          <MyButton
            color="my_yellow"
            width={60}
            onPress={() => router.back()}
            accessibilityLabel="Wróć do ustawiania zawartości kursu"
          >
            <Ionicons name="arrow-back" size={28} color={colors.headline} />
          </MyButton>
          <View style={{ flex: 1 }} />
          <MyButton
            text="Stwórz"
            color="my_green"
            onPress={handleCreateCourse}
            disabled={isSaving}
            accessibilityLabel="Stwórz kurs z aktualną zawartością i ustawieniami"
          />
        </View>
      </View>
    </View>
  );
}
