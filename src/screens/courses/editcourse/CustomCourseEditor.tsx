import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import Entypo from "@expo/vector-icons/Entypo";
import Ionicons from "@expo/vector-icons/Ionicons";

import MyButton from "@/src/components/button/button";
import { DEFAULT_COURSE_COLOR } from "@/src/constants/customCourse";
import { usePopup } from "@/src/contexts/PopupContext";
import { useSettings } from "@/src/contexts/SettingsContext";
import {
  clearCustomReviewsForCourse,
  deleteCustomCourse,
  getCustomCourseById,
  getCustomFlashcards,
  replaceCustomFlashcards,
  resetCustomReviewsForCourse,
  updateCustomCourse,
} from "@/src/db/sqlite/db";
import type { CustomFlashcardInput } from "@/src/db/sqlite/repositories/flashcards";
import type {
  FlashcardsCardSize,
  FlashcardsImageSize,
  TrueFalseButtonsVariant,
} from "@/src/contexts/SettingsContext";
import { makeScopeId } from "@/src/hooks/useBoxesPersistenceSnapshot";
import { useCustomCourseDraft } from "@/src/hooks/useCustomCourseDraft";
import {
  createEmptyManualCard,
  ensureCardsNormalized,
  normalizeAnswers,
  useManualCardsForm,
  type ManualCard,
  type ManualCardType,
} from "@/src/hooks/useManualCardsForm";
import {
  ManualCardsEditor,
  type ManualCardsEditorStyles,
} from "@/src/screens/courses/editcourse/components/editFlashcards/editFlashcards";
import { CourseIconColorSelector } from "@/src/screens/courses/editcourse/components/iconEdit/iconEdit";
import { CourseSettingsSection } from "@/src/screens/courses/editcourse/components/SettingsCourse";
import { CourseNameField } from "@/src/screens/courses/editcourse/components/nameEdit/nameEdit";
import { useStyles } from "./CustomCourseEditor-styles";
export type CustomCourseEditorProps = {
  courseId: number;
  initialName: string;
  lockAppearance: boolean;
};

