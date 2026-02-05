// src/contexts/SettingsContext.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { StyleProp, Text, TextProps, TextStyle } from "react-native";
import { DEFAULT_FLASHCARDS_BATCH_SIZE } from "../config/appConfig";
import {
  MemoryBoardSize,
  sanitizeMemoryBoardSize,
} from "../constants/memoryGame";
import { usePersistedState } from "../hooks/usePersistedState";
import {
  ColorBlindMode,
  resolveThemeColors,
  Theme,
  ThemeColors,
} from "../theme/theme";
import { LanguageCourse } from "../types/course";
import type { CEFRLevel } from "../types/language";
import {
  resetCustomReviewsForCourse,
} from "../db/sqlite/db";
import { setFeedbackVolume as setSoundPlayerVolume } from "../utils/soundPlayer";

// Rozszerzamy typ Text, aby uwzględnić defaultProps
type TextWithDefaultProps = typeof Text & {
  defaultProps?: TextProps & {
    style?: StyleProp<TextStyle>;
  };
};

function languagesMatch(a: LanguageCourse, b: LanguageCourse): boolean {
  const hasIdsA = a.sourceLangId != null && a.targetLangId != null;
  const hasIdsB = b.sourceLangId != null && b.targetLangId != null;

  if (hasIdsA && hasIdsB) {
    return (
      a.sourceLangId === b.sourceLangId && a.targetLangId === b.targetLangId
    );
  }

  return a.sourceLang === b.sourceLang && a.targetLang === b.targetLang;
}

function coursesEqual(a: LanguageCourse, b: LanguageCourse): boolean {
  if (!languagesMatch(a, b)) {
    return false;
  }
  const levelA = a.level ?? null;
  const levelB = b.level ?? null;
  return levelA === levelB;
}

function findCourseIndex(
  list: LanguageCourse[],
  course: LanguageCourse
): number {
  const exactIdx = list.findIndex((candidate) =>
    coursesEqual(candidate, course)
  );
  if (exactIdx !== -1) {
    return exactIdx;
  }
  if (course.level != null) {
    return list.findIndex(
      (candidate) => candidate.level == null && languagesMatch(candidate, course)
    );
  }
  return -1;
}

const clampVolume = (value: number) => Math.min(1, Math.max(0, value));

export type CourseBoxZeroKeyParams = {
  sourceLang?: string | null;
  targetLang?: string | null;
  level?: CEFRLevel | null;
};

type CourseBoxZeroOverrides = {
  builtin: Record<string, boolean>;
  custom: Record<string, boolean>;
};

type CourseAutoflowOverrides = {
  builtin: Record<string, boolean>;
  custom: Record<string, boolean>;
};


type CourseImageSizeOverrides = {
  builtin: Record<string, FlashcardsImageSize>;
  custom: Record<string, FlashcardsImageSize>;
};

const DEFAULT_COURSE_BOX_ZERO_OVERRIDES: CourseBoxZeroOverrides = {
  builtin: {},
  custom: {},
};

const DEFAULT_COURSE_AUTOFLOW_OVERRIDES: CourseAutoflowOverrides = {
  builtin: {},
  custom: {},
};

const DEFAULT_COURSE_SKIP_CORRECTION_OVERRIDES: CourseSkipCorrectionOverrides = {
  builtin: {},
  custom: {},
};

const DEFAULT_COURSE_IMAGE_SIZE_OVERRIDES: CourseImageSizeOverrides = {
  builtin: {},
  custom: {},
};

const DEFAULT_COURSE_TRUE_FALSE_BUTTONS_OVERRIDES: CourseTrueFalseButtonsOverrides = {
  builtin: {},
  custom: {},
};
function makeBuiltinCourseKey({
  sourceLang,
  targetLang,
  level,
}: CourseBoxZeroKeyParams): string {
  const src = (sourceLang ?? "unknown").toLowerCase();
  const tgt = (targetLang ?? "unknown").toLowerCase();
  const lvl = (level ?? "none").toString().toUpperCase();
  return `${src}|${tgt}|${lvl}`;
}

interface SettingsContextValue {
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
  activeCourseIdx: number | null; // NEW
  setActiveCourseIdx: (i: number | null) => Promise<void>; // NEW
  activeCourse: LanguageCourse | null;
  activeCustomCourseId: number | null;
  setActiveCustomCourseId: (id: number | null) => Promise<void>;
  // Pinned official packs (custom courses marked as official)
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
  statsFireEffectEnabled: boolean;
  setStatsFireEffectEnabled: (value: boolean) => Promise<void>;
  toggleStatsFireEffectEnabled: () => Promise<void>;
  statsBookshelfEnabled: boolean;
  setStatsBookshelfEnabled: (value: boolean) => Promise<void>;
  toggleStatsBookshelfEnabled: () => Promise<void>;
  highContrastEnabled: boolean;
  toggleHighContrast: () => Promise<void>;
  colorBlindMode: ColorBlindMode;
  toggleColorBlindMode: () => Promise<void>;
  largeFontEnabled: boolean;
  toggleLargeFont: () => Promise<void>;
  fontScaleMultiplier: number;
  memoryBoardSize: MemoryBoardSize;
  setMemoryBoardSize: (size: MemoryBoardSize) => Promise<void>;
  accessibilityPreferences: {
    highContrastEnabled: boolean;
    colorBlindMode: ColorBlindMode;
    largeFontEnabled: boolean;
  };
}

export type CEFR = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type FlashcardsCardSize = "large" | "small";
export type FlashcardsImageSize = "dynamic" | "small" | "medium" | "large";
export type TrueFalseButtonsVariant = "true_false" | "know_dont_know";
type CourseCardSizeOverrides = {
  builtin: Record<string, FlashcardsCardSize>;
  custom: Record<string, FlashcardsCardSize>;
};

type CourseTrueFalseButtonsOverrides = {
  builtin: Record<string, TrueFalseButtonsVariant>;
  custom: Record<string, TrueFalseButtonsVariant>;
};
type CourseSkipCorrectionOverrides = {
  builtin: Record<string, boolean>;
  custom: Record<string, boolean>;
};

