// src/contexts/SettingsContext.tsx
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";
import {
  resolveThemeColors,
  Theme,
  ThemeColors,
  ColorBlindMode,
} from "../theme/theme";
import { usePersistedState } from "../hooks/usePersistedState";
import type { CEFRLevel } from "../types/language";
import { LanguageProfile } from "../types/profile";
import { DEFAULT_FLASHCARDS_BATCH_SIZE } from "../config/appConfig";

interface SettingsContextValue {
  theme: Theme;
  colors: ThemeColors;
  toggleTheme: () => Promise<void>;
  boxesLayout: "classic" | "carousel";
  setBoxesLayout: (layout: "classic" | "carousel") => Promise<void>;
  profiles: LanguageProfile[];
  addProfile: (profile: LanguageProfile) => Promise<void>;
  selectedLevel: CEFRLevel;
  setLevel: (lvl: CEFRLevel) => void;
  spellChecking: boolean;
  toggleSpellChecking: () => Promise<void>;
  showBoxFaces: boolean;
  toggleShowBoxFaces: () => Promise<void>;
  activeProfileIdx: number | null; // NEW
  setActiveProfileIdx: (i: number | null) => Promise<void>; // NEW
  activeProfile: LanguageProfile | null;
  activeCustomProfileId: number | null;
  setActiveCustomProfileId: (id: number | null) => Promise<void>;
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
  profiles: [],
  addProfile: async () => {},
  selectedLevel: "A1",
  setLevel: (_lvl: CEFRLevel) => {},
  spellChecking: true,
  toggleSpellChecking: async () => {},
  showBoxFaces: true,
  toggleShowBoxFaces: async () => {},
  activeProfileIdx: null,
  setActiveProfileIdx: async () => {},
  activeProfile: null,
  activeCustomProfileId: null,
  setActiveCustomProfileId: async () => {},
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
  const [selectedLevel, setLevel] = useState<CEFRLevel>("A1");
  const [theme, setTheme] = usePersistedState<Theme>("theme", "light");
  const [boxesLayoutState, _setBoxesLayout] = usePersistedState<
    "classic" | "carousel"
  >("boxesLayout", "carousel");
  const [profiles, setProfiles] = usePersistedState<LanguageProfile[]>(
    "profiles",
    []
  );

  const [activeProfileIdx, setActiveProfileIdxState] = usePersistedState<
    number | null
  >("activeProfileIdx", null);

  const [activeCustomProfileId, setActiveCustomProfileIdState] =
    usePersistedState<number | null>("activeCustomProfileId", null);

  console.log(profiles);
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

  const setActiveProfileIdx = useCallback(
    async (idx: number | null) => {
      if (idx != null) {
        await setActiveCustomProfileIdState(null);
      }
      await setActiveProfileIdxState(idx);
    },
    [setActiveCustomProfileIdState, setActiveProfileIdxState]
  );

  const setActiveCustomProfileId = useCallback(
    async (profileId: number | null) => {
      if (profileId != null) {
        await setActiveProfileIdxState(null);
      }
      await setActiveCustomProfileIdState(profileId);
    },
    [setActiveCustomProfileIdState, setActiveProfileIdxState]
  );

  useEffect(() => {
    if (activeProfileIdx != null && activeCustomProfileId != null) {
      void setActiveCustomProfileId(null);
    }
  }, [activeProfileIdx, activeCustomProfileId, setActiveCustomProfileId]);

  const addProfile = async (p: LanguageProfile) => {
    const existsIdx = profiles.findIndex(
      (x) =>
        (p.sourceLangId &&
          p.targetLangId &&
          x.sourceLangId === p.sourceLangId &&
          x.targetLangId === p.targetLangId) ||
        (!p.sourceLangId &&
          !p.targetLangId &&
          x.sourceLang === p.sourceLang &&
          x.targetLang === p.targetLang)
    );
    if (existsIdx === -1) {
      const newList = [...profiles, p];
      await setProfiles(newList);
      if (activeProfileIdx == null && activeCustomProfileId == null)
        await setActiveProfileIdx(newList.length - 1);
    } else {
      if (activeProfileIdx == null && activeCustomProfileId == null)
        await setActiveProfileIdx(existsIdx);
    }
  };

  const activeProfile =
    activeProfileIdx != null ? profiles[activeProfileIdx] : null;

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

  return (
    <SettingsContext.Provider
      value={{
        theme,
        colors,
        toggleTheme,
        boxesLayout,
        setBoxesLayout,
        profiles,
        addProfile,
        activeProfileIdx,
        setActiveProfileIdx,
        activeProfile,
        activeCustomProfileId,
        setActiveCustomProfileId,
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
