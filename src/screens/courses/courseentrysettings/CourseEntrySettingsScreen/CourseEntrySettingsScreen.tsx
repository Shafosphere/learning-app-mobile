import MyButton from "@/src/components/button/button";
import { useCoachmarkLayerPortal } from "@/src/components/onboarding/CoachmarkLayerPortal";
import { COURSE_ENTRY_SETTINGS_COACHMARK_STEPS } from "@/src/constants/coachmarkFlows";
import ToggleSwitch from "@/src/components/toggle/ToggleSwitch";
import { usePopup } from "@/src/contexts/PopupContext";
import { useSettings } from "@/src/contexts/SettingsContext";
import {
  getCustomCourseById,
  updateCustomCourse,
} from "@/src/db/sqlite/db";
import { useCoachmarkFlow } from "@/src/hooks/useCoachmarkFlow";
import {
  getOnboardingCheckpoint,
  setOnboardingCheckpoint,
} from "@/src/services/onboardingCheckpoint";
import { CoachmarkAnchor } from "@edwardloopez/react-native-coachmark";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
  const [startedInOnboarding, setStartedInOnboarding] = useState(false);
  useEffect(() => {
    let mounted = true;
    getOnboardingCheckpoint().then((checkpoint) => {
      if (!mounted) return;
      setStartedInOnboarding(checkpoint === "course_entry_settings_required");
    });
    return () => {
      mounted = false;
    };
  }, []);

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
            message: t(
              "screens.courses.courseentrysettings.courseEntrySettings.courseEntrySettings.message.nieUdaloSieZnalezcKursu"
            ),
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
          message: t(
            "screens.courses.courseentrysettings.courseEntrySettings.courseEntrySettings.message.nieUdaloSieWczytacUstawien"
          ),
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
    t,
  ]);

  const coachmark = useCoachmarkFlow({
    flowKey: "course-entry-settings-guided",
    storageKey: "@course_entry_settings_intro_seen_v1",
    shouldStart: startedInOnboarding,
    steps: COURSE_ENTRY_SETTINGS_COACHMARK_STEPS,
  });

  const coachmarkLayer = useMemo(
    () =>
      coachmark.isActive
        ? {
            currentStep: coachmark.currentStep,
            currentIndex: coachmark.currentIndex,
            totalSteps: coachmark.totalSteps,
            canGoBack: coachmark.canGoBack,
            canGoNext: coachmark.canGoNext,
            onBack: coachmark.goBack,
            onNext: coachmark.goNext,
          }
        : null,
    [
      coachmark.canGoBack,
      coachmark.canGoNext,
      coachmark.currentIndex,
      coachmark.currentStep,
      coachmark.goBack,
      coachmark.goNext,
      coachmark.isActive,
      coachmark.totalSteps,
    ],
  );

  useCoachmarkLayerPortal(
    "course-entry-settings-screen",
    coachmarkLayer,
  );

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
      if (startedInOnboarding) {
        await setOnboardingCheckpoint("done");
      }
      router.replace("/flashcards_custom");
    } catch (error) {
      console.error("Failed to save course entry settings", error);
      setPopup({
        message: t(
          "screens.courses.courseentrysettings.courseEntrySettings.courseEntrySettings.message.nieUdaloSieZapisacUstawien"
        ),
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
      <CoachmarkAnchor
        id="course-entry-settings-bubble-anchor"
        shape="rect"
        radius={12}
        style={{ position: "absolute", top: 1, left: 1, width: 1, height: 1 }}
      />
      <ScrollView
        style={styles.contentContainer}
        contentContainerStyle={styles.contentContainerInner}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!coachmark.currentStep?.scrollLocked}
        bounces={false}
        overScrollMode="never"
      >
        <View style={styles.content}>
          <Text style={styles.title}>
            {t(
              "screens.courses.courseentrysettings.courseEntrySettings.courseEntrySettings.textChild.ustawStartNaukiPoSwojemu"
            )}
          </Text>
          <Text style={styles.lead}>
            {t(
              "screens.courses.courseentrysettings.courseEntrySettings.courseEntrySettings.textChild.teOpcjePokazaSieTylko"
            )}
          </Text>

          <CoachmarkAnchor
            id="course-entry-settings-options"
            shape="rect"
            radius={24}
          >
            <View style={styles.options}>
              <View style={styles.option}>
                <View style={styles.optionMain}>
                  <View style={styles.iconWrap}>
                    <Text style={styles.iconText}>⚡</Text>
                  </View>
                  <View style={styles.optionTextWrap}>
                    <Text style={styles.optionTitle}>
                      {t(
                        "screens.courses.courseentrysettings.courseEntrySettings.courseEntrySettings.textChild.automatFiszek"
                      )}
                    </Text>
                    <Text style={styles.optionDescription}>
                      {t(
                        "screens.courses.courseentrysettings.courseEntrySettings.courseEntrySettings.textChild.samPrzelaczaPudelkaIDobiera"
                      )}
                    </Text>
                  </View>
                </View>
                <View style={styles.switchWrap}>
                  <ToggleSwitch
                    value={autoflowEnabled}
                    onPress={() => setAutoflowEnabledState((prev) => !prev)}
                    accessibilityLabel={t(
                      "screens.courses.courseentrysettings.courseEntrySettings.courseEntrySettings.accessibilityLabel.przelaczAutomatFiszek"
                    )}
                  />
                </View>
              </View>

              <View style={styles.option}>
                <View style={styles.optionMain}>
                  <View style={styles.iconWrap}>
                    <Text style={styles.iconText}>🗓️</Text>
                  </View>
                  <View style={styles.optionTextWrap}>
                    <Text style={styles.optionTitle}>
                      {t(
                        "screens.courses.courseentrysettings.courseEntrySettings.courseEntrySettings.textChild.codziennePowtorki"
                      )}
                    </Text>
                    <Text style={styles.optionDescription}>
                      {t(
                        "screens.courses.courseentrysettings.courseEntrySettings.courseEntrySettings.textChild.dodajeFiszkiZTegoKursu"
                      )}
                    </Text>
                  </View>
                </View>
                <View style={styles.switchWrap}>
                  <ToggleSwitch
                    value={reviewsEnabled}
                    onPress={() => setReviewsEnabled((prev) => !prev)}
                    accessibilityLabel={t(
                      "screens.courses.courseentrysettings.courseEntrySettings.courseEntrySettings.accessibilityLabel.przelaczCodziennePowtorki"
                    )}
                  />
                </View>
              </View>

              <View style={styles.option}>
                <View style={styles.optionMain}>
                  <View style={styles.iconWrap}>
                    <Text style={styles.iconText}>💡</Text>
                  </View>
                  <View style={styles.optionTextWrap}>
                    <Text style={styles.optionTitle}>
                      {t(
                        "screens.courses.courseentrysettings.courseEntrySettings.courseEntrySettings.textChild.pokazWyjasnienia"
                      )}
                    </Text>
                    <Text style={styles.optionDescription}>
                      {t(
                        "screens.courses.courseentrysettings.courseEntrySettings.courseEntrySettings.textChild.poOdpowiedziPokazeDodatkoweObjasnienie"
                      )}
                    </Text>
                  </View>
                </View>
                <View style={styles.switchWrap}>
                  <ToggleSwitch
                    value={showExplanationEnabled}
                    onPress={() => setShowExplanationEnabledState((prev) => !prev)}
                    accessibilityLabel={t(
                      "screens.courses.courseentrysettings.courseEntrySettings.courseEntrySettings.accessibilityLabel.przelaczPokazywanieWyjasnien"
                    )}
                  />
                </View>
              </View>
            </View>
          </CoachmarkAnchor>
        </View>
      </ScrollView>

      <View style={styles.buttonscontainer}>
        <View style={styles.buttonsRow}>
          <CoachmarkAnchor
            id="course-entry-settings-next-button"
            shape="rect"
            radius={18}
            padding={2}
            style={{ alignSelf: "flex-end" }}
          >
            <MyButton
              text={t(
                isSaving
                  ? "screens.courses.courseentrysettings.courseEntrySettings.courseEntrySettings.text.trwaZapis"
                  : "screens.courses.courseentrysettings.courseEntrySettings.courseEntrySettings.text.zaczynajmy"
              )}
              color="my_green"
              onPress={() => {
                if (coachmark.isActive) {
                  void coachmark.advanceByEvent("press_next").then((allowed) => {
                    if (!allowed) return;
                    void handleContinue();
                  });
                  return;
                }
                void handleContinue();
              }}
              width={140}
              style={styles.ctaButton}
              pressedStyle={styles.ctaButtonPressed}
              textStyle={styles.ctaLabel}
              accessibilityLabel={t(
                "screens.courses.courseentrysettings.courseEntrySettings.courseEntrySettings.accessibilityLabel.zapiszOpcjeStartoweIPrzejdz"
              )}
              disabled={isSaving}
            />
          </CoachmarkAnchor>
        </View>
      </View>
    </View>
  );
}
