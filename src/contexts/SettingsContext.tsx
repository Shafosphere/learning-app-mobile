// src/contexts/SettingsContext.tsx
/**
 * SettingsContext is a public facade for app-wide settings.
 *
 * Keep this file small:
 * - create the React context
 * - compose domain-specific settings hooks
 * - expose the existing public API through useSettings()
 *
 * Module map:
 * - settings/types.ts
 *   Public settings types, SettingsContextValue, and shared setting value types.
 *
 * - settings/defaults.ts
 *   defaultValue for the context and default override maps.
 *
 * - settings/courseKeys.ts
 *   Helpers for comparing courses and building stable course override keys.
 *
 * - settings/courseOverrideHelpers.ts
 *   Generic helpers for builtin/custom per-course override logic.
 *
 * - settings/useLocaleSettings.ts
 *   UI/native language state, language normalization, and i18n synchronization.
 *
 * - settings/useThemeAccessibilitySettings.ts
 *   Theme, resolved colors, accessibility flags, font scale, and Text defaults.
 *
 * - settings/useLearningPreferencesSettings.ts
 *   General learning preferences: level, spellchecking, layout, batch size,
 *   suggestions, quotes, daily goal, and memory board size.
 *
 * - settings/useCourseSelectionSettings.ts
 *   Built-in/custom course selection, pinned official courses, legacy migration,
 *   and custom course entry settings state.
 *
 * - settings/useCourseOverrideSettings.ts
 *   Per-course flashcard settings: box zero, autoflow, explanations,
 *   skip correction, true/false buttons, card size, image size, and image frame.
 *
 * - settings/useLearningReminderSettings.ts
 *   Reminder permission state, automatic/manual reminder settings,
 *   scheduling, refresh, and cancel-today logic.
 *
 * - settings/useGoogleDriveBackupSettings.ts
 *   Google Drive connection, snapshots, backup, restore, and imported-state application.
 *
 * - settings/useAudioFeedbackSettings.ts
 *   Feedback sound enabled state and volume synchronization.
 *
 * - settings/useStatsDisplaySettings.ts
 *   Stats screen display preferences such as fire effect and bookshelf.
 */
import { createContext, ReactNode, useCallback, useContext } from "react";
import { Theme } from "../theme/theme";
import { resetCustomReviewsForCourse } from "../db/sqlite/db";
import { defaultValue } from "./settings/defaults";
import type { SettingsContextValue } from "./settings/types";
import { useAudioFeedbackSettings } from "./settings/useAudioFeedbackSettings";
import { useCourseOverrideSettings } from "./settings/useCourseOverrideSettings";
import { useCourseSelectionSettings } from "./settings/useCourseSelectionSettings";
import { useGoogleDriveBackupSettings } from "./settings/useGoogleDriveBackupSettings";
import { useLearningReminderSettings } from "./settings/useLearningReminderSettings";
import { useLearningPreferencesSettings } from "./settings/useLearningPreferencesSettings";
import { useLocaleSettings } from "./settings/useLocaleSettings";
import { useStatsDisplaySettings } from "./settings/useStatsDisplaySettings";
import { useThemeAccessibilitySettings } from "./settings/useThemeAccessibilitySettings";

export type {
  CEFR,
  CourseBoxZeroKeyParams,
  FlashcardsCardSize,
  FlashcardsImageSize,
  SettingsContextValue,
  TrueFalseButtonsVariant,
} from "./settings/types";

const SettingsContext = createContext<SettingsContextValue>(defaultValue);
export const SettingsProvider: React.FC<{
  children: ReactNode;
  initialTheme?: Theme;
}> = ({ children, initialTheme = "light" }) => {
  const locale = useLocaleSettings();
  const theme = useThemeAccessibilitySettings(initialTheme);
  const { resetLearningPreferencesSettings, ...learningPrefs } =
    useLearningPreferencesSettings();
  const { resetAudioFeedbackSettings, ...audio } = useAudioFeedbackSettings();
  const {
    applyCourseSelectionState,
    resetCourseSelectionSettings,
    ...courseSelection
  } = useCourseSelectionSettings();
  const {
    courses,
    activeCourseIdx,
    activeCustomCourseId,
    pinnedOfficialCourseIds,
  } = courseSelection;
  const courseOverrides = useCourseOverrideSettings({
    courses,
    activeCourseIdx,
    activeCustomCourseId,
  });
  const {
    setFlashcardsCardSizeDefault,
    setFlashcardsImageSizeDefault,
    setFlashcardsImageFrameDefaultEnabled,
  } = courseOverrides;
  const reminders = useLearningReminderSettings({
    pinnedOfficialCourseIds,
  });
  const {
    setLearningRemindersEnabled,
    setLearningReminderAutomaticEnabled,
    setLearningReminderManualHour,
  } = reminders;
  const stats = useStatsDisplaySettings();
  const backup = useGoogleDriveBackupSettings({
    applyCourseSelectionState,
    setStatsFireEffectEnabled: stats.setStatsFireEffectEnabled,
    setStatsBookshelfEnabled: stats.setStatsBookshelfEnabled,
  });

  const resetLearningSettings = useCallback(async () => {
    await setLearningRemindersEnabled(false);
    await Promise.all([
      resetLearningPreferencesSettings(),
      setFlashcardsCardSizeDefault("large"),
      setFlashcardsImageSizeDefault("dynamic"),
      setFlashcardsImageFrameDefaultEnabled(true),
      setLearningReminderAutomaticEnabled(true),
      setLearningReminderManualHour(defaultValue.learningReminderManualHour),
      resetAudioFeedbackSettings(),
    ]);
  }, [
    resetAudioFeedbackSettings,
    resetLearningPreferencesSettings,
    setLearningReminderAutomaticEnabled,
    setLearningReminderManualHour,
    setLearningRemindersEnabled,
    setFlashcardsCardSizeDefault,
    setFlashcardsImageSizeDefault,
    setFlashcardsImageFrameDefaultEnabled,
  ]);

  const resetActiveCourseReviews = useCallback(async () => {
    return 0;
  }, []);

  const resetActiveCustomCourseReviews = useCallback(async () => {
    if (activeCustomCourseId == null) {
      return 0;
    }
    return resetCustomReviewsForCourse(activeCustomCourseId);
  }, [activeCustomCourseId]);

  const resetOnboardingState = useCallback(async () => {
    await resetCourseSelectionSettings();
  }, [resetCourseSelectionSettings]);

  return (
    <SettingsContext.Provider
      value={{
        ...locale,
        ...theme,
        ...learningPrefs,
        ...audio,
        ...courseSelection,
        ...courseOverrides,
        ...reminders,
        ...backup,
        ...stats,
        resetLearningSettings,
        resetActiveCourseReviews,
        resetActiveCustomCourseReviews,
        resetOnboardingState,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
