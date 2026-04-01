import MyButton from "@/src/components/button/button";
import ToggleSwitch from "@/src/components/toggle/ToggleSwitch";
import { usePopup } from "@/src/contexts/PopupContext";
import { useSettings } from "@/src/contexts/SettingsContext";
import {
  getCustomCourseById,
  updateCustomCourse,
} from "@/src/db/sqlite/db";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useStyles } from "./CourseEntrySettingsScreen-styles";

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
  const styles = useStyles();
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
      <View style={styles.loadingContainer}>
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
        style={styles.contentContainer}
        contentContainerStyle={styles.contentContainerInner}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={styles.title}>Ustaw start nauki po swojemu</Text>
          <Text style={styles.lead}>
            Te opcje pokażą się tylko teraz. Później nadal zmienisz je w
            ustawieniach kursu.
          </Text>

          <View style={styles.options}>
            <View style={styles.option}>
              <View style={styles.optionMain}>
                <View style={styles.iconWrap}>
                  <Text style={styles.iconText}>⚡</Text>
                </View>
                <View style={styles.optionTextWrap}>
                  <Text style={styles.optionTitle}>Automat fiszek</Text>
                  <Text style={styles.optionDescription}>
                    Sam przełącza pudełka i dobiera kolejne fiszki podczas
                    nauki.
                  </Text>
                </View>
              </View>
              <View style={styles.switchWrap}>
                <ToggleSwitch
                  value={autoflowEnabled}
                  onPress={() => setAutoflowEnabledState((prev) => !prev)}
                  accessibilityLabel="Przełącz automat fiszek"
                />
              </View>
            </View>

            <View style={styles.option}>
              <View style={styles.optionMain}>
                <View style={styles.iconWrap}>
                  <Text style={styles.iconText}>🗓️</Text>
                </View>
                <View style={styles.optionTextWrap}>
                  <Text style={styles.optionTitle}>Codzienne powtórki</Text>
                  <Text style={styles.optionDescription}>
                    Dodaje fiszki z tego kursu do ogólnej sesji codziennych
                    powtórek.
                  </Text>
                </View>
              </View>
              <View style={styles.switchWrap}>
                <ToggleSwitch
                  value={reviewsEnabled}
                  onPress={() => setReviewsEnabled((prev) => !prev)}
                  accessibilityLabel="Przełącz codzienne powtórki"
                />
              </View>
            </View>

            <View style={styles.option}>
              <View style={styles.optionMain}>
                <View style={styles.iconWrap}>
                  <Text style={styles.iconText}>💡</Text>
                </View>
                <View style={styles.optionTextWrap}>
                  <Text style={styles.optionTitle}>Pokaż wyjaśnienia</Text>
                  <Text style={styles.optionDescription}>
                    Po odpowiedzi pokaże dodatkowe objaśnienie, jeśli fiszka je
                    posiada.
                  </Text>
                </View>
              </View>
              <View style={styles.switchWrap}>
                <ToggleSwitch
                  value={showExplanationEnabled}
                  onPress={() => setShowExplanationEnabledState((prev) => !prev)}
                  accessibilityLabel="Przełącz pokazywanie wyjaśnień"
                />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.buttonscontainer}>
        <View style={styles.buttonsRow}>
          <MyButton
            text={isSaving ? "TRWA ZAPIS..." : "ZACZYNAJMY"}
            color="my_green"
            onPress={handleContinue}
            disabled={isSaving}
            width={140}
            style={styles.ctaButton}
            pressedStyle={styles.ctaButtonPressed}
            textStyle={styles.ctaLabel}
            accessibilityLabel="Zapisz opcje startowe i przejdź do fiszek"
          />
        </View>
      </View>
    </View>
  );
}
