import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextStyle,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import Entypo from "@expo/vector-icons/Entypo";
import MyButton from "@/src/components/button/button";
import { useEditStyles } from "./EditCustomCourseScreen-styles";
import { usePopup } from "@/src/contexts/PopupContext";
import {
  clearCustomReviewsForCourse,
  getCustomFlashcards,
  getCustomCourseById,
  replaceCustomFlashcards,
  updateCustomCourse,
} from "@/src/db/sqlite/db";
import { DEFAULT_COURSE_COLOR } from "@/src/constants/customCourse";
import { CustomCourseForm } from "@/src/components/customCourse/form/CustomCourseForm";
import { useCustomCourseFormStyles } from "@/src/components/customCourse/form/CustomCourseForm-styles";
import { useCustomCourseDraft } from "@/src/hooks/useCustomCourseDraft";
import {
  ManualCardsEditor,
  ManualCardsEditorStyles,
} from "@/src/features/customCourse/manualCards/ManualCardsEditor";
import {
  createEmptyManualCard,
  ensureCardsNormalized,
  normalizeAnswers,
  useManualCardsForm,
} from "@/src/features/customCourse/manualCards/useManualCardsForm";

const MANUAL_HISTORY_LIMIT = 50;

export default function EditCustomCourseScreen() {
  const styles = useEditStyles();
  const formStyles = useCustomCourseFormStyles();
  const params = useLocalSearchParams();
  const router = useRouter();
  const setPopup = usePopup();

  const courseId = useMemo(() => {
    const raw = params.id;
    const value = Array.isArray(raw) ? raw[0] : raw;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [params.id]);

  const initialName = useMemo(() => {
    const raw = params.name;
    const value = Array.isArray(raw) ? raw[0] : raw;
    const str = (value ?? "").toString();
    try {
      return decodeURIComponent(str);
    } catch {
      return str;
    }
  }, [params.name]);

  const {
    courseName,
    setCourseName,
    iconId,
    setIconId,
    iconColor,
    colorId,
    reviewsEnabled,
    toggleReviewsEnabled,
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
    canUndo,
    undo,
  } = useManualCardsForm({
    initialCards: [createEmptyManualCard("card-0")],
    enableHistory: true,
    historyLimit: MANUAL_HISTORY_LIMIT,
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const hydrateFromDb = useCallback(async () => {
    if (!courseId) {
      setLoadError("Nie znaleziono kursu do edycji.");
      setLoading(false);
      return;
    }
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
        };
      });
      const normalizedCards = ensureCardsNormalized(incomingCards);
      replaceManualCards(normalizedCards);
    } catch (error) {
      console.error("Failed to load custom course for edit", error);
      setLoadError("Nie udało się wczytać danych kursu.");
    } finally {
      setLoading(false);
    }
  }, [hydrateDraft, courseId, replaceManualCards]);

  useFocusEffect(
    useCallback(() => {
      void hydrateFromDb();
    }, [hydrateFromDb])
  );

  const undoButtonColor =
    (styles.manualAddIcon as TextStyle)?.color ??
    (styles.cardActionIcon as TextStyle)?.color ??
    "black";

  const hasManualChanges = canUndo;

  const handleUndoManualChanges = () => {
    if (!canUndo) {
      return;
    }

    undo();
    setPopup({
      message: "Cofnięto ostatnią zmianę",
      color: "my_yellow",
      duration: 2500,
    });
  };

  const handleSave = async () => {
    if (!courseId) {
      setPopup({
        message: "Nie można zapisać – brak identyfikatora kursu",
        color: "my_red",
        duration: 4000,
      });
      return;
    }

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

    setIsSaving(true);
    try {
      await updateCustomCourse(courseId, {
        name: cleanName,
        iconId: iconId ?? "heart",
        iconColor,
        colorId: colorId ?? undefined,
        reviewsEnabled,
      });

      if (!reviewsEnabled) {
        await clearCustomReviewsForCourse(courseId);
      }

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
        {loading ? (
          <View style={formStyles.section}>
            <Text style={formStyles.sectionHeader}>EDYTUJ PROFIL</Text>
            <View style={{ alignItems: "center", paddingVertical: 32 }}>
              <ActivityIndicator size="large" />
            </View>
          </View>
        ) : loadError ? (
          <View style={formStyles.section}>
            <Text style={formStyles.sectionHeader}>EDYTUJ PROFIL</Text>
            <Text style={{ color: "#ff5470", fontSize: 16 }}>{loadError}</Text>
          </View>
        ) : (
          <CustomCourseForm
            title="EDYTUJ PROFIL"
            courseName={courseName}
            onCourseNameChange={setCourseName}
            reviewsEnabled={reviewsEnabled}
            onToggleReviews={toggleReviewsEnabled}
            iconId={iconId}
            iconColor={iconColor}
            colorId={colorId}
            onIconChange={(value) => setIconId(value)}
            onColorChange={handleColorChange}
            disabled={isSaving}
          >
            <Text style={styles.miniSectionHeader}>fiszki</Text>
            <ManualCardsEditor
              manualCards={manualCards}
              styles={styles as unknown as ManualCardsEditorStyles}
              onCardFrontChange={handleManualCardFrontChange}
              onCardAnswerChange={handleManualCardAnswerChange}
              onAddAnswer={handleAddAnswer}
              onRemoveAnswer={handleRemoveAnswer}
              onAddCard={handleAddCard}
              onRemoveCard={handleRemoveCard}
            />
          </CustomCourseForm>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <MyButton
          color="my_yellow"
          // width={56}
          onPress={() => router.back()}
          accessibilityLabel="Wróć do panelu kursów"
        >
          <Entypo
            name="arrow-long-left"
            size={50}
            color={undoButtonColor}
          />
        </MyButton>
        <View style={styles.rightButtons}>
          {hasManualChanges ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cofnij zmiany fiszek"
              style={styles.undoButton}
              onPress={handleUndoManualChanges}
            >
              <FontAwesome
                name="undo"
                size={24}
                color={undoButtonColor}
                style={styles.manualAddIcon}
              />
            </Pressable>
          ) : null}
          <MyButton
            text="zapisz"
            color="my_green"
            onPress={handleSave}
            disabled={isSaving || loading || !!loadError}
            accessibilityLabel="Zapisz zmiany kursu"
          />
        </View>
      </View>
    </View>
  );
}
