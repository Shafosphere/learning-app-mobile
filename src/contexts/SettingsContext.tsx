// src/contexts/SettingsContext.tsx
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useEffect,
} from "react";
import {
  resolveThemeColors,
  Theme,
  ThemeColors,
  ColorBlindMode,
} from "../theme/theme";
import { MemoryBoardSize } from "../constants/memoryGame";
import { usePersistedState } from "../hooks/usePersistedState";
import type { CEFRLevel } from "../types/language";
import { LanguageCourse } from "../types/course";
import { DEFAULT_FLASHCARDS_BATCH_SIZE } from "../config/appConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

interface SettingsContextValue {
  theme: Theme;
  colors: ThemeColors;
  toggleTheme: () => Promise<void>;
  boxesLayout: "classic" | "carousel";
  setBoxesLayout: (layout: "classic" | "carousel") => Promise<void>;
  courses: LanguageCourse[];
  addCourse: (course: LanguageCourse) => Promise<void>;
  removeCourse: (course: LanguageCourse) => Promise<void>;
  selectedLevel: CEFRLevel;
  setLevel: (lvl: CEFRLevel) => void;
  spellChecking: boolean;
  toggleSpellChecking: () => Promise<void>;
  showBoxFaces: boolean;
  toggleShowBoxFaces: () => Promise<void>;
  activeCourseIdx: number | null; // NEW
  setActiveCourseIdx: (i: number | null) => Promise<void>; // NEW
  activeCourse: LanguageCourse | null;
  activeCustomCourseId: number | null;
  setActiveCustomCourseId: (id: number | null) => Promise<void>;
  flashcardsBatchSize: number;
  setFlashcardsBatchSize: (n: number) => Promise<void>;
  dailyGoal: number;
  setDailyGoal: (n: number) => Promise<void>;
  feedbackEnabled: boolean;
  setFeedbackEnabled: (value: boolean) => Promise<void>;
  toggleFeedbackEnabled: () => Promise<void>;
  learningRemindersEnabled: boolean;
  setLearningRemindersEnabled: (value: boolean) => Promise<void>;
  toggleLearningRemindersEnabled: () => Promise<void>;
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

const defaultValue: SettingsContextValue = {
  theme: "light",
  colors: resolveThemeColors("light"),
  toggleTheme: async () => {},
  boxesLayout: "carousel",
  setBoxesLayout: async () => {},
  courses: [],
  addCourse: async () => {},
  removeCourse: async () => {},
  selectedLevel: "A1",
  setLevel: (_lvl: CEFRLevel) => {},
  spellChecking: true,
  toggleSpellChecking: async () => {},
  showBoxFaces: true,
  toggleShowBoxFaces: async () => {},
  activeCourseIdx: null,
  setActiveCourseIdx: async () => {},
  activeCourse: null,
  activeCustomCourseId: null,
  setActiveCustomCourseId: async () => {},
  flashcardsBatchSize: DEFAULT_FLASHCARDS_BATCH_SIZE,
  setFlashcardsBatchSize: async () => {},
  dailyGoal: 20,
  setDailyGoal: async () => {},
  feedbackEnabled: true,
  setFeedbackEnabled: async () => {},
  toggleFeedbackEnabled: async () => {},
  learningRemindersEnabled: false,
  setLearningRemindersEnabled: async () => {},
  toggleLearningRemindersEnabled: async () => {},
  highContrastEnabled: false,
  toggleHighContrast: async () => {},
  colorBlindMode: "none",
  toggleColorBlindMode: async () => {},
  largeFontEnabled: false,
  toggleLargeFont: async () => {},
  fontScaleMultiplier: 1,
  memoryBoardSize: "large",
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
  >("boxesLayout", "carousel");
  const [courses, setCourses] = usePersistedState<LanguageCourse[]>(
    "courses",
    []
  );

  const [activeCourseIdx, setActiveCourseIdxState] = usePersistedState<
    number | null
  >("activeCourseIdx", null);

  const [activeCustomCourseId, setActiveCustomCourseIdState] =
    usePersistedState<number | null>("activeCustomCourseId", null);

  console.log(courses);
  const [spellChecking, setSpellChecking] = usePersistedState<boolean>(
    "spellChecking",
    true
  );
  const [showBoxFaces, setShowBoxFaces] = usePersistedState<boolean>(
    "showBoxFaces",
    true
  );
  const [flashcardsBatchSize, setFlashcardsBatchSize] =
    usePersistedState<number>(
      "flashcardsBatchSize",
      DEFAULT_FLASHCARDS_BATCH_SIZE
    );
  const [dailyGoal, setDailyGoal] = usePersistedState<number>("dailyGoal", 20);
  const [feedbackEnabledState, _setFeedbackEnabled] =
    usePersistedState<boolean>("feedbackEnabled", true);
  const [learningRemindersEnabledState, _setLearningRemindersEnabled] =
    usePersistedState<boolean>("learningRemindersEnabled", false);
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
  const [memoryBoardSize, setMemoryBoardSizeState] =
    usePersistedState<MemoryBoardSize>("memory.boardSize", "large");
  const toggleSpellChecking = async () => {
    await setSpellChecking(!spellChecking);
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

  const fontScaleMultiplier = largeFontEnabled ? 1.15 : 1;

  const boxesLayout = boxesLayoutState;
  const setBoxesLayout = async (layout: "classic" | "carousel") => {
    await _setBoxesLayout(layout);
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

  const setFeedbackEnabled = async (value: boolean) => {
    await _setFeedbackEnabled(value);
  };

  const toggleFeedbackEnabled = async () => {
    await setFeedbackEnabled(!feedbackEnabledState);
  };

  const setLearningRemindersEnabled = async (value: boolean) => {
    await _setLearningRemindersEnabled(value);
  };

  const toggleLearningRemindersEnabled = async () => {
    await setLearningRemindersEnabled(!learningRemindersEnabledState);
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
      await setMemoryBoardSizeState(size);
    },
    [setMemoryBoardSizeState]
  );

  const setLevel = useCallback(
    (lvl: CEFRLevel) => {
      void persistSelectedLevel(lvl);
    },
    [persistSelectedLevel]
  );

  return (
    <SettingsContext.Provider
      value={{
        theme,
        colors,
        toggleTheme,
        boxesLayout,
        setBoxesLayout,
        courses,
        addCourse,
        removeCourse,
        activeCourseIdx,
        setActiveCourseIdx,
        activeCourse,
        activeCustomCourseId,
        setActiveCustomCourseId,
        selectedLevel,
        setLevel,
        spellChecking,
        toggleSpellChecking,
        showBoxFaces,
        toggleShowBoxFaces,
        flashcardsBatchSize,
        setFlashcardsBatchSize,
        dailyGoal,
        setDailyGoal,
        feedbackEnabled: feedbackEnabledState,
        setFeedbackEnabled,
        toggleFeedbackEnabled,
        learningRemindersEnabled: learningRemindersEnabledState,
        setLearningRemindersEnabled,
        toggleLearningRemindersEnabled,
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
