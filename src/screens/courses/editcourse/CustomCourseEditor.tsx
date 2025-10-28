import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";
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
  updateCustomCourse,
} from "@/src/db/sqlite/db";
import { useCustomCourseDraft } from "@/src/hooks/useCustomCourseDraft";
import {
  createEmptyManualCard,
  ensureCardsNormalized,
  normalizeAnswers,
  useManualCardsForm,
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
    canUndo,
    undo,
  } = useManualCardsForm({
    initialCards: [createEmptyManualCard("card-0")],
    enableHistory: true,
    historyLimit: 50,
  });

  const initialBoxZeroEnabled = useMemo(
    () => getCustomCourseBoxZeroEnabled(courseId),
    [courseId, getCustomCourseBoxZeroEnabled]
  );
  const initialAutoflowEnabled = useMemo(
    () => getCustomCourseAutoflowEnabled(courseId),
    [courseId, getCustomCourseAutoflowEnabled]
  );

  const [courseBoxZeroEnabled, setCourseBoxZeroEnabled] = useState(
    initialBoxZeroEnabled
  );
  const [courseAutoflowEnabled, setCourseAutoflowEnabled] = useState(
    initialAutoflowEnabled
  );
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isOfficialCourse, setIsOfficialCourse] = useState(lockAppearance);

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
        };
      });
      replaceManualCards(ensureCardsNormalized(incomingCards));
    } catch (error) {
      console.error("Failed to load custom course for edit", error);
      setLoadError("Nie udało się wczytać danych kursu.");
      setIsOfficialCourse(lockAppearance);
      setCourseBoxZeroEnabled(initialBoxZeroEnabled);
      setCourseAutoflowEnabled(initialAutoflowEnabled);
    } finally {
      setLoading(false);
    }
  }, [
    courseId,
    getCustomCourseAutoflowEnabled,
    getCustomCourseBoxZeroEnabled,
    hydrateDraft,
    initialAutoflowEnabled,
    initialBoxZeroEnabled,
    lockAppearance,
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
      color: "my_yellow",
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

  const handleCourseReviewsToggle = (value: boolean) => {
    setReviewsEnabled(value);
  };

  const handleDeleteCourse = () => {
    if (isOfficialCourse) {
      setPopup({
        message: "Nie można usunąć oficjalnego kursu",
        color: "my_red",
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
                  color: "my_green",
                  duration: 3500,
                });
                router.back();
              } catch (error) {
                console.error("Failed to delete custom course", error);
                setPopup({
                  message: "Nie udało się usunąć kursu",
                  color: "my_red",
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
        color: "my_red",
        duration: 3000,
      });
      return;
    }

    const trimmedCards = manualCards.reduce<
      {
        frontText: string;
        backText: string;
        answers: string[];
        position: number;
        flipped: boolean;
      }[]
    >((acc, card) => {
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
      });
      return acc;
    }, []);

    if (trimmedCards.length === 0) {
      setPopup({
        message: "Dodaj co najmniej jedną fiszkę",
        color: "my_red",
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
        color: "my_green",
        duration: 3500,
      });
      router.back();
    } catch (error) {
      console.error("Failed to save custom course", error);
      setPopup({
        message: "Nie udało się zapisać zmian",
        color: "my_red",
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
            boxZeroEnabled={courseBoxZeroEnabled}
            onToggleBoxZero={handleCourseBoxZeroToggle}
            autoflowEnabled={courseAutoflowEnabled}
            onToggleAutoflow={handleCourseAutoflowToggle}
            reviewsEnabled={reviewsEnabled}
            onToggleReviews={handleCourseReviewsToggle}
          />
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
                    styles={{} as ManualCardsEditorStyles}
                    onCardFrontChange={handleManualCardFrontChange}
                    onCardAnswerChange={handleManualCardAnswerChange}
                    onAddAnswer={handleAddAnswer}
                    onRemoveAnswer={handleRemoveAnswer}
                    onAddCard={handleAddCard}
                    onRemoveCard={handleRemoveCard}
                    onToggleFlipped={handleToggleFlipped}
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
