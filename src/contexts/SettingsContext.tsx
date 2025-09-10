// src/contexts/SettingsContext.tsx
import { createContext, ReactNode, useContext, useState } from "react";
import { Theme, themeMap } from "../theme/theme";
import { usePersistedState } from "../hooks/usePersistedState";
import type { CEFRLevel } from "../types/language";
import { LanguageProfile } from "../types/profile";
import { DEFAULT_FLASHCARDS_BATCH_SIZE } from "../config/appConfig";

interface SettingsContextValue {
  theme: Theme;
  colors: (typeof themeMap)[Theme];
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
  flashcardsBatchSize: number;
  setFlashcardsBatchSize: (n: number) => Promise<void>;
}

export type CEFR = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

const defaultValue: SettingsContextValue = {
  theme: "light",
  colors: themeMap.light,
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
  flashcardsBatchSize: DEFAULT_FLASHCARDS_BATCH_SIZE,
  setFlashcardsBatchSize: async () => {},
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

  const [activeProfileIdx, setActiveProfileIdx] = usePersistedState<
    number | null
  >("activeProfileIdx", null);

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
  const colors = themeMap[theme];

  const boxesLayout = boxesLayoutState;
  const setBoxesLayout = async (layout: "classic" | "carousel") => {
    await _setBoxesLayout(layout);
  };

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
      if (activeProfileIdx == null)
        await setActiveProfileIdx(newList.length - 1);
    } else {
      if (activeProfileIdx == null) await setActiveProfileIdx(existsIdx);
    }
  };

  const activeProfile =
    activeProfileIdx != null ? profiles[activeProfileIdx] : null;

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
      selectedLevel,
      setLevel,
      spellChecking,
      toggleSpellChecking,
      showBoxFaces,
      toggleShowBoxFaces,
      flashcardsBatchSize,
      setFlashcardsBatchSize,
    }}
  >
    {children}
  </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