const defaultValue: SettingsContextValue = {
  theme: "light",
  colors: resolveThemeColors("light"),
  toggleTheme: async () => {},
  boxesLayout: "classic",
  setBoxesLayout: async () => {},
  actionButtonsPosition: "bottom",
  setActionButtonsPosition: async () => {},
  courses: [],
  addCourse: async () => {},
  removeCourse: async () => {},
  selectedLevel: "A1",
  setLevel: (_lvl: CEFRLevel) => {},
  spellChecking: true,
  toggleSpellChecking: async () => {},
  ignoreDiacriticsInSpellcheck: false,
  toggleIgnoreDiacriticsInSpellcheck: async () => {},
  showBoxFaces: true,
  toggleShowBoxFaces: async () => {},
  boxZeroEnabled: false,
  getBuiltinCourseBoxZeroEnabled: () => false,
  setBuiltinCourseBoxZeroEnabled: async () => {},
  getCustomCourseBoxZeroEnabled: () => false,
  setCustomCourseBoxZeroEnabled: async () => {},
  autoflowEnabled: true,
  getBuiltinCourseAutoflowEnabled: () => true,
  setBuiltinCourseAutoflowEnabled: async () => {},
  getCustomCourseAutoflowEnabled: () => true,
  setCustomCourseAutoflowEnabled: async () => {},
  skipCorrectionEnabled: false,
  getBuiltinCourseSkipCorrectionEnabled: () => false,
  setBuiltinCourseSkipCorrectionEnabled: async () => {},
  getCustomCourseSkipCorrectionEnabled: () => false,
  setCustomCourseSkipCorrectionEnabled: async () => {},
  trueFalseButtonsVariant: "true_false",
  getBuiltinCourseTrueFalseButtonsVariant: () => "true_false",
  setBuiltinCourseTrueFalseButtonsVariant: async () => {},
  getCustomCourseTrueFalseButtonsVariant: () => "true_false",
  setCustomCourseTrueFalseButtonsVariant: async () => {},
  resetLearningSettings: async () => {},
  resetActiveCourseReviews: async () => 0,
  resetActiveCustomCourseReviews: async () => 0,
  activeCourseIdx: null,
  setActiveCourseIdx: async () => {},
  activeCourse: null,
  activeCustomCourseId: null,
  setActiveCustomCourseId: async () => {},
  pinnedOfficialCourseIds: [],
  pinOfficialCourse: async () => {},
  unpinOfficialCourse: async () => {},
  flashcardsBatchSize: DEFAULT_FLASHCARDS_BATCH_SIZE,
  setFlashcardsBatchSize: async () => {},
  flashcardsSuggestionsEnabled: true,
  toggleFlashcardsSuggestions: async () => {},
  quotesEnabled: true,
  toggleQuotesEnabled: async () => {},
  flashcardsCardSize: "large",
  flashcardsImageSize: "dynamic",
  dailyGoal: 20,
  setDailyGoal: async () => {},
  feedbackEnabled: true,
  setFeedbackEnabled: async () => {},
  toggleFeedbackEnabled: async () => {},
  feedbackVolume: 1,
  setFeedbackVolume: async () => {},
  learningRemindersEnabled: false,
  setLearningRemindersEnabled: async () => {},
  toggleLearningRemindersEnabled: async () => {},
  statsFireEffectEnabled: false,
  setStatsFireEffectEnabled: async () => {},
  toggleStatsFireEffectEnabled: async () => {},
  statsBookshelfEnabled: false,
  setStatsBookshelfEnabled: async () => {},
  toggleStatsBookshelfEnabled: async () => {},
  flashcardsCardSizeDefault: "large",
  setFlashcardsCardSizeDefault: async () => {},
  getBuiltinCourseCardSize: () => "large",
  setBuiltinCourseCardSize: async () => {},
  getCustomCourseCardSize: () => "large",
  setCustomCourseCardSize: async () => {},
  flashcardsImageSizeDefault: "dynamic",
  setFlashcardsImageSizeDefault: async () => {},
  getBuiltinCourseImageSize: () => "dynamic",
  setBuiltinCourseImageSize: async () => {},
  getCustomCourseImageSize: () => "dynamic",
  setCustomCourseImageSize: async () => {},
  highContrastEnabled: false,
  toggleHighContrast: async () => {},
  colorBlindMode: "none",
  toggleColorBlindMode: async () => {},
  largeFontEnabled: false,
  toggleLargeFont: async () => {},
  fontScaleMultiplier: 1,
  memoryBoardSize: "twoByThree",
  setMemoryBoardSize: async () => {},
  accessibilityPreferences: {
    highContrastEnabled: false,
    colorBlindMode: "none",
    largeFontEnabled: false,
  },
};

