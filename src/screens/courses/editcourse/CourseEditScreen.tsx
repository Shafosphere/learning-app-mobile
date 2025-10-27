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
import CourseIconColorSelector from "@/src/screens/courses/editcourse/components/iconEdit/iconEdit";
import { CourseSettingsSection } from "@/src/screens/courses/editcourse/components/SettingsCourse";
import { CourseNameField } from "@/src/screens/courses/editcourse/components/nameEdit/nameEdit";
import { useCourseEditStyles } from "@/src/screens/courses/editcourse/CourseEditScreen-styles";
import type { CEFRLevel } from "@/src/types/language";
import Entypo from "@expo/vector-icons/Entypo";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextStyle,
  View,
} from "react-native";

type CourseEditParams = {
  id?: string | string[];
  name?: string | string[];
  lockAppearance?: string | string[];
  sourceLang?: string | string[];
  targetLang?: string | string[];
  level?: string | string[];
};

function getFirstParamValue(value: string | string[] | undefined): string | null {
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

type CustomProps = {
  courseId: number;
  initialName: string;
  lockAppearance: boolean;
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

function BuiltinCourseEditor({ courseName, sourceLang, targetLang, level }: BuiltinProps) {
  const styles = useCourseEditStyles();
  const router = useRouter();
  const {
    colors,
    getBuiltinCourseBoxZeroEnabled,
    setBuiltinCourseBoxZeroEnabled,
    getBuiltinCourseAutoflowEnabled,
    setBuiltinCourseAutoflowEnabled,
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
  const [reviewsEnabled, setReviewsEnabled] = useState(true);

  const languagePair = useMemo(() => {
    if (!sourceLang && !targetLang) {
      return null;
    }
    const from = sourceLang ? sourceLang.toUpperCase() : "???";
    const to = targetLang ? targetLang.toUpperCase() : "???";
    return `${from} → ${to}`;
  }, [sourceLang, targetLang]);

  const handleBoxZeroToggle = async (value: boolean) => {
    setBoxZeroEnabled(value);
    await setBuiltinCourseBoxZeroEnabled(
      { sourceLang: normalizedSource, targetLang: normalizedTarget, level: normalizedLevel },
      value
    );
  };

  const handleAutoflowToggle = async (value: boolean) => {
    setAutoflowEnabled(value);
    await setBuiltinCourseAutoflowEnabled(
      { sourceLang: normalizedSource, targetLang: normalizedTarget, level: normalizedLevel },
      value
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>USTAWIENIA KURSU</Text>
          {languagePair ? (
            <Text style={styles.sectionDescription}>{`Para języków: ${languagePair}`}</Text>
          ) : null}
          {level ? (
            <Text style={styles.sectionDescription}>{`Poziom: ${level}`}</Text>
          ) : null}
          <CourseNameField value={courseName} onChange={() => {}} editable={false} disabled />
        </View>

        <View style={styles.sectionCard}>
          <CourseSettingsSection
            styles={styles}
            switchColors={{ thumb: colors.background, trackFalse: colors.border, trackTrue: colors.my_green }}
            boxZeroEnabled={boxZeroEnabled}
            onToggleBoxZero={handleBoxZeroToggle}
            autoflowEnabled={autoflowEnabled}
            onToggleAutoflow={handleAutoflowToggle}
            reviewsEnabled={reviewsEnabled}
            onToggleReviews={setReviewsEnabled}
          />
        </View>
      </ScrollView>

      <View style={styles.buttonscontainer}>
        <View style={styles.buttonsRow}>
          <MyButton
            color="my_yellow"
            width={60}
            onPress={() => router.back()}
            accessibilityLabel="Wróć do panelu kursów"
          >
            <Ionicons name="arrow-back" size={28} color={colors.headline} />
          </MyButton>
        </View>
      </View>
    </View>
  );
}

function CustomCourseEditor({ courseId, initialName, lockAppearance }: CustomProps) {
  const styles = useCourseEditStyles();
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

  const [courseBoxZeroEnabled, setCourseBoxZeroEnabled] = useState(initialBoxZeroEnabled);
  const [courseAutoflowEnabled, setCourseAutoflowEnabled] = useState(initialAutoflowEnabled);
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
        const answersSource = card.answers && card.answers.length > 0 ? card.answers : [card.backText ?? ""];
        const normalizedAnswersList = normalizeAnswers(answersSource);
        const answers = normalizedAnswersList.length > 0 ? normalizedAnswersList : [""];
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

  const undoButtonColor =
    (styles.manualHistoryButtonText as TextStyle)?.color ?? colors.headline;

  const hasManualChanges = canUndo;

  const handleUndoManualChanges = () => {
    if (!canUndo) return;
    undo();
    setPopup({ message: "Cofnięto ostatnią zmianę", color: "my_yellow", duration: 2500 });
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
      setPopup({ message: "Nie można usunąć oficjalnego kursu", color: "my_red", duration: 4000 });
      return;
    }

    Alert.alert("Usuń kurs", "Czy na pewno chcesz usunąć ten kurs? Tego działania nie można cofnąć.", [
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
              setPopup({ message: "Kurs został usunięty", color: "my_green", duration: 3500 });
              router.back();
            } catch (error) {
              console.error("Failed to delete custom course", error);
              setPopup({ message: "Nie udało się usunąć kursu", color: "my_red", duration: 4000 });
            } finally {
              setIsDeleting(false);
            }
          })();
        },
      },
    ]);
  };

  const handleSave = async () => {
    const cleanName = courseName.trim();
    if (!cleanName) {
      setPopup({ message: "Podaj nazwę kursu", color: "my_red", duration: 3000 });
      return;
    }

    const trimmedCards = manualCards.reduce<
      { frontText: string; backText: string; answers: string[]; position: number; flipped: boolean }[]
    >((acc, card) => {
      const frontText = card.front.trim();
      const answers = normalizeAnswers(card.answers);
      if (!frontText && answers.length === 0) {
        return acc;
      }
      const backText = answers[0] ?? "";
      acc.push({ frontText, backText, answers, position: acc.length, flipped: card.flipped });
      return acc;
    }, []);

    if (trimmedCards.length === 0) {
      setPopup({ message: "Dodaj co najmniej jedną fiszkę", color: "my_red", duration: 3000 });
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

      setPopup({ message: "Zmiany zapisane!", color: "my_green", duration: 3500 });
      router.back();
    } catch (error) {
      console.error("Failed to save custom course", error);
      setPopup({ message: "Nie udało się zapisać zmian", color: "my_red", duration: 4000 });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
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
            switchColors={{ thumb: colors.background, trackFalse: colors.border, trackTrue: colors.my_green }}
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
                <Text style={{ color: "#ff5470", fontSize: 16 }}>{loadError}</Text>
              ) : (
                <>
                  <View style={styles.manualHeader}>
                    <Text style={styles.manualTitle}>fiszki</Text>
                    <Text style={styles.manualHint}>Zmieniaj zawartość kursu</Text>
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
                  <View style={styles.manualHistoryRow}>
                    <Pressable
                      style={[
                        styles.manualHistoryButton,
                        !hasManualChanges && styles.manualHistoryButtonDisabled,
                      ]}
                      disabled={!hasManualChanges}
                      onPress={handleUndoManualChanges}
                      accessibilityRole="button"
                      accessibilityLabel="Cofnij ostatnią zmianę w fiszkach"
                    >
                      <Entypo name="ccw" size={18} color={undoButtonColor} />
                      <Text style={styles.manualHistoryButtonText}>Cofnij</Text>
                    </Pressable>
                  </View>
                  <View style={styles.footerButtons}>
                    <MyButton
                      text="zapisz"
                      color="my_green"
                      width={120}
                      disabled={isSaving}
                      onPress={handleSave}
                      accessibilityLabel="Zapisz zmiany w kursie"
                    />
                    <MyButton
                      text="usuń"
                      color="my_red"
                      width={120}
                      disabled={isSaving || isDeleting}
                      onPress={handleDeleteCourse}
                      accessibilityLabel="Usuń ten kurs"
                    />
                  </View>
                </>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>

            <View style={styles.buttonscontainer}>
        <View style={styles.buttonsRow}>
          <MyButton
            color="my_yellow"
            width={60}
            onPress={() => router.back()}
            accessibilityLabel="Wróć do panelu kursów"
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
  return (
    <View style={[styles.container, { justifyContent: "center", alignItems: "center", padding: 24 }]}> 
      <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 16 }}>
        Nie znaleziono danych kursu.
      </Text>
      <MyButton text="wróć" color="my_yellow" width={120} onPress={() => router.back()} />
    </View>
  );
}
