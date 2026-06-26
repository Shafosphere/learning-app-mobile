import type {
  ReminderPermissionState,
  ReminderReconcileReason,
} from "@/src/features/notifications";
import type { GoogleDriveBackupSnapshot } from "@/src/services/googleDriveBackup";
import type { ImportResult } from "@/src/services/importUserData";
import type { SmartReminderProfile } from "@/src/services/smartReminders";
import type {
  NativeLanguage,
  SupportedLanguage,
  UiLanguage,
} from "@/src/i18n";
import type { MemoryBoardSize } from "@/src/constants/memoryGame";
import type {
  ColorBlindMode,
  Theme,
  ThemeColors,
} from "@/src/theme/theme";
import type { LanguageCourse } from "@/src/types/course";
import type { CEFRLevel } from "@/src/types/language";

export type CourseBoxZeroKeyParams = {
  sourceLang?: string | null;
  targetLang?: string | null;
  level?: CEFRLevel | null;
};

export type CourseOverrideState<T> = {
  builtin: Record<string, T>;
  custom: Record<string, T>;
};

export type CourseBoxZeroOverrides = CourseOverrideState<boolean>;

export type CourseAutoflowOverrides = CourseOverrideState<boolean>;

export type CourseShowExplanationOverrides = CourseOverrideState<boolean>;

export type CourseExplanationOnlyOnWrongOverrides =
  CourseOverrideState<boolean>;

export type CustomCourseEntrySettingsSeenMap = Record<string, true>;

export type CEFR = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type FlashcardsCardSize = "large" | "small";
export type FlashcardsImageSize =
  | "dynamic"
  | "small"
  | "medium"
  | "large"
  | "very_large";
export type TrueFalseButtonsVariant = "true_false" | "know_dont_know";
export type DominantHand = "left" | "center" | "right";

export type CourseCardSizeOverrides =
  CourseOverrideState<FlashcardsCardSize>;

export type CourseImageSizeOverrides =
  CourseOverrideState<FlashcardsImageSize>;

export type CourseImageFrameOverrides = CourseOverrideState<boolean>;

export type CourseTrueFalseButtonsOverrides =
  CourseOverrideState<TrueFalseButtonsVariant>;

export type CourseSkipCorrectionOverrides = CourseOverrideState<boolean>;