const SettingsContext = createContext<SettingsContextValue>(defaultValue);
export const SettingsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [selectedLevel, persistSelectedLevel] = usePersistedState<CEFRLevel>(
    "selectedLevel",
    "A1"
  );
  const [theme, setTheme] = usePersistedState<Theme>("theme", "light");
  const [boxesLayoutState, _setBoxesLayout] = usePersistedState<
    "classic" | "carousel"
  >("boxesLayout", "classic");
  const [actionButtonsPositionState, _setActionButtonsPosition] =
    usePersistedState<"top" | "bottom">(
      "flashcards.actionsPosition",
      "bottom"
    );
  const [courses, setCourses] = usePersistedState<LanguageCourse[]>(
    "courses",
    []
  );

  const [activeCourseIdx, setActiveCourseIdxState] = usePersistedState<
    number | null
  >("activeCourseIdx", null);

  const [activeCustomCourseId, setActiveCustomCourseIdState] =
    usePersistedState<number | null>("activeCustomCourseId", null);

  // Pinned official packs
  const [pinnedOfficialCourseIds, setPinnedOfficialCourseIds] =
    usePersistedState<number[]>("officialPinnedCourseIds", []);

  console.log(courses);
  const [spellChecking, setSpellChecking] = usePersistedState<boolean>(
    "spellChecking",
    true
  );
  const [ignoreDiacriticsInSpellcheck, setIgnoreDiacriticsInSpellcheck] =
    usePersistedState<boolean>("spellCheckingIgnoreDiacritics", false);
  const [showBoxFaces, setShowBoxFaces] = usePersistedState<boolean>(
    "showBoxFaces",
    true
  );
  const [boxZeroDefaultEnabled] = usePersistedState<boolean>(
    "flashcards.boxZeroEnabled",
    false
  );
  const [boxZeroOverrides, setBoxZeroOverrides] =
    usePersistedState<CourseBoxZeroOverrides>(
      "flashcards.courseBoxZeroOverrides",
      DEFAULT_COURSE_BOX_ZERO_OVERRIDES
    );
  const [autoflowDefaultEnabled] = usePersistedState<boolean>(
    "flashcards.autoflowEnabled",
    true
  );
  const [autoflowOverrides, setAutoflowOverrides] =
    usePersistedState<CourseAutoflowOverrides>(
      "flashcards.courseAutoflowOverrides",
      DEFAULT_COURSE_AUTOFLOW_OVERRIDES
    );
  const [cardSizeOverrides, setCardSizeOverrides] =
    usePersistedState<CourseCardSizeOverrides>(
      "flashcards.courseCardSizeOverrides",
      { builtin: {}, custom: {} }
    );
  const [imageSizeOverrides, setImageSizeOverrides] =
    usePersistedState<CourseImageSizeOverrides>(
      "flashcards.courseImageSizeOverrides",
      DEFAULT_COURSE_IMAGE_SIZE_OVERRIDES
    );
  const [flashcardsCardSizeDefault, setFlashcardsCardSizeDefault] =
    usePersistedState<FlashcardsCardSize>("flashcards.cardSize", "large");
  const [flashcardsImageSizeDefault, setFlashcardsImageSizeDefault] =
    usePersistedState<FlashcardsImageSize>("flashcards.imageSize", "dynamic");
  const [skipCorrectionDefaultEnabled] = usePersistedState<boolean>(
    "flashcards.skipCorrectionEnabled",
    false
  );
  const [skipCorrectionOverrides, setSkipCorrectionOverrides] =
    usePersistedState<CourseSkipCorrectionOverrides>(
      "flashcards.courseSkipCorrectionOverrides",
      DEFAULT_COURSE_SKIP_CORRECTION_OVERRIDES
    );
  const [trueFalseButtonsVariantDefault] =
    usePersistedState<TrueFalseButtonsVariant>(
      "flashcards.trueFalseButtonsVariant",
      "true_false"
    );
  const [trueFalseButtonsOverrides, setTrueFalseButtonsOverrides] =
    usePersistedState<CourseTrueFalseButtonsOverrides>(
      "flashcards.courseTrueFalseButtonsOverrides",
      DEFAULT_COURSE_TRUE_FALSE_BUTTONS_OVERRIDES
    );
  const [flashcardsBatchSize, setFlashcardsBatchSize] =
    usePersistedState<number>(
      "flashcardsBatchSize",
      DEFAULT_FLASHCARDS_BATCH_SIZE
    );
  const [flashcardsSuggestionsEnabled, setFlashcardsSuggestionsEnabled] =
    usePersistedState<boolean>("flashcards.inputSuggestionsEnabled", true);
  const [quotesEnabled, setQuotesEnabled] = usePersistedState<boolean>(
    "quotes.enabled",
    true
  );
  const [dailyGoal, setDailyGoal] = usePersistedState<number>("dailyGoal", 20);
  const [feedbackEnabledState, _setFeedbackEnabled] =
    usePersistedState<boolean>("feedbackEnabled", true);
  const [feedbackVolumeState, _setFeedbackVolume] =
    usePersistedState<number>("feedbackVolume", 1);
  const [learningRemindersEnabledState, _setLearningRemindersEnabled] =
    usePersistedState<boolean>("learningRemindersEnabled", false);
  const [statsFireEffectEnabledState, _setStatsFireEffectEnabled] =
    usePersistedState<boolean>("stats.fireEffectEnabled", false);
  const [statsBookshelfEnabledState, _setStatsBookshelfEnabled] =
    usePersistedState<boolean>("stats.bookshelfEnabled", false);
  const [highContrastEnabled, setHighContrastEnabled] =
    usePersistedState<boolean>("accessibility.highContrast", false);
  const [colorBlindMode, setColorBlindMode] = usePersistedState<ColorBlindMode>(
    "accessibility.colorBlindMode",
    "none"
  );
  const [largeFontEnabled, setLargeFontEnabled] = usePersistedState<boolean>(
    "accessibility.largeFont",
    false
  );
  const [rawMemoryBoardSize, setRawMemoryBoardSize] =
    usePersistedState<string>("memory.boardSize", "twoByThree");
  const memoryBoardSize = useMemo<MemoryBoardSize>(
    () => sanitizeMemoryBoardSize(rawMemoryBoardSize),
    [rawMemoryBoardSize]
  );

  useEffect(() => {
    const normalized = sanitizeMemoryBoardSize(rawMemoryBoardSize);
    if (normalized !== rawMemoryBoardSize) {
      void setRawMemoryBoardSize(normalized);
    }
  }, [rawMemoryBoardSize, setRawMemoryBoardSize]);
  const toggleSpellChecking = async () => {
    await setSpellChecking(!spellChecking);
  };
  const toggleIgnoreDiacriticsInSpellcheck = async () => {
    await setIgnoreDiacriticsInSpellcheck(!ignoreDiacriticsInSpellcheck);
  };
  const toggleShowBoxFaces = async () => {
    await setShowBoxFaces(!showBoxFaces);
  };
  const toggleTheme = async () => {
    const newTheme: Theme = theme === "light" ? "dark" : "light";
    await setTheme(newTheme);
  };
  const colors = useMemo(
    () =>
      resolveThemeColors(theme, {
        highContrast: highContrastEnabled,
        colorBlindMode,
      }),
    [theme, highContrastEnabled, colorBlindMode]
  );

  const originalTextDefaultStyleRef = useRef<StyleProp<TextStyle>>(
    (Text as TextWithDefaultProps).defaultProps?.style
  );

  useEffect(() => {
    const originalStyle = originalTextDefaultStyleRef.current;
    const baseStyle = originalStyle;
    const baseArray = Array.isArray(baseStyle)
      ? baseStyle.filter(Boolean)
      : baseStyle
      ? [baseStyle]
      : [];

    (Text as TextWithDefaultProps).defaultProps = {
      ...((Text as TextWithDefaultProps).defaultProps ?? {}),
      style: [...baseArray, { color: colors.headline }],
    };

    return () => {
      const currentDefaults = (Text as TextWithDefaultProps).defaultProps ?? {};
      const { style: _ignoredStyle, ...restDefaults } = currentDefaults;

      if (originalStyle === undefined) {
        (Text as TextWithDefaultProps).defaultProps = restDefaults;
        return;
      }

      (Text as TextWithDefaultProps).defaultProps = {
        ...restDefaults,
        style: originalStyle,
      };
    };
  }, [colors.headline]);

  const fontScaleMultiplier = largeFontEnabled ? 1.15 : 1;

  const boxesLayout = boxesLayoutState;
  const setBoxesLayout = async (layout: "classic" | "carousel") => {
    await _setBoxesLayout(layout);
  };
  const actionButtonsPosition = actionButtonsPositionState;
  const setActionButtonsPosition = async (position: "top" | "bottom") => {
    await _setActionButtonsPosition(position);
  };

  const setActiveCourseIdx = useCallback(
    async (idx: number | null) => {
      if (idx != null) {
        await setActiveCustomCourseIdState(null);
      }
      await setActiveCourseIdxState(idx);
    },
    [setActiveCustomCourseIdState, setActiveCourseIdxState]
  );

  const setActiveCustomCourseId = useCallback(
    async (courseId: number | null) => {
      if (courseId != null) {
        await setActiveCourseIdxState(null);
      }
      await setActiveCustomCourseIdState(courseId);
    },
    [setActiveCustomCourseIdState, setActiveCourseIdxState]
  );

  const getBuiltinCourseBoxZeroEnabled = useCallback(
    ({ sourceLang, targetLang, level }: CourseBoxZeroKeyParams) => {
      const key = makeBuiltinCourseKey({ sourceLang, targetLang, level });
      const override = boxZeroOverrides.builtin[key];
      return override ?? boxZeroDefaultEnabled;
    },
    [boxZeroDefaultEnabled, boxZeroOverrides.builtin]
  );

  const setBuiltinCourseBoxZeroEnabled = useCallback(
    async (
      params: CourseBoxZeroKeyParams,
      enabled: boolean
    ): Promise<void> => {
      const key = makeBuiltinCourseKey(params);
      const current = boxZeroOverrides.builtin[key];
      const shouldRemove = enabled === boxZeroDefaultEnabled;
      if (shouldRemove && current === undefined) {
        return;
      }
      if (!shouldRemove && current === enabled) {
        return;
      }
      const nextBuiltin = { ...boxZeroOverrides.builtin };
      if (shouldRemove) {
        delete nextBuiltin[key];
      } else {
        nextBuiltin[key] = enabled;
      }
      await setBoxZeroOverrides({
        builtin: nextBuiltin,
        custom: { ...boxZeroOverrides.custom },
      });
    },
    [boxZeroDefaultEnabled, boxZeroOverrides, setBoxZeroOverrides]
  );

  const getCustomCourseBoxZeroEnabled = useCallback(
    (courseId: number) => {
      const key = courseId.toString();
      const override = boxZeroOverrides.custom[key];
      return override ?? boxZeroDefaultEnabled;
    },
    [boxZeroDefaultEnabled, boxZeroOverrides.custom]
  );

  const setCustomCourseBoxZeroEnabled = useCallback(
    async (courseId: number, enabled: boolean): Promise<void> => {
      const key = courseId.toString();
      const current = boxZeroOverrides.custom[key];
      const shouldRemove = enabled === boxZeroDefaultEnabled;
      if (shouldRemove && current === undefined) {
        return;
      }
      if (!shouldRemove && current === enabled) {
        return;
      }
      const nextCustom = { ...boxZeroOverrides.custom };
      if (shouldRemove) {
        delete nextCustom[key];
      } else {
        nextCustom[key] = enabled;
      }
      await setBoxZeroOverrides({
        builtin: { ...boxZeroOverrides.builtin },
        custom: nextCustom,
      });
    },
    [boxZeroDefaultEnabled, boxZeroOverrides, setBoxZeroOverrides]
  );

  const getBuiltinCourseAutoflowEnabled = useCallback(
    ({ sourceLang, targetLang, level }: CourseBoxZeroKeyParams) => {
      const key = makeBuiltinCourseKey({ sourceLang, targetLang, level });
      const override = autoflowOverrides.builtin[key];
      return override ?? autoflowDefaultEnabled;
    },
    [autoflowDefaultEnabled, autoflowOverrides.builtin]
  );

  const setBuiltinCourseAutoflowEnabled = useCallback(
    async (
      params: CourseBoxZeroKeyParams,
      enabled: boolean
    ): Promise<void> => {
      const key = makeBuiltinCourseKey(params);
      const current = autoflowOverrides.builtin[key];
      const shouldRemove = enabled === autoflowDefaultEnabled;
      if (shouldRemove && current === undefined) {
        return;
      }
      if (!shouldRemove && current === enabled) {
        return;
      }
      const nextBuiltin = { ...autoflowOverrides.builtin };
      if (shouldRemove) {
        delete nextBuiltin[key];
      } else {
        nextBuiltin[key] = enabled;
      }
      await setAutoflowOverrides({
        builtin: nextBuiltin,
        custom: { ...autoflowOverrides.custom },
      });
    },
    [autoflowDefaultEnabled, autoflowOverrides, setAutoflowOverrides]
  );

  const getCustomCourseAutoflowEnabled = useCallback(
    (courseId: number) => {
      const key = courseId.toString();
      const override = autoflowOverrides.custom[key];
      return override ?? autoflowDefaultEnabled;
    },
    [autoflowDefaultEnabled, autoflowOverrides.custom]
  );

  const setCustomCourseAutoflowEnabled = useCallback(
    async (courseId: number, enabled: boolean): Promise<void> => {
      const key = courseId.toString();
      const current = autoflowOverrides.custom[key];
      const shouldRemove = enabled === autoflowDefaultEnabled;
      if (shouldRemove && current === undefined) {
        return;
      }
      if (!shouldRemove && current === enabled) {
        return;
      }
      const nextCustom = { ...autoflowOverrides.custom };
      if (shouldRemove) {
        delete nextCustom[key];
      } else {
        nextCustom[key] = enabled;
      }
      await setAutoflowOverrides({
        builtin: { ...autoflowOverrides.builtin },
        custom: nextCustom,
      });
    },
    [autoflowDefaultEnabled, autoflowOverrides, setAutoflowOverrides]
  );

  const getBuiltinCourseCardSize = useCallback(
    ({ sourceLang, targetLang, level }: CourseBoxZeroKeyParams) => {
      const key = makeBuiltinCourseKey({ sourceLang, targetLang, level });
      const override = cardSizeOverrides.builtin[key];
      return override ?? flashcardsCardSizeDefault;
    },
    [cardSizeOverrides.builtin, flashcardsCardSizeDefault]
  );

  const setBuiltinCourseCardSize = useCallback(
    async (
      params: CourseBoxZeroKeyParams,
      size: FlashcardsCardSize
    ): Promise<void> => {
      const key = makeBuiltinCourseKey(params);
      const current = cardSizeOverrides.builtin[key];
      const shouldRemove = size === flashcardsCardSizeDefault;
      if (shouldRemove && current === undefined) {
        return;
      }
      if (!shouldRemove && current === size) {
        return;
      }
      const nextBuiltin = { ...cardSizeOverrides.builtin };
      if (shouldRemove) {
        delete nextBuiltin[key];
      } else {
        nextBuiltin[key] = size;
      }
      await setCardSizeOverrides({
        builtin: nextBuiltin,
        custom: { ...cardSizeOverrides.custom },
      });
    },
    [cardSizeOverrides, flashcardsCardSizeDefault, setCardSizeOverrides]
  );

  const getCustomCourseCardSize = useCallback(
    (courseId: number) => {
      const key = courseId.toString();
      const override = cardSizeOverrides.custom[key];
      return override ?? flashcardsCardSizeDefault;
    },
    [cardSizeOverrides.custom, flashcardsCardSizeDefault]
  );

  const setCustomCourseCardSize = useCallback(
    async (courseId: number, size: FlashcardsCardSize): Promise<void> => {
      const key = courseId.toString();
      const current = cardSizeOverrides.custom[key];
      const shouldRemove = size === flashcardsCardSizeDefault;
      if (shouldRemove && current === undefined) {
        return;
      }
      if (!shouldRemove && current === size) {
        return;
      }
      const nextCustom = { ...cardSizeOverrides.custom };
      if (shouldRemove) {
        delete nextCustom[key];
      } else {
        nextCustom[key] = size;
      }
      await setCardSizeOverrides({
        builtin: { ...cardSizeOverrides.builtin },
        custom: nextCustom,
      });
    },
    [cardSizeOverrides, flashcardsCardSizeDefault, setCardSizeOverrides]
  );

  const getBuiltinCourseImageSize = useCallback(
    ({ sourceLang, targetLang, level }: CourseBoxZeroKeyParams) => {
      const key = makeBuiltinCourseKey({ sourceLang, targetLang, level });
      const override = imageSizeOverrides.builtin[key];
      return override ?? flashcardsImageSizeDefault;
    },
    [flashcardsImageSizeDefault, imageSizeOverrides.builtin]
  );

  const setBuiltinCourseImageSize = useCallback(
    async (
      params: CourseBoxZeroKeyParams,
      size: FlashcardsImageSize
    ): Promise<void> => {
      const key = makeBuiltinCourseKey(params);
      const current = imageSizeOverrides.builtin[key];
      const shouldRemove = size === flashcardsImageSizeDefault;
      if (shouldRemove && current === undefined) {
        return;
      }
      if (!shouldRemove && current === size) {
        return;
      }
      const nextBuiltin = { ...imageSizeOverrides.builtin };
      if (shouldRemove) {
        delete nextBuiltin[key];
      } else {
        nextBuiltin[key] = size;
      }
      await setImageSizeOverrides({
        builtin: nextBuiltin,
        custom: { ...imageSizeOverrides.custom },
      });
    },
    [flashcardsImageSizeDefault, imageSizeOverrides, setImageSizeOverrides]
  );

  const getCustomCourseImageSize = useCallback(
    (courseId: number) => {
      const key = courseId.toString();
      const override = imageSizeOverrides.custom[key];
      return override ?? flashcardsImageSizeDefault;
    },
    [flashcardsImageSizeDefault, imageSizeOverrides.custom]
  );

  const setCustomCourseImageSize = useCallback(
    async (courseId: number, size: FlashcardsImageSize): Promise<void> => {
      const key = courseId.toString();
      const current = imageSizeOverrides.custom[key];
      const shouldRemove = size === flashcardsImageSizeDefault;
      if (shouldRemove && current === undefined) {
        return;
      }
      if (!shouldRemove && current === size) {
        return;
      }
      const nextCustom = { ...imageSizeOverrides.custom };
      if (shouldRemove) {
        delete nextCustom[key];
      } else {
        nextCustom[key] = size;
      }
      await setImageSizeOverrides({
        builtin: { ...imageSizeOverrides.builtin },
        custom: nextCustom,
      });
    },
    [flashcardsImageSizeDefault, imageSizeOverrides, setImageSizeOverrides]
  );

  const getBuiltinCourseSkipCorrectionEnabled = useCallback(
    ({ sourceLang, targetLang, level }: CourseBoxZeroKeyParams) => {
      const key = makeBuiltinCourseKey({ sourceLang, targetLang, level });
      const override = skipCorrectionOverrides.builtin[key];
      return override ?? skipCorrectionDefaultEnabled;
    },
    [skipCorrectionDefaultEnabled, skipCorrectionOverrides.builtin]
  );

  const setBuiltinCourseSkipCorrectionEnabled = useCallback(
    async (
      params: CourseBoxZeroKeyParams,
      enabled: boolean
    ): Promise<void> => {
      const key = makeBuiltinCourseKey(params);
      const current = skipCorrectionOverrides.builtin[key];
      const shouldRemove = enabled === skipCorrectionDefaultEnabled;
      if (shouldRemove && current === undefined) {
        return;
      }
      if (!shouldRemove && current === enabled) {
        return;
      }
      const nextBuiltin = { ...skipCorrectionOverrides.builtin };
      if (shouldRemove) {
        delete nextBuiltin[key];
      } else {
        nextBuiltin[key] = enabled;
      }
      await setSkipCorrectionOverrides({
        builtin: nextBuiltin,
        custom: { ...skipCorrectionOverrides.custom },
      });
    },
    [skipCorrectionDefaultEnabled, skipCorrectionOverrides, setSkipCorrectionOverrides]
  );

  const getCustomCourseSkipCorrectionEnabled = useCallback(
    (courseId: number) => {
      const key = courseId.toString();
      const override = skipCorrectionOverrides.custom[key];
      return override ?? skipCorrectionDefaultEnabled;
    },
    [skipCorrectionDefaultEnabled, skipCorrectionOverrides.custom]
  );

  const setCustomCourseSkipCorrectionEnabled = useCallback(
    async (courseId: number, enabled: boolean): Promise<void> => {
      const key = courseId.toString();
      const current = skipCorrectionOverrides.custom[key];
      const shouldRemove = enabled === skipCorrectionDefaultEnabled;
      if (shouldRemove && current === undefined) {
        return;
      }
      if (!shouldRemove && current === enabled) {
        return;
      }
      const nextCustom = { ...skipCorrectionOverrides.custom };
      if (shouldRemove) {
        delete nextCustom[key];
      } else {
        nextCustom[key] = enabled;
      }
      await setSkipCorrectionOverrides({
        builtin: { ...skipCorrectionOverrides.builtin },
        custom: nextCustom,
      });
    },
    [skipCorrectionDefaultEnabled, skipCorrectionOverrides, setSkipCorrectionOverrides]
  );

  const getBuiltinCourseTrueFalseButtonsVariant = useCallback(
    ({ sourceLang, targetLang, level }: CourseBoxZeroKeyParams) => {
      const key = makeBuiltinCourseKey({ sourceLang, targetLang, level });
      const override = trueFalseButtonsOverrides.builtin[key];
      return override ?? trueFalseButtonsVariantDefault;
    },
    [trueFalseButtonsOverrides.builtin, trueFalseButtonsVariantDefault]
  );

  const setBuiltinCourseTrueFalseButtonsVariant = useCallback(
    async (
      params: CourseBoxZeroKeyParams,
      variant: TrueFalseButtonsVariant
    ): Promise<void> => {
      const key = makeBuiltinCourseKey(params);
      const current = trueFalseButtonsOverrides.builtin[key];
      const shouldRemove = variant === trueFalseButtonsVariantDefault;
      if (shouldRemove && current === undefined) {
        return;
      }
      if (!shouldRemove && current === variant) {
        return;
      }
      const nextBuiltin = { ...trueFalseButtonsOverrides.builtin };
      if (shouldRemove) {
        delete nextBuiltin[key];
      } else {
        nextBuiltin[key] = variant;
      }
      await setTrueFalseButtonsOverrides({
        builtin: nextBuiltin,
        custom: { ...trueFalseButtonsOverrides.custom },
      });
    },
    [
      setTrueFalseButtonsOverrides,
      trueFalseButtonsOverrides,
      trueFalseButtonsVariantDefault,
    ]
  );

  const getCustomCourseTrueFalseButtonsVariant = useCallback(
    (courseId: number) => {
      const key = courseId.toString();
      const override = trueFalseButtonsOverrides.custom[key];
      return override ?? trueFalseButtonsVariantDefault;
    },
    [trueFalseButtonsOverrides.custom, trueFalseButtonsVariantDefault]
  );

  const setCustomCourseTrueFalseButtonsVariant = useCallback(
    async (
      courseId: number,
      variant: TrueFalseButtonsVariant
    ): Promise<void> => {
      const key = courseId.toString();
      const current = trueFalseButtonsOverrides.custom[key];
      const shouldRemove = variant === trueFalseButtonsVariantDefault;
      if (shouldRemove && current === undefined) {
        return;
      }
      if (!shouldRemove && current === variant) {
        return;
      }
      const nextCustom = { ...trueFalseButtonsOverrides.custom };
      if (shouldRemove) {
        delete nextCustom[key];
      } else {
        nextCustom[key] = variant;
      }
      await setTrueFalseButtonsOverrides({
        builtin: { ...trueFalseButtonsOverrides.builtin },
        custom: nextCustom,
      });
    },
    [
      setTrueFalseButtonsOverrides,
      trueFalseButtonsOverrides,
      trueFalseButtonsVariantDefault,
    ]
  );

  const pinOfficialCourse = useCallback(
    async (id: number) => {
      if (pinnedOfficialCourseIds.includes(id)) return;
      await setPinnedOfficialCourseIds([...pinnedOfficialCourseIds, id]);
    },
    [pinnedOfficialCourseIds, setPinnedOfficialCourseIds]
  );

  const unpinOfficialCourse = useCallback(
    async (id: number) => {
      if (!pinnedOfficialCourseIds.includes(id)) return;
      await setPinnedOfficialCourseIds(
        pinnedOfficialCourseIds.filter((x) => x !== id)
      );
    },
    [pinnedOfficialCourseIds, setPinnedOfficialCourseIds]
  );

  useEffect(() => {
    if (activeCourseIdx != null && activeCustomCourseId != null) {
      void setActiveCustomCourseId(null);
    }
  }, [activeCourseIdx, activeCustomCourseId, setActiveCustomCourseId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [legacyCoursesRaw, legacyActiveIdxRaw, legacyCustomIdRaw] =
          await Promise.all([
            AsyncStorage.getItem("profiles"),
            AsyncStorage.getItem("activeProfileIdx"),
            AsyncStorage.getItem("activeCustomProfileId"),
          ]);

        if (!cancelled && legacyCoursesRaw && courses.length === 0) {
          try {
            const parsed = JSON.parse(legacyCoursesRaw) as LanguageCourse[];
            if (Array.isArray(parsed) && parsed.length > 0) {
              await setCourses(parsed);
            }
          } catch (error) {
            console.warn("[SettingsContext] Failed to migrate legacy profiles", error);
          } finally {
            await AsyncStorage.removeItem("profiles");
          }
        }

        if (!cancelled && legacyActiveIdxRaw && activeCourseIdx == null) {
          try {
            const parsedIdx = JSON.parse(legacyActiveIdxRaw);
            if (typeof parsedIdx === "number") {
              await setActiveCourseIdx(parsedIdx);
            }
          } catch (error) {
            console.warn(
              "[SettingsContext] Failed to migrate legacy activeProfileIdx",
              error
            );
          } finally {
            await AsyncStorage.removeItem("activeProfileIdx");
          }
        }

        if (!cancelled && legacyCustomIdRaw && activeCustomCourseId == null) {
          try {
            const parsedId = JSON.parse(legacyCustomIdRaw);
            if (typeof parsedId === "number") {
              await setActiveCustomCourseId(parsedId);
            }
          } catch (error) {
            console.warn(
              "[SettingsContext] Failed to migrate legacy activeCustomProfileId",
              error
            );
          } finally {
            await AsyncStorage.removeItem("activeCustomProfileId");
          }
        }
      } catch (error) {
        console.warn("[SettingsContext] Legacy migration failed", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    activeCourseIdx,
    activeCustomCourseId,
    courses.length,
    setActiveCourseIdx,
      setActiveCustomCourseId,
      pinnedOfficialCourseIds,
      pinOfficialCourse,
      unpinOfficialCourse,
    setCourses,
  ]);

  const addCourse = async (p: LanguageCourse) => {
    const existsIdx = findCourseIndex(courses, p);
    if (existsIdx !== -1) {
      const existing = courses[existsIdx];
      if (existing.level == null && p.level != null) {
        const updated = [...courses];
        updated[existsIdx] = { ...existing, ...p };
        await setCourses(updated);
      }
      return;
    }

    const newList = [...courses, p];
    await setCourses(newList);
  };

  const removeCourse = async (course: LanguageCourse) => {
    const indexToRemove = findCourseIndex(courses, course);
    if (indexToRemove === -1) {
      return;
    }

    const updatedCourses = courses.filter((_, idx) => idx !== indexToRemove);
    await setCourses(updatedCourses);

    if (activeCourseIdx == null) {
      return;
    }

    if (activeCourseIdx === indexToRemove) {
      await setActiveCourseIdx(null);
      return;
    }

    if (activeCourseIdx > indexToRemove) {
      await setActiveCourseIdx(activeCourseIdx - 1);
    }
  };

  const activeCourse =
    activeCourseIdx != null ? courses[activeCourseIdx] : null;

  useEffect(() => {
    if (!__DEV__) {
      return;
    }
    if (activeCustomCourseId != null) {
      console.log("[ActiveCourse] custom", { id: activeCustomCourseId });
      return;
    }
    if (activeCourse) {
      console.log("[ActiveCourse] builtin", {
        name: activeCourse.name,
        sourceLang: activeCourse.sourceLang,
        targetLang: activeCourse.targetLang,
        level: activeCourse.level ?? null,
      });
      return;
    }
    console.log("[ActiveCourse] none");
  }, [activeCourse, activeCustomCourseId]);

  const boxZeroEnabled = useMemo(() => {
    if (activeCustomCourseId != null) {
      return getCustomCourseBoxZeroEnabled(activeCustomCourseId);
    }
    if (activeCourseIdx != null) {
      const course = courses[activeCourseIdx];
      if (course) {
        return getBuiltinCourseBoxZeroEnabled({
          sourceLang: course.sourceLang,
          targetLang: course.targetLang,
          level: course.level ?? null,
        });
      }
    }
    return boxZeroDefaultEnabled;
  }, [
    activeCourseIdx,
    activeCustomCourseId,
    boxZeroDefaultEnabled,
    courses,
    getBuiltinCourseBoxZeroEnabled,
    getCustomCourseBoxZeroEnabled,
  ]);

  const autoflowEnabled = useMemo(() => {
    if (activeCustomCourseId != null) {
      return getCustomCourseAutoflowEnabled(activeCustomCourseId);
    }
    if (activeCourseIdx != null) {
      const course = courses[activeCourseIdx];
      if (course) {
        return getBuiltinCourseAutoflowEnabled({
          sourceLang: course.sourceLang,
          targetLang: course.targetLang,
          level: course.level ?? null,
        });
      }
    }
    return autoflowDefaultEnabled;
  }, [
    activeCourseIdx,
    activeCustomCourseId,
    autoflowDefaultEnabled,
    courses,
    getBuiltinCourseAutoflowEnabled,
    getCustomCourseAutoflowEnabled,
  ]);

  const flashcardsCardSize = useMemo(() => {
    if (activeCustomCourseId != null) {
      return getCustomCourseCardSize(activeCustomCourseId);
    }
    if (activeCourseIdx != null) {
      const course = courses[activeCourseIdx];
      if (course) {
        return getBuiltinCourseCardSize({
          sourceLang: course.sourceLang,
          targetLang: course.targetLang,
          level: course.level ?? null,
        });
      }
    }
    return flashcardsCardSizeDefault;
  }, [
    activeCourseIdx,
    activeCustomCourseId,
    courses,
    flashcardsCardSizeDefault,
    getBuiltinCourseCardSize,
    getCustomCourseCardSize,
  ]);

  const flashcardsImageSize = useMemo(() => {
    if (activeCustomCourseId != null) {
      return getCustomCourseImageSize(activeCustomCourseId);
    }
    if (activeCourseIdx != null) {
      const course = courses[activeCourseIdx];
      if (course) {
        return getBuiltinCourseImageSize({
          sourceLang: course.sourceLang,
          targetLang: course.targetLang,
          level: course.level ?? null,
        });
      }
    }
    return flashcardsImageSizeDefault;
  }, [
    activeCourseIdx,
    activeCustomCourseId,
    courses,
    flashcardsImageSizeDefault,
    getBuiltinCourseImageSize,
    getCustomCourseImageSize,
  ]);

  const skipCorrectionEnabled = useMemo(() => {
    if (activeCustomCourseId != null) {
      return getCustomCourseSkipCorrectionEnabled(activeCustomCourseId);
    }
    if (activeCourseIdx != null) {
      const course = courses[activeCourseIdx];
      if (course) {
        return getBuiltinCourseSkipCorrectionEnabled({
          sourceLang: course.sourceLang,
          targetLang: course.targetLang,
          level: course.level ?? null,
        });
      }
    }
    return skipCorrectionDefaultEnabled;
  }, [
    activeCourseIdx,
    activeCustomCourseId,
    courses,
    getBuiltinCourseSkipCorrectionEnabled,
    getCustomCourseSkipCorrectionEnabled,
    skipCorrectionDefaultEnabled,
  ]);

  const trueFalseButtonsVariant = useMemo(() => {
    if (activeCustomCourseId != null) {
      return getCustomCourseTrueFalseButtonsVariant(activeCustomCourseId);
    }
    if (activeCourseIdx != null) {
      const course = courses[activeCourseIdx];
      if (course) {
        return getBuiltinCourseTrueFalseButtonsVariant({
          sourceLang: course.sourceLang,
          targetLang: course.targetLang,
          level: course.level ?? null,
        });
      }
    }
    return trueFalseButtonsVariantDefault;
  }, [
    activeCourseIdx,
    activeCustomCourseId,
    courses,
    getBuiltinCourseTrueFalseButtonsVariant,
    getCustomCourseTrueFalseButtonsVariant,
    trueFalseButtonsVariantDefault,
  ]);

  const setFeedbackEnabled = async (value: boolean) => {
    await _setFeedbackEnabled(value);
  };

  const toggleFeedbackEnabled = async () => {
    await setFeedbackEnabled(!feedbackEnabledState);
  };

  const setFeedbackVolume = useCallback(
    async (value: number) => {
      const clamped = clampVolume(value);
      await _setFeedbackVolume(clamped);
      setSoundPlayerVolume(clamped);
    },
    [_setFeedbackVolume]
  );

  useEffect(() => {
    setSoundPlayerVolume(clampVolume(feedbackVolumeState));
  }, [feedbackVolumeState]);

  const setLearningRemindersEnabled = async (value: boolean) => {
    await _setLearningRemindersEnabled(value);
  };

  const toggleLearningRemindersEnabled = async () => {
    await setLearningRemindersEnabled(!learningRemindersEnabledState);
  };

  const setStatsFireEffectEnabled = async (value: boolean) => {
    await _setStatsFireEffectEnabled(value);
  };

  const toggleStatsFireEffectEnabled = async () => {
    await setStatsFireEffectEnabled(!statsFireEffectEnabledState);
  };

  const setStatsBookshelfEnabled = async (value: boolean) => {
    await _setStatsBookshelfEnabled(value);
  };

  const toggleStatsBookshelfEnabled = async () => {
    await setStatsBookshelfEnabled(!statsBookshelfEnabledState);
  };

  const toggleFlashcardsSuggestions = async () => {
    await setFlashcardsSuggestionsEnabled(!flashcardsSuggestionsEnabled);
  };

  const toggleQuotesEnabled = async () => {
    await setQuotesEnabled(!quotesEnabled);
  };

  const toggleHighContrast = async () => {
    await setHighContrastEnabled(!highContrastEnabled);
  };

  const toggleColorBlindMode = async () => {
    await setColorBlindMode(
      colorBlindMode === "none" ? "deuteranopia" : "none"
    );
  };

  const toggleLargeFont = async () => {
    await setLargeFontEnabled(!largeFontEnabled);
  };

  const setMemoryBoardSize = useCallback(
    async (size: MemoryBoardSize) => {
      await setRawMemoryBoardSize(size);
    },
    [setRawMemoryBoardSize]
  );

  const setLevel = useCallback(
    (lvl: CEFRLevel) => {
      void persistSelectedLevel(lvl);
    },
    [persistSelectedLevel]
  );

  const resetLearningSettings = useCallback(async () => {
    await Promise.all([
      setSpellChecking(true),
      setIgnoreDiacriticsInSpellcheck(false),
      setShowBoxFaces(true),
      _setBoxesLayout("classic"),
      setFlashcardsBatchSize(DEFAULT_FLASHCARDS_BATCH_SIZE),
      setFlashcardsSuggestionsEnabled(false),
      setFlashcardsCardSizeDefault("large"),
      setFlashcardsImageSizeDefault("dynamic"),
      _setLearningRemindersEnabled(false),
      _setFeedbackVolume(1),
    ]);
  }, [
    _setBoxesLayout,
    _setLearningRemindersEnabled,
    _setFeedbackVolume,
    setFlashcardsBatchSize,
    setFlashcardsCardSizeDefault,
    setFlashcardsImageSizeDefault,
    setIgnoreDiacriticsInSpellcheck,
    setFlashcardsSuggestionsEnabled,
    setShowBoxFaces,
    setSpellChecking,
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

  return (
    <SettingsContext.Provider
      value={{
        theme,
        colors,
        toggleTheme,
        boxesLayout,
        setBoxesLayout,
        actionButtonsPosition,
        setActionButtonsPosition,
        courses,
        addCourse,
        removeCourse,
        activeCourseIdx,
        setActiveCourseIdx,
        activeCourse,
        activeCustomCourseId,
        setActiveCustomCourseId,
        pinnedOfficialCourseIds,
        pinOfficialCourse,
        unpinOfficialCourse,
        selectedLevel,
        setLevel,
        spellChecking,
        toggleSpellChecking,
        ignoreDiacriticsInSpellcheck,
        toggleIgnoreDiacriticsInSpellcheck,
        showBoxFaces,
        toggleShowBoxFaces,
        boxZeroEnabled,
        getBuiltinCourseBoxZeroEnabled,
        setBuiltinCourseBoxZeroEnabled,
        getCustomCourseBoxZeroEnabled,
        setCustomCourseBoxZeroEnabled,
        autoflowEnabled,
        getBuiltinCourseAutoflowEnabled,
        setBuiltinCourseAutoflowEnabled,
        getCustomCourseAutoflowEnabled,
        setCustomCourseAutoflowEnabled,
        skipCorrectionEnabled,
        getBuiltinCourseSkipCorrectionEnabled,
        setBuiltinCourseSkipCorrectionEnabled,
        getCustomCourseSkipCorrectionEnabled,
        setCustomCourseSkipCorrectionEnabled,
        trueFalseButtonsVariant,
        getBuiltinCourseTrueFalseButtonsVariant,
        setBuiltinCourseTrueFalseButtonsVariant,
        getCustomCourseTrueFalseButtonsVariant,
        setCustomCourseTrueFalseButtonsVariant,
        resetLearningSettings,
        resetActiveCourseReviews,
        resetActiveCustomCourseReviews,
        flashcardsBatchSize,
        setFlashcardsBatchSize,
        flashcardsSuggestionsEnabled,
        toggleFlashcardsSuggestions,
        quotesEnabled,
        toggleQuotesEnabled,
        flashcardsCardSize,
        flashcardsCardSizeDefault,
        setFlashcardsCardSizeDefault,
        getBuiltinCourseCardSize,
        setBuiltinCourseCardSize,
        getCustomCourseCardSize,
        setCustomCourseCardSize,
        flashcardsImageSize,
        flashcardsImageSizeDefault,
        setFlashcardsImageSizeDefault,
        getBuiltinCourseImageSize,
        setBuiltinCourseImageSize,
        getCustomCourseImageSize,
        setCustomCourseImageSize,
        dailyGoal,
        setDailyGoal,
        feedbackEnabled: feedbackEnabledState,
        setFeedbackEnabled,
        toggleFeedbackEnabled,
        feedbackVolume: feedbackVolumeState,
        setFeedbackVolume,
        learningRemindersEnabled: learningRemindersEnabledState,
        setLearningRemindersEnabled,
        toggleLearningRemindersEnabled,
        statsFireEffectEnabled: statsFireEffectEnabledState,
        setStatsFireEffectEnabled,
        toggleStatsFireEffectEnabled,
        statsBookshelfEnabled: statsBookshelfEnabledState,
        setStatsBookshelfEnabled,
        toggleStatsBookshelfEnabled,
        highContrastEnabled,
        toggleHighContrast,
        colorBlindMode,
        toggleColorBlindMode,
        largeFontEnabled,
        toggleLargeFont,
        fontScaleMultiplier,
        memoryBoardSize,
        setMemoryBoardSize,
        accessibilityPreferences: {
          highContrastEnabled,
          colorBlindMode,
          largeFontEnabled,
        },
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
