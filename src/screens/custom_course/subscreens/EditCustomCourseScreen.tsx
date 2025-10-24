import MyButton from "@/src/components/button/button";
import {
  ManualCardsEditor,
  ManualCardsEditorStyles,
} from "@/src/components/customCourse/cardEdit/ManualCardsEditor";
import { CustomCourseForm } from "@/src/components/customCourse/form/CustomCourseForm";
import { useCustomCourseFormStyles } from "@/src/components/customCourse/form/CustomCourseForm-styles";
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
import Entypo from "@expo/vector-icons/Entypo";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextStyle,
  View,
} from "react-native";
import { useEditStyles } from "./EditCustomCourseScreen-styles";

const MANUAL_HISTORY_LIMIT = 50;

export default function EditCustomCourseScreen() {
  const styles = useEditStyles();
  const formStyles = useCustomCourseFormStyles();
  const params = useLocalSearchParams();
  const router = useRouter();
  const setPopup = usePopup();
  const {
    colors,
    getCustomCourseBoxZeroEnabled,
    setCustomCourseBoxZeroEnabled,
  } = useSettings();

  const lockAppearance = useMemo(() => {
    const raw = params.lockAppearance;
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (!value) {
      return false;
    }
    const normalized = value.toString().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes";
  }, [params.lockAppearance]);

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
    handleToggleFlipped,
    canUndo,
    undo,
  } = useManualCardsForm({
    initialCards: [createEmptyManualCard("card-0")],
    enableHistory: true,
    historyLimit: MANUAL_HISTORY_LIMIT,
  });
  const initialBoxZeroEnabled = useMemo(() => {
    if (courseId != null) {
      return getCustomCourseBoxZeroEnabled(courseId);
    }
    return true;
  }, [courseId, getCustomCourseBoxZeroEnabled]);
  const [courseBoxZeroEnabled, setCourseBoxZeroEnabled] = useState<boolean>(
    initialBoxZeroEnabled
  );
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isOfficialCourse, setIsOfficialCourse] = useState(lockAppearance);

  const hydrateFromDb = useCallback(async () => {
    if (!courseId) {
      setLoadError("Nie znaleziono kursu do edycji.");
      setCourseBoxZeroEnabled(initialBoxZeroEnabled);
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
        setIsOfficialCourse(lockAppearance);
        setCourseBoxZeroEnabled(initialBoxZeroEnabled);
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
      setCourseBoxZeroEnabled(
        getCustomCourseBoxZeroEnabled(courseRow.id)
      );

      console.log('Loading cards from DB:', cardRows);
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
      const normalizedCards = ensureCardsNormalized(incomingCards);
      console.log('Normalized cards:', normalizedCards);
      replaceManualCards(normalizedCards);
    } catch (error) {
      console.error("Failed to load custom course for edit", error);
      setLoadError("Nie udało się wczytać danych kursu.");
      setIsOfficialCourse(lockAppearance);
      setCourseBoxZeroEnabled(initialBoxZeroEnabled);
    } finally {
      setLoading(false);
    }
  }, [
    courseId,
    getCustomCourseBoxZeroEnabled,
    hydrateDraft,
    initialBoxZeroEnabled,
    lockAppearance,
    replaceManualCards,
  ]);

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

  const handleCourseBoxZeroToggle = async (value: boolean) => {
    setCourseBoxZeroEnabled(value);
    if (courseId != null) {
      await setCustomCourseBoxZeroEnabled(courseId, value);
    }
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
    if (!courseId) {
      setPopup({
        message: "Nie można usunąć – brak identyfikatora kursu",
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
            if (isDeleting) {
              return;
            }

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

      if (!reviewsEnabled) {
      }

      console.log('Saving cards to DB:', trimmedCards);
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
            <Text style={formStyles.sectionHeader}>EDYTUJ KURS</Text>
            <View style={{ alignItems: "center", paddingVertical: 32 }}>
              <ActivityIndicator size="large" />
            </View>
          </View>
        ) : loadError ? (
          <View style={formStyles.section}>
            <Text style={formStyles.sectionHeader}>EDYTUJ KURS</Text>
            <Text style={{ color: "#ff5470", fontSize: 16 }}>{loadError}</Text>
          </View>
        ) : (
          <CustomCourseForm
            title="EDYTUJ KURS"
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
            nameEditable={!isOfficialCourse}
            hideIconSection={isOfficialCourse}
          >
            <View style={styles.toggleRow}>
              <View style={styles.toggleTextWrapper}>
                <Text style={styles.toggleTitle}>Faza zapoznania (Box 0)</Text>
                <Text style={styles.toggleSubtitle}>
                  Steruj tylko dla tego kursu.
                </Text>
              </View>
              <Switch
                value={courseBoxZeroEnabled}
                onValueChange={handleCourseBoxZeroToggle}
                trackColor={{
                  false: colors.border,
                  true: colors.my_green,
                }}
                thumbColor={colors.background}
              />
            </View>
            {isOfficialCourse ? (
              <Text style={styles.miniSectionHeader}>
                Więcej ustawień kursu pojawi się już wkrótce.
              </Text>
            ) : (
              <>
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
                  onToggleFlipped={handleToggleFlipped}
                />
              </>
            )}
          </CustomCourseForm>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <MyButton
          color="my_yellow"
          width={60}
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
                color={colors.my_yellow}
                style={styles.manualAddIcon}
              />
            </Pressable>
          ) : null}
          {courseId ? (
            <MyButton
              text="usuń"
              color="my_red"
              onPress={handleDeleteCourse}
              width={100}
              disabled={
                isSaving ||
                loading ||
                isDeleting ||
                !!loadError ||
                isOfficialCourse
              }
              accessibilityLabel="Usuń kurs"
            />
          ) : null}
          <MyButton
            text="zapisz"
            color="my_green"
            onPress={handleSave}
            width={100}
            disabled={isSaving || loading || !!loadError}
            accessibilityLabel="Zapisz zmiany kursu"
          />
        </View>
      </View>
    </View>
  );
}