export default function CustomCourseEditor({
  courseId,
  initialName,
  lockAppearance,
}: CustomCourseEditorProps) {
  const styles = useStyles();
  const router = useRouter();
  const setPopup = usePopup();
  const {
    colors,
    getCustomCourseBoxZeroEnabled,
    setCustomCourseBoxZeroEnabled,
    getCustomCourseAutoflowEnabled,
    setCustomCourseAutoflowEnabled,
    getCustomCourseSkipCorrectionEnabled,
    setCustomCourseSkipCorrectionEnabled,
    getCustomCourseCardSize,
    setCustomCourseCardSize,
    getCustomCourseImageSize,
    setCustomCourseImageSize,
    getCustomCourseTrueFalseButtonsVariant,
    setCustomCourseTrueFalseButtonsVariant,
  } = useSettings();

  const {
    courseName,
    setCourseName,
    iconId,
    setIconId,
    iconColor,
    colorId,
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
    canUndo,
    undo,
  } = useManualCardsForm({
    initialCards: [createEmptyManualCard("card-0")],
    enableHistory: true,
    historyLimit: 50,
  });
  const [manualCardType, setManualCardType] = useState<ManualCardType>("text");

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
  const initialCardSize = useMemo(
    () => getCustomCourseCardSize(courseId),
    [courseId, getCustomCourseCardSize]
  );
  const initialImageSize = useMemo(
    () => getCustomCourseImageSize(courseId),
    [courseId, getCustomCourseImageSize]
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
  const [courseCardSize, setCourseCardSize] = useState<FlashcardsCardSize>(
    initialCardSize
  );
  const [courseImageSize, setCourseImageSize] = useState<FlashcardsImageSize>(
    initialImageSize
  );
  const [courseTrueFalseButtonsVariant, setCourseTrueFalseButtonsVariant] =
    useState<TrueFalseButtonsVariant>(() =>
      getCustomCourseTrueFalseButtonsVariant(courseId)
    );
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
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

  const inferCardTypeFromCards = useCallback(
    (cards: ManualCard[]): ManualCardType => {
      if (
        cards.length > 0 &&
        cards.every((card) => (card.type ?? "text") === "true_false")
      ) {
        return "true_false";
      }
      if (
        cards.some(
          (card) =>
            (card.type ?? "text") === "image" ||
            Boolean(card.imageFront) ||
            Boolean(card.imageBack)
        )
      ) {
        return "image";
      }
      return "text";
    },
    []
  );

  useEffect(() => {
    const inferred = inferCardTypeFromCards(manualCards);
    setManualCardType((prev) => (prev === inferred ? prev : inferred));
  }, [inferCardTypeFromCards, manualCards]);

  const courseIsTrueFalseOnly = useMemo(
    () =>
      manualCards.length > 0 &&
      manualCards.every((card) => (card.type ?? "text") === "true_false"),
    [manualCards]
  );
  const courseHasImageCards = useMemo(
    () =>
      manualCards.some(
        (card) =>
          (card.type ?? "text") === "image" ||
          Boolean(card.imageFront) ||
          Boolean(card.imageBack)
      ),
    [manualCards]
  );
  const imageSizeOptionsEnabled =
    courseCardSize === "large" && courseHasImageCards;

  const hydrateFromDb = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [courseRow, cardRows] = await Promise.all([
        getCustomCourseById(courseId),
        getCustomFlashcards(courseId),
      ]);

      if (!courseRow) {
        setLoadError("Kurs nie istnieje.");
        replaceManualCards([createEmptyManualCard("card-0")]);
        setIsOfficialCourse(lockAppearance);
        setCourseBoxZeroEnabled(initialBoxZeroEnabled);
        setCourseAutoflowEnabled(initialAutoflowEnabled);
        setCourseSkipCorrectionEnabled(initialSkipCorrectionEnabled);
        setCourseCardSize(initialCardSize);
        setLoading(false);
        return;
      }

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
      setCourseSkipCorrectionEnabled(
        getCustomCourseSkipCorrectionEnabled(courseRow.id)
      );
      setCourseCardSize(getCustomCourseCardSize(courseRow.id));
      setCourseImageSize(getCustomCourseImageSize(courseRow.id));
      setCourseTrueFalseButtonsVariant(
        getCustomCourseTrueFalseButtonsVariant(courseRow.id)
      );

      const incomingCards = cardRows.map((card, index) => {
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
          type: (card.type as "text" | "image" | "true_false") ?? "text",
          hintFront: card.hintFront,
          hintBack: card.hintBack,
          imageFront: card.imageFront ?? null,
          imageBack: card.imageBack ?? null,
        };
      });
      replaceManualCards(ensureCardsNormalized(incomingCards));
    } catch (error) {
      console.error("Failed to load custom course for edit", error);
      setLoadError("Nie udało się wczytać danych kursu.");
      setIsOfficialCourse(lockAppearance);
      setCourseBoxZeroEnabled(initialBoxZeroEnabled);
      setCourseAutoflowEnabled(initialAutoflowEnabled);
      setCourseSkipCorrectionEnabled(initialSkipCorrectionEnabled);
      setCourseCardSize(initialCardSize);
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
    getCustomCourseSkipCorrectionEnabled,
    getCustomCourseTrueFalseButtonsVariant,
    hydrateDraft,
    initialAutoflowEnabled,
    initialBoxZeroEnabled,
    initialCardSize,
    initialSkipCorrectionEnabled,
    lockAppearance,
    normalizeAnswers,
    replaceManualCards,
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
      message: "Cofnięto ostatnią zmianę",
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

  const handleCourseCardSizeChange = async (value: FlashcardsCardSize) => {
    setCourseCardSize(value);
    await setCustomCourseCardSize(courseId, value);
  };

  const handleCourseImageSizeChange = async (value: FlashcardsImageSize) => {
    setCourseImageSize(value);
    await setCustomCourseImageSize(courseId, value);
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
      await AsyncStorage.removeItem(customBoxesStorageKey);
      Alert.alert(
        "Zresetowano pudełka",
        "Stan pudełek i użyte słówka tego kursu został wyczyszczony."
      );
    } catch {
      Alert.alert("Błąd", "Nie udało się zresetować pudełek.");
    } finally {
      setResettingBoxes(false);
    }
  };

  const handleResetBoxes = () => {
    Alert.alert(
      "Reset pudełek",
      "Czyści stan pudełek dla tego kursu i przenosi fiszki z powrotem do puli nieznanych. Kontynuować?",
      [
        { text: "Anuluj", style: "cancel" },
        { text: "Resetuj", style: "destructive", onPress: performResetBoxes },
      ]
    );
  };

  const performResetReviews = async () => {
    setResettingReviews(true);
    try {
      const deleted = await resetCustomReviewsForCourse(courseId);
      Alert.alert(
        "Zresetowano powtórki",
        deleted > 0
          ? `Usunięto ${deleted} wpisów powtórek tego kursu.`
          : "Nie było zapisanych powtórek do usunięcia."
      );
    } catch {
      Alert.alert("Błąd", "Nie udało się zresetować powtórek.");
    } finally {
      setResettingReviews(false);
    }
  };

  const handleResetReviews = () => {
    Alert.alert(
      "Reset powtórek",
      "Usuniesz zapisane powtórki dla tego kursu. Kontynuować?",
      [
        { text: "Anuluj", style: "cancel" },
        { text: "Resetuj", style: "destructive", onPress: performResetReviews },
      ]
    );
  };

  const performResetAll = async () => {
    setResettingAll(true);
    try {
      await AsyncStorage.removeItem(customBoxesStorageKey);
      await resetCustomReviewsForCourse(courseId);
      Alert.alert(
        "Reset całkowity",
        "Wyczyszczono pudełka, powtórki i przywrócono fiszki jako nieznane."
      );
    } catch {
      Alert.alert("Błąd", "Nie udało się wykonać pełnego resetu.");
    } finally {
      setResettingAll(false);
    }
  };

  const handleResetAll = () => {
    Alert.alert(
      "Reset całkowity",
      "Czyści pudełka, powtórki i przywraca wszystkie fiszki jako nieznane dla tego kursu. Kontynuować?",
      [
        { text: "Anuluj", style: "cancel" },
        { text: "Resetuj", style: "destructive", onPress: performResetAll },
      ]
    );
  };

  const handleDeleteCourse = () => {
    if (isOfficialCourse) {
      setPopup({
        message: "Nie można usunąć oficjalnego kursu",
        color: "angry",
        duration: 4000,
      });
      return;
    }

    Alert.alert(
      "Usuń kurs",
      "Czy na pewno chcesz usunąć ten kurs? Tego działania nie można cofnąć.",
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Usuń",
          style: "destructive",
          onPress: () => {
            if (isDeleting) return;
            void (async () => {
              setIsDeleting(true);
              try {
                await deleteCustomCourse(courseId);
                setPopup({
                  message: "Kurs został usunięty",
                  color: "calm",
                  duration: 3500,
                });
                router.back();
              } catch (error) {
                console.error("Failed to delete custom course", error);
                setPopup({
                  message: "Nie udało się usunąć kursu",
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
        message: "Podaj nazwę kursu",
        color: "angry",
        duration: 3000,
      });
      return;
    }

    const trimmedCards = manualCards.reduce<CustomFlashcardInput[]>(
      (acc, card) => {
      const frontText = card.front.trim();
      const answers = normalizeAnswers(card.answers);
      if (!frontText && answers.length === 0) {
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
      });
      return acc;
      },
      []
    );

    if (trimmedCards.length === 0) {
      setPopup({
        message: "Dodaj co najmniej jedną fiszkę",
        color: "angry",
        duration: 3000,
      });
      return;
    }

    await clearCustomReviewsForCourse(courseId);
    setIsSaving(true);
    try {
      await updateCustomCourse(courseId, {
        name: cleanName,
        iconId: iconId ?? "heart",
        iconColor,
        colorId: colorId ?? undefined,
        reviewsEnabled,
      });

      await replaceCustomFlashcards(courseId, trimmedCards);

      setPopup({
        message: "Zmiany zapisane!",
        color: "calm",
        duration: 3500,
      });
      router.back();
    } catch (error) {
      console.error("Failed to save custom course", error);
      setPopup({
        message: "Nie udało się zapisać zmian",
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
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.sectionCard}>
          <CourseNameField
            value={courseName}
            onChange={setCourseName}
            editable={!isOfficialCourse}
            disabled={isSaving || isDeleting}
          />
        </View>

        <View style={styles.sectionCard}>
          <CourseSettingsSection
            styles={styles}
            switchColors={{
              thumb: colors.background,
              trackFalse: colors.border,
              trackTrue: colors.my_green,
            }}
            colors={colors}
            boxZeroEnabled={courseBoxZeroEnabled}
            onToggleBoxZero={handleCourseBoxZeroToggle}
            autoflowEnabled={courseAutoflowEnabled}
            onToggleAutoflow={handleCourseAutoflowToggle}
            reviewsEnabled={reviewsEnabled}
            onToggleReviews={handleCourseReviewsToggle}
            skipCorrectionEnabled={courseSkipCorrectionEnabled}
            onToggleSkipCorrection={handleCourseSkipCorrectionToggle}
            skipCorrectionLocked={courseIsTrueFalseOnly}
            hideSkipCorrectionOption={courseIsTrueFalseOnly}
            showTrueFalseButtonsVariant={courseIsTrueFalseOnly}
            trueFalseButtonsVariant={courseTrueFalseButtonsVariant}
            onSelectTrueFalseButtonsVariant={handleCourseTrueFalseButtonsVariantChange}
            cardSize={courseCardSize}
            onSelectCardSize={handleCourseCardSizeChange}
            showImageSizeOptions={courseHasImageCards}
            imageSize={courseImageSize}
            onSelectImageSize={handleCourseImageSizeChange}
            imageSizeEnabled={imageSizeOptionsEnabled}
          />
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextWrapper}>
              <Text style={styles.toggleTitle}>Reset pudełek</Text>
              <Text style={styles.toggleSubtitle}>
                Czyści stan pudełek i przywraca fiszki do puli nieznanych.
              </Text>
            </View>
            <MyButton
              text={resettingBoxes ? "Resetuję..." : "Reset pudełek"}
              color="my_red"
              onPress={handleResetBoxes}
              disabled={resettingBoxes}
              width={150}
            />
          </View>
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextWrapper}>
              <Text style={styles.toggleTitle}>Reset powtórek</Text>
              <Text style={styles.toggleSubtitle}>
                Usuwa zapisane powtórki dla tego kursu.
              </Text>
            </View>
            <MyButton
              text={resettingReviews ? "Resetuję..." : "Reset powtórek"}
              color="my_red"
              onPress={handleResetReviews}
              disabled={resettingReviews}
              width={150}
            />
          </View>
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextWrapper}>
              <Text style={styles.toggleTitle}>Reset całkowity</Text>
              <Text style={styles.toggleSubtitle}>
                Czyści pudełka, powtórki i przywraca wszystkie fiszki jako nieznane.
              </Text>
            </View>
            <MyButton
              text={resettingAll ? "Resetuję..." : "Reset całkowity"}
              color="my_red"
              onPress={handleResetAll}
              disabled={resettingAll}
              width={150}
            />
          </View>
        </View>

        {!isOfficialCourse ? (
          <>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>wygląd</Text>
              <View style={styles.iconSelectorWrapper}>
                <CourseIconColorSelector
                  selectedIcon={iconId}
                  selectedColor={iconColor}
                  selectedColorId={colorId ?? undefined}
                  onIconChange={(value) => setIconId(value)}
                  onColorChange={handleColorChange}
                  disabled={isSaving}
                  styles={{
                    container: styles.iconSection,
                    iconsContainer: styles.iconsContainer,
                    iconWrapper: styles.iconWrapper,
                    iconWrapperSelected: styles.iconWrapperSelected,
                    colorsContainer: styles.colorsContainer,
                    colorSwatch: styles.courseColor,
                    colorSwatchSelected: styles.courseColorSelected,
                  }}
                />
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
                <>
                  <View style={styles.manualHeader}>
                    <Text style={styles.manualTitle}>fiszki</Text>
                    <Text style={styles.manualHint}>
                      Zmieniaj zawartość kursu
                    </Text>
                  </View>
                  <ManualCardsEditor
                    manualCards={manualCards}
                    cardType={manualCardType}
                    styles={{} as ManualCardsEditorStyles}
                    onCardFrontChange={handleManualCardFrontChange}
                    onCardAnswerChange={handleManualCardAnswerChange}
                    onAddAnswer={handleAddAnswer}
                    onRemoveAnswer={handleRemoveAnswer}
                    onAddCard={() => handleAddCard(manualCardType)}
                    onRemoveCard={handleRemoveCard}
                    onToggleFlipped={handleToggleFlipped}
                    onCardImageChange={
                      manualCardType === "image"
                        ? handleManualCardImageChange
                        : undefined
                    }
                  />
                </>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>

      <View style={styles.buttonscontainer}>
        <View style={styles.buttonsRow}>
          {!isOfficialCourse ? (
            <MyButton
              text="usuń"
              color="my_red"
              width={90}
              disabled={isSaving || isDeleting}
              onPress={handleDeleteCourse}
              accessibilityLabel="Usuń ten kurs"
            />
          ) : null}

          {/* separator rozciąga się i odsuwa prawą grupę na skraj */}
          <View style={styles.spacer} />

          <View style={styles.rightGroup}>
            {!isOfficialCourse && hasManualChanges ? (
              <>
                <MyButton
                  text="zapisz"
                  color="my_green"
                  width={90}
                  disabled={isSaving}
                  onPress={handleSave}
                  accessibilityLabel="Zapisz zmiany w kursie"
                />
                <MyButton
                  color="my_yellow"
                  width={60}
                  disabled={!hasManualChanges}
                  onPress={handleUndoManualChanges}
                  accessibilityLabel="Cofnij ostatnią zmianę w fiszkach"
                >
                  <Entypo name="ccw" size={32} color={colors.headline} />
                </MyButton>
              </>
            ) : null}

            <MyButton
              color="my_yellow"
              width={60}
              onPress={() => router.back()}
              accessibilityLabel="Wróć do panelu kursów"
            >
              <Ionicons name="arrow-back" size={32} color={colors.headline} />
            </MyButton>
          </View>
        </View>
      </View>
    </View>
  );
}
