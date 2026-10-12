import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, View, Text } from "react-native";
import * as Haptics from "expo-haptics";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useStyles } from "@/src/screens/settings/SettingsScreen/SettingsScreen-styles";
import { useTranslation } from "react-i18next";
import ToggleRow from "@/src/components/toggle/ToggleRow";
import { preventWidowsPl } from "@/src/utils/preventWidowsPl";
import { TrackSlider } from "@/src/components/slider/TrackSlider";

const formatReminderHour = (hour: number) => {
  const normalized = Math.min(23, Math.max(0, Math.round(hour)));
  return `${String(normalized).padStart(2, "0")}:00`;
};

const LearningSection: React.FC = () => {
  const styles = useStyles();
  const { t } = useTranslation();
  const {
    colors,
    spellChecking,
    toggleSpellChecking,
    ignoreDiacriticsInSpellcheck,
    toggleIgnoreDiacriticsInSpellcheck,
    autoConvertSpanishPunctuation,
    toggleAutoConvertSpanishPunctuation,
    ignoreBoundaryPunctuation,
    toggleIgnoreBoundaryPunctuation,
    flashcardsSuggestionsEnabled,
    toggleFlashcardsSuggestions,
    autoSubmitCorrectAnswer,
    toggleAutoSubmitCorrectAnswer,
    skipCorrectionDefaultEnabled,
    setSkipCorrectionDefaultEnabled,
    learningRemindersEnabled,
    toggleLearningRemindersEnabled,
    learningReminderAutomaticEnabled,
    setLearningReminderAutomaticEnabled,
    learningReminderManualHour,
    setLearningReminderManualHour,
    learningReminderPermissionState,
    feedbackEnabled,
  } = useSettings();
  const shouldShowManualTime =
    learningRemindersEnabled && !learningReminderAutomaticEnabled;
  const [manualHourPreview, setManualHourPreview] = useState(
    learningReminderManualHour
  );
  const [manualTimeMounted, setManualTimeMounted] = useState(shouldShowManualTime);
  const manualTimeAnim = useRef(new Animated.Value(shouldShowManualTime ? 1 : 0))
    .current;

  const triggerHaptics = useCallback(async () => {
    if (!feedbackEnabled) return;
    try {
      await Haptics.selectionAsync();
    } catch {
      // Ignored
    }
  }, [feedbackEnabled]);

  const handleSpellCheckToggle = async (value: boolean) => {
    if (value !== spellChecking) {
      await toggleSpellChecking();
      await triggerHaptics();
    }
  };

  const handleDiacriticsToggle = async (value: boolean) => {
    if (value !== ignoreDiacriticsInSpellcheck) {
      await toggleIgnoreDiacriticsInSpellcheck();
      await triggerHaptics();
    }
  };

  const handleRemindersToggle = async (value: boolean) => {
    if (value !== learningRemindersEnabled) {
      await toggleLearningRemindersEnabled();
      await triggerHaptics();
    }
  };

  const handleAutomaticRemindersToggle = async (value: boolean) => {
    if (!learningRemindersEnabled || value === learningReminderAutomaticEnabled) {
      return;
    }
    await setLearningReminderAutomaticEnabled(value);
    await triggerHaptics();
  };

  const handleManualHourPreviewChange = useCallback((value: number) => {
    setManualHourPreview(Math.round(value));
  }, []);

  const handleManualHourCommit = useCallback(
    async (value: number) => {
      const nextHour = Math.round(value);
      setManualHourPreview(nextHour);
      await setLearningReminderManualHour(nextHour);
      await triggerHaptics();
    },
    [setLearningReminderManualHour, triggerHaptics]
  );

  const handleSuggestionsToggle = async (value: boolean) => {
    if (value !== flashcardsSuggestionsEnabled) {
      await toggleFlashcardsSuggestions();
      await triggerHaptics();
    }
  };

  const handleAutoSubmitToggle = async (value: boolean) => {
    if (value !== autoSubmitCorrectAnswer) {
      await toggleAutoSubmitCorrectAnswer();
      await triggerHaptics();
    }
  };

  const handleSkipCorrectionToggle = async (value: boolean) => {
    if (value !== skipCorrectionDefaultEnabled) {
      await setSkipCorrectionDefaultEnabled(value);
      await triggerHaptics();
    }
  };

  useEffect(() => {
    setManualHourPreview(learningReminderManualHour);
  }, [learningReminderManualHour]);

  useEffect(() => {
    if (shouldShowManualTime) {
      setManualTimeMounted(true);
    }
    Animated.timing(manualTimeAnim, {
      toValue: shouldShowManualTime ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && !shouldShowManualTime) {
        setManualTimeMounted(false);
      }
    });
  }, [manualTimeAnim, shouldShowManualTime]);

  const reminderStatusLines = (() => {
    if (!learningRemindersEnabled) {
      return [];
    }
    if (learningReminderPermissionState === "denied") {
      return [t("settings.learning.reminders.status.permissionDenied")];
    }
    return [];
  })();

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.appearanceSectionHeader}>
        {t("settings.learning.section")}
      </Text>

      <View style={styles.learningHeroCard}>
        <ToggleRow
          style={styles.appearanceGroupRow}
          value={learningRemindersEnabled}
          onPress={() => void handleRemindersToggle(!learningRemindersEnabled)}
          accessibilityLabel={t("settings.learning.reminders.title")}
          controlStyle={styles.switch}
        >
          <View style={styles.appearanceRowText}>
            <Text style={styles.appearanceBlockTitle}>
              {preventWidowsPl(t("settings.learning.reminders.title"))}
            </Text>
            <Text style={styles.appearanceBlockDescription}>
              {preventWidowsPl(t("settings.learning.reminders.shortSubtitle"))}
            </Text>
            {reminderStatusLines[0] ? (
              <Text style={styles.settingStatus}>{reminderStatusLines[0]}</Text>
            ) : null}
            {reminderStatusLines.slice(1).map((line) => (
              <Text key={line} style={styles.settingMeta}>
                {line}
              </Text>
            ))}
          </View>
        </ToggleRow>

        <View style={styles.appearanceGroupDivider} />

        <ToggleRow
          style={[
            styles.appearanceGroupRow,
            !learningRemindersEnabled ? styles.sliderDisabled : null,
          ]}
          value={learningReminderAutomaticEnabled}
          disabled={!learningRemindersEnabled}
          onPress={() =>
            void handleAutomaticRemindersToggle(
              !learningReminderAutomaticEnabled
            )
          }
          accessibilityLabel={t(
            "settings.learning.reminders.automatic.title"
          )}
          controlStyle={styles.switch}
        >
          <View style={styles.appearanceRowText}>
            <Text style={styles.appearanceBlockTitle}>
              {preventWidowsPl(t("settings.learning.reminders.automatic.title"))}
            </Text>
            <Text style={styles.appearanceBlockDescription}>
              {preventWidowsPl(
                t("settings.learning.reminders.automatic.subtitle")
              )}
            </Text>
          </View>
        </ToggleRow>

        {manualTimeMounted ? (
          <Animated.View
            style={{
              opacity: manualTimeAnim,
              maxHeight: manualTimeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 92],
              }),
              overflow: "hidden",
              transform: [
                {
                  translateY: manualTimeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-8, 0],
                  }),
                },
              ],
            }}
          >
            <View style={styles.sliderSection}>
              <Text style={styles.appearanceBlockDescription}>
                {preventWidowsPl(
                  t("settings.learning.reminders.manualTime.subtitle")
                )}
              </Text>
              <View style={styles.sliderRow}>
                <TrackSlider
                  testID="learning-reminder-manual-hour-slider"
                  value={manualHourPreview}
                  onValueChange={handleManualHourPreviewChange}
                  onSlidingComplete={(value) => void handleManualHourCommit(value)}
                  minimumValue={0}
                  maximumValue={23}
                  step={1}
                  mode="solid"
                  trackHeight={12}
                  thumbSize={28}
                  thumbBorderWidth={2}
                  trackColor={colors.border}
                  fillColor={colors.my_green}
                  thumbColor={colors.background}
                  thumbBorderColor={colors.my_green}
                  style={styles.sliderWrapper}
                />

                <Text style={styles.sliderValue}>
                  {formatReminderHour(manualHourPreview)}
                </Text>
              </View>
            </View>
          </Animated.View>
        ) : null}
      </View>

      <Text style={styles.appearanceGroupLabel}>
        {t("settings.learning.groups.writing")}
      </Text>
      <View style={styles.appearanceGroupCard}>
        <View style={styles.appearanceGroupRows}>
          <ToggleRow
            style={styles.appearanceGroupRow}
            value={spellChecking}
            onPress={() => void handleSpellCheckToggle(!spellChecking)}
            accessibilityLabel={t("settings.learning.spellcheck.title")}
            controlStyle={styles.switch}
          >
            <View style={styles.appearanceRowText}>
              <Text style={styles.appearanceBlockTitle}>
                {preventWidowsPl(t("settings.learning.spellcheck.title"))}
              </Text>
              <Text style={styles.appearanceBlockDescription}>
                {preventWidowsPl(t("settings.learning.spellcheck.subtitle"))}
              </Text>
            </View>
          </ToggleRow>

          <View style={styles.appearanceGroupDivider} />

          <ToggleRow
            style={styles.appearanceGroupRow}
            value={autoSubmitCorrectAnswer}
            onPress={() => void handleAutoSubmitToggle(!autoSubmitCorrectAnswer)}
            accessibilityLabel={t("settings.learning.autoSubmitCorrectAnswer.title")}
            controlStyle={styles.switch}
          >
            <View style={styles.appearanceRowText}>
              <Text style={styles.appearanceBlockTitle}>
                {preventWidowsPl(t("settings.learning.autoSubmitCorrectAnswer.title"))}
              </Text>
              <Text style={styles.appearanceBlockDescription}>
                {preventWidowsPl(
                  t("settings.learning.autoSubmitCorrectAnswer.subtitle")
                )}
              </Text>
            </View>
          </ToggleRow>

          <View style={styles.appearanceGroupDivider} />

          <ToggleRow
            style={styles.appearanceGroupRow}
            value={flashcardsSuggestionsEnabled}
            onPress={() => void handleSuggestionsToggle(!flashcardsSuggestionsEnabled)}
            accessibilityLabel={t("settings.learning.keyboardSuggestions.title")}
            controlStyle={styles.switch}
          >
            <View style={styles.appearanceRowText}>
              <Text style={styles.appearanceBlockTitle}>
                {preventWidowsPl(t("settings.learning.keyboardSuggestions.title"))}
              </Text>
              <Text style={styles.appearanceBlockDescription}>
                {preventWidowsPl(t("settings.learning.keyboardSuggestions.subtitle"))}
              </Text>
            </View>
          </ToggleRow>

          <View style={styles.appearanceGroupDivider} />

          <ToggleRow
            style={styles.appearanceGroupRow}
            value={ignoreDiacriticsInSpellcheck}
            onPress={() => void handleDiacriticsToggle(!ignoreDiacriticsInSpellcheck)}
            accessibilityLabel={t("settings.learning.ignoreDiacritics.title")}
            controlStyle={styles.switch}
          >
            <View style={styles.appearanceRowText}>
              <Text style={styles.appearanceBlockTitle}>
                {preventWidowsPl(t("settings.learning.ignoreDiacritics.title"))}
              </Text>
              <Text style={styles.appearanceBlockDescription}>
                {preventWidowsPl(t("settings.learning.ignoreDiacritics.subtitle"))}
              </Text>
            </View>
          </ToggleRow>

          <View style={styles.appearanceGroupDivider} />
          <ToggleRow
            style={styles.appearanceGroupRow}
            value={ignoreBoundaryPunctuation}
            onPress={() => void (async () => {
              await toggleIgnoreBoundaryPunctuation();
              await triggerHaptics();
            })()}
            accessibilityLabel={t("settings.learning.ignoreBoundaryPunctuation.title")}
            controlStyle={styles.switch}
          >
            <View style={styles.appearanceRowText}>
              <Text style={styles.appearanceBlockTitle}>
                {preventWidowsPl(t("settings.learning.ignoreBoundaryPunctuation.title"))}
              </Text>
              <Text style={styles.appearanceBlockDescription}>
                {preventWidowsPl(t("settings.learning.ignoreBoundaryPunctuation.subtitle"))}
              </Text>
            </View>
          </ToggleRow>

          <View style={styles.appearanceGroupDivider} />
          <ToggleRow
            style={styles.appearanceGroupRow}
            value={autoConvertSpanishPunctuation}
            onPress={() => void (async () => {
              await toggleAutoConvertSpanishPunctuation();
              await triggerHaptics();
            })()}
            accessibilityLabel={t("settings.learning.autoConvertSpanishPunctuation.title")}
            controlStyle={styles.switch}
          >
            <View style={styles.appearanceRowText}>
              <Text style={styles.appearanceBlockTitle}>
                {preventWidowsPl(t("settings.learning.autoConvertSpanishPunctuation.title"))}
              </Text>
              <Text style={styles.appearanceBlockDescription}>
                {preventWidowsPl(t("settings.learning.autoConvertSpanishPunctuation.subtitle"))}
              </Text>
            </View>
          </ToggleRow>
        </View>
      </View>

      <Text style={styles.appearanceGroupLabel}>
        {t("settings.learning.groups.answers")}
      </Text>
      <View style={styles.appearanceGroupCard}>
        <View style={styles.appearanceGroupRows}>
          <ToggleRow
            style={styles.appearanceGroupRow}
            value={skipCorrectionDefaultEnabled}
            onPress={() =>
              void handleSkipCorrectionToggle(!skipCorrectionDefaultEnabled)
            }
            accessibilityLabel={t("settings.learning.skipCorrection.title")}
            controlStyle={styles.switch}
          >
            <View style={styles.appearanceRowText}>
              <Text style={styles.appearanceBlockTitle}>
                {preventWidowsPl(t("settings.learning.skipCorrection.title"))}
              </Text>
              <Text style={styles.appearanceBlockDescription}>
                {preventWidowsPl(t("settings.learning.skipCorrection.subtitle"))}
              </Text>
            </View>
          </ToggleRow>
        </View>
      </View>
    </View>
  );
};

export default LearningSection;