export interface SettingsContextValue {
  uiLanguage: UiLanguage;
  nativeLanguage: NativeLanguage;
  resolvedLanguage: SupportedLanguage;
  setUiLanguage: (value: UiLanguage) => Promise<void>;
  setNativeLanguage: (value: NativeLanguage) => Promise<void>;
  theme: Theme;
  colors: ThemeColors;
  toggleTheme: () => Promise<void>;
  boxesLayout: "classic" | "carousel";
  setBoxesLayout: (layout: "classic" | "carousel") => Promise<void>;
  actionButtonsPosition: "top" | "bottom";
  setActionButtonsPosition: (position: "top" | "bottom") => Promise<void>;
  courses: LanguageCourse[];
  addCourse: (course: LanguageCourse) => Promise<void>;
  removeCourse: (course: LanguageCourse) => Promise<void>;
  selectedLevel: CEFRLevel;
  setLevel: (lvl: CEFRLevel) => void;
  spellChecking: boolean;
  toggleSpellChecking: () => Promise<void>;
  ignoreDiacriticsInSpellcheck: boolean;
  toggleIgnoreDiacriticsInSpellcheck: () => Promise<void>;
  showBoxFaces: boolean;
  toggleShowBoxFaces: () => Promise<void>;
  boxZeroEnabled: boolean;
  getBuiltinCourseBoxZeroEnabled: (
    params: CourseBoxZeroKeyParams
  ) => boolean;
  setBuiltinCourseBoxZeroEnabled: (
    params: CourseBoxZeroKeyParams,
    enabled: boolean
  ) => Promise<void>;
  getCustomCourseBoxZeroEnabled: (courseId: number) => boolean;
  setCustomCourseBoxZeroEnabled: (
    courseId: number,
    enabled: boolean
  ) => Promise<void>;
  autoflowEnabled: boolean;
  getBuiltinCourseAutoflowEnabled: (
    params: CourseBoxZeroKeyParams
  ) => boolean;
  setBuiltinCourseAutoflowEnabled: (
    params: CourseBoxZeroKeyParams,
    enabled: boolean
  ) => Promise<void>;
  getCustomCourseAutoflowEnabled: (courseId: number) => boolean;
  setCustomCourseAutoflowEnabled: (
    courseId: number,
    enabled: boolean
  ) => Promise<void>;
  showExplanationEnabled: boolean;
  getBuiltinCourseShowExplanationEnabled: (
    params: CourseBoxZeroKeyParams
  ) => boolean;
  setBuiltinCourseShowExplanationEnabled: (
    params: CourseBoxZeroKeyParams,
    enabled: boolean
  ) => Promise<void>;
  getCustomCourseShowExplanationEnabled: (courseId: number) => boolean;
  setCustomCourseShowExplanationEnabled: (
    courseId: number,
    enabled: boolean
  ) => Promise<void>;
  explanationOnlyOnWrong: boolean;
  getBuiltinCourseExplanationOnlyOnWrong: (
    params: CourseBoxZeroKeyParams
  ) => boolean;
  setBuiltinCourseExplanationOnlyOnWrong: (
    params: CourseBoxZeroKeyParams,
    enabled: boolean
  ) => Promise<void>;
  getCustomCourseExplanationOnlyOnWrong: (courseId: number) => boolean;
  setCustomCourseExplanationOnlyOnWrong: (
    courseId: number,
    enabled: boolean
  ) => Promise<void>;
  skipCorrectionEnabled: boolean;
  getBuiltinCourseSkipCorrectionEnabled: (
    params: CourseBoxZeroKeyParams
  ) => boolean;
  setBuiltinCourseSkipCorrectionEnabled: (
    params: CourseBoxZeroKeyParams,
    enabled: boolean
  ) => Promise<void>;
  getCustomCourseSkipCorrectionEnabled: (courseId: number) => boolean;
  setCustomCourseSkipCorrectionEnabled: (
    courseId: number,
    enabled: boolean
  ) => Promise<void>;
  trueFalseButtonsVariant: TrueFalseButtonsVariant;
  getBuiltinCourseTrueFalseButtonsVariant: (
    params: CourseBoxZeroKeyParams
  ) => TrueFalseButtonsVariant;
  setBuiltinCourseTrueFalseButtonsVariant: (
    params: CourseBoxZeroKeyParams,
    variant: TrueFalseButtonsVariant
  ) => Promise<void>;
  getCustomCourseTrueFalseButtonsVariant: (
    courseId: number
  ) => TrueFalseButtonsVariant;
  setCustomCourseTrueFalseButtonsVariant: (
    courseId: number,
    variant: TrueFalseButtonsVariant
  ) => Promise<void>;
  resetLearningSettings: () => Promise<void>;
  resetActiveCourseReviews: () => Promise<number>;
  resetActiveCustomCourseReviews: () => Promise<number>;
  resetOnboardingState: () => Promise<void>;
  activeCourseIdx: number | null;
  setActiveCourseIdx: (i: number | null) => Promise<void>;
  activeCourse: LanguageCourse | null;
  activeCustomCourseId: number | null;
  setActiveCustomCourseId: (id: number | null) => Promise<void>;
  customCourseEntrySettingsSeenHydrated: boolean;
  hasSeenCustomCourseEntrySettings: (courseId: number) => boolean;
  markCustomCourseEntrySettingsSeen: (courseId: number) => Promise<void>;
  pinnedOfficialCourseIds: number[];
  pinOfficialCourse: (id: number) => Promise<void>;
  unpinOfficialCourse: (id: number) => Promise<void>;
  flashcardsBatchSize: number;
  setFlashcardsBatchSize: (n: number) => Promise<void>;
  flashcardsSuggestionsEnabled: boolean;
  toggleFlashcardsSuggestions: () => Promise<void>;
  quotesEnabled: boolean;
  toggleQuotesEnabled: () => Promise<void>;
  flashcardsCardSize: FlashcardsCardSize;
  flashcardsCardSizeDefault: FlashcardsCardSize;
  setFlashcardsCardSizeDefault: (size: FlashcardsCardSize) => Promise<void>;
  getBuiltinCourseCardSize: (params: CourseBoxZeroKeyParams) => FlashcardsCardSize;
  setBuiltinCourseCardSize: (
    params: CourseBoxZeroKeyParams,
    size: FlashcardsCardSize
  ) => Promise<void>;
  getCustomCourseCardSize: (courseId: number) => FlashcardsCardSize;
  setCustomCourseCardSize: (
    courseId: number,
    size: FlashcardsCardSize
  ) => Promise<void>;
  flashcardsImageSize: FlashcardsImageSize;
  flashcardsImageSizeDefault: FlashcardsImageSize;
  setFlashcardsImageSizeDefault: (size: FlashcardsImageSize) => Promise<void>;
  getBuiltinCourseImageSize: (params: CourseBoxZeroKeyParams) => FlashcardsImageSize;
  setBuiltinCourseImageSize: (
    params: CourseBoxZeroKeyParams,
    size: FlashcardsImageSize
  ) => Promise<void>;
  getCustomCourseImageSize: (courseId: number) => FlashcardsImageSize;
  setCustomCourseImageSize: (
    courseId: number,
    size: FlashcardsImageSize
  ) => Promise<void>;
  flashcardsImageFrameEnabled: boolean;
  flashcardsImageFrameDefaultEnabled: boolean;
  setFlashcardsImageFrameDefaultEnabled: (enabled: boolean) => Promise<void>;
  getBuiltinCourseImageFrameEnabled: (params: CourseBoxZeroKeyParams) => boolean;
  setBuiltinCourseImageFrameEnabled: (
    params: CourseBoxZeroKeyParams,
    enabled: boolean
  ) => Promise<void>;
  getCustomCourseImageFrameEnabled: (courseId: number) => boolean;
  setCustomCourseImageFrameEnabled: (
    courseId: number,
    enabled: boolean
  ) => Promise<void>;
  dailyGoal: number;
  setDailyGoal: (n: number) => Promise<void>;
  feedbackEnabled: boolean;
  setFeedbackEnabled: (value: boolean) => Promise<void>;
  toggleFeedbackEnabled: () => Promise<void>;
  feedbackVolume: number;
  setFeedbackVolume: (value: number) => Promise<void>;
  learningRemindersEnabled: boolean;
  setLearningRemindersEnabled: (value: boolean) => Promise<void>;
  toggleLearningRemindersEnabled: () => Promise<void>;
  learningReminderAutomaticEnabled: boolean;
  setLearningReminderAutomaticEnabled: (value: boolean) => Promise<void>;
  learningReminderManualHour: number;
  setLearningReminderManualHour: (hour: number) => Promise<void>;
  learningReminderNextAt: number | null;
  learningReminderProfile: SmartReminderProfile;
  learningReminderPermissionState: ReminderPermissionState;
  refreshLearningReminderSchedule: (
    reason?: ReminderReconcileReason
  ) => Promise<void>;
  cancelTodayLearningReminderSchedule: (
    reason?: ReminderReconcileReason
  ) => Promise<void>;
  googleDriveConfigured: boolean;
  googleDriveConfigurationError: string | null;
  googleDriveConnected: boolean;
  lastSuccessfulGoogleDriveBackupAt: number | null;
  lastGoogleDriveBackupAttemptAt: number | null;
  googleDriveBackupError: string | null;
  googleDriveBackupSnapshots: GoogleDriveBackupSnapshot[];
  googleDriveBackupSnapshotsLoading: boolean;
  googleDriveBackupSnapshotsError: string | null;
  googleDriveBackupInProgress: boolean;
  googleDriveRestoreInProgress: boolean;
  connectGoogleDriveBackup: () => Promise<{
    connected: boolean;
    cancelled: boolean;
  }>;
  disconnectGoogleDriveBackup: () => Promise<void>;
  backupUserDataToGoogleDriveNow: () => Promise<void>;
  restoreUserDataFromGoogleDrive: (fileId: string) => Promise<ImportResult>;
  refreshGoogleDriveBackupSnapshots: () => Promise<void>;
  applyImportedAppState: (result: ImportResult) => Promise<void>;
  statsFireEffectEnabled: boolean;
  setStatsFireEffectEnabled: (value: boolean) => Promise<void>;
  toggleStatsFireEffectEnabled: () => Promise<void>;
  statsBookshelfEnabled: boolean;
  setStatsBookshelfEnabled: (value: boolean) => Promise<void>;
  toggleStatsBookshelfEnabled: () => Promise<void>;
  highContrastEnabled: boolean;
  toggleHighContrast: () => Promise<void>;
  colorBlindMode: ColorBlindMode;
  setColorBlindMode: (mode: ColorBlindMode) => Promise<void>;
  toggleColorBlindMode: () => Promise<void>;
  largeFontEnabled: boolean;
  toggleLargeFont: () => Promise<void>;
  correctionErrorMarkersEnabled: boolean;
  toggleCorrectionErrorMarkers: () => Promise<void>;
  dominantHand: DominantHand;
  setDominantHand: (hand: DominantHand) => Promise<void>;
  fontScaleMultiplier: number;
  memoryBoardSize: MemoryBoardSize;
  setMemoryBoardSize: (size: MemoryBoardSize) => Promise<void>;
  accessibilityPreferences: {
    highContrastEnabled: boolean;
    colorBlindMode: ColorBlindMode;
    largeFontEnabled: boolean;
    correctionErrorMarkersEnabled: boolean;
    dominantHand: DominantHand;
  };
}
