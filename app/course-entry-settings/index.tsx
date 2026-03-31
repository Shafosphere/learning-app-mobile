import MyButton from "@/src/components/button/button";
import { usePopup } from "@/src/contexts/PopupContext";
import { useSettings } from "@/src/contexts/SettingsContext";
import {
  getCustomCourseById,
  updateCustomCourse,
} from "@/src/db/sqlite/db";
import { useCourseEditStyles } from "@/src/screens/courses/editcourse/CourseEditScreen-styles";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Switch, Text, View } from "react-native";

type CourseState = {
  id: number;
  name: string;
  iconId: string;
  iconColor: string;
  colorId: string | null;
  reviewsEnabled: boolean;
};

export default function CourseEntrySettingsScreen() {
  const router = useRouter();
  const styles = useCourseEditStyles();
  const setPopup = usePopup();
  const {
    colors,
    activeCustomCourseId,
    getCustomCourseAutoflowEnabled,
    setCustomCourseAutoflowEnabled,
    getCustomCourseShowExplanationEnabled,
    setCustomCourseShowExplanationEnabled,
    hasSeenCustomCourseEntrySettings,
    markCustomCourseEntrySettingsSeen,
  } = useSettings();
  const [course, setCourse] = useState<CourseState | null>(null);
  const [autoflowEnabled, setAutoflowEnabledState] = useState(true);
  const [reviewsEnabled, setReviewsEnabled] = useState(true);
  const [showExplanationEnabled, setShowExplanationEnabledState] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const switchColors = {
    thumb: colors.background,
    trackFalse: colors.border,
    trackTrue: colors.my_green,
  };

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (activeCustomCourseId == null) {
        router.replace("/coursepanel");
        return;
      }

      if (hasSeenCustomCourseEntrySettings(activeCustomCourseId)) {
        router.replace("/flashcards_custom");
        return;
      }

      try {
        const courseRow = await getCustomCourseById(activeCustomCourseId);
        if (!isMounted) {
          return;
        }
        if (!courseRow) {
          setPopup({
            message: "Nie udało się znaleźć kursu",
            color: "angry",
            duration: 3000,
          });
          router.replace("/coursepanel");
          return;
        }

        setCourse({
          id: courseRow.id,
          name: courseRow.name,
          iconId: courseRow.iconId,
          iconColor: courseRow.iconColor,
          colorId: courseRow.colorId ?? null,
          reviewsEnabled: courseRow.reviewsEnabled,
        });
        setAutoflowEnabledState(getCustomCourseAutoflowEnabled(courseRow.id));
        setReviewsEnabled(courseRow.reviewsEnabled);
        setShowExplanationEnabledState(
          getCustomCourseShowExplanationEnabled(courseRow.id)
        );
      } catch (error) {
        console.error("Failed to load course entry settings", error);
        setPopup({
          message: "Nie udało się wczytać ustawień kursu",
          color: "angry",
          duration: 3500,
        });
        router.replace("/coursepanel");
        return;
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [
    activeCustomCourseId,
    getCustomCourseAutoflowEnabled,
    getCustomCourseShowExplanationEnabled,
    hasSeenCustomCourseEntrySettings,
    router,
    setPopup,
  ]);

  const handleContinue = async () => {
    if (!course || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      await Promise.all([
        setCustomCourseAutoflowEnabled(course.id, autoflowEnabled),
        setCustomCourseShowExplanationEnabled(course.id, showExplanationEnabled),
        updateCustomCourse(course.id, {
          name: course.name,
          iconId: course.iconId,
          iconColor: course.iconColor,
          colorId: course.colorId ?? undefined,
          reviewsEnabled,
        }),
      ]);
      await markCustomCourseEntrySettingsSeen(course.id);
      router.replace("/flashcards_custom");
    } catch (error) {
      console.error("Failed to save course entry settings", error);
      setPopup({
        message: "Nie udało się zapisać ustawień kursu",
        color: "angry",
        duration: 3500,
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          { alignItems: "center", justifyContent: "center", padding: 24 },
        ]}
      >
        <ActivityIndicator size="large" color={colors.headline} />
      </View>
    );
  }

  if (!course) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>ustawienia kursu</Text>
          <Text style={styles.sectionDescription}>
            Ustaw, jak chcesz zacząć naukę w kursie {course.name}.
          </Text>

          <View style={styles.sectionGroup}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleTextWrapper}>
                <Text style={styles.toggleTitle}>Automat fiszek</Text>
                <Text style={styles.toggleSubtitle}>
                  Automatycznie przełączaj pudełka i pobieraj nowe słowa.
                </Text>
              </View>
              <Switch
                value={autoflowEnabled}
                onValueChange={setAutoflowEnabledState}
                trackColor={{
                  false: switchColors.trackFalse,
                  true: switchColors.trackTrue,
                }}
                thumbColor={switchColors.thumb}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleTextWrapper}>
                <Text style={styles.toggleTitle}>Włącz powtórki</Text>
                <Text style={styles.toggleSubtitle}>
                  Dodaj fiszki z tego kursu do codziennych powtórek.
                </Text>
              </View>
              <Switch
                value={reviewsEnabled}
                onValueChange={setReviewsEnabled}
                trackColor={{
                  false: switchColors.trackFalse,
                  true: switchColors.trackTrue,
                }}
                thumbColor={switchColors.thumb}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleTextWrapper}>
                <Text style={styles.toggleTitle}>Wyświetlaj wyjaśnienie</Text>
                <Text style={styles.toggleSubtitle}>
                  Pokazuj wyjaśnienie po odpowiedzi, jeśli fiszka je posiada.
                </Text>
              </View>
              <Switch
                value={showExplanationEnabled}
                onValueChange={setShowExplanationEnabledState}
                trackColor={{
                  false: switchColors.trackFalse,
                  true: switchColors.trackTrue,
                }}
                thumbColor={switchColors.thumb}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.buttonscontainer}>
        <View style={styles.buttonsRow}>
          <MyButton
            text={isSaving ? "zapis..." : "dalej"}
            color="my_green"
            onPress={handleContinue}
            disabled={isSaving}
            width={120}
            accessibilityLabel="Zapisz ustawienia kursu i przejdź do fiszek"
          />
        </View>
      </View>
    </View>
  );
}
