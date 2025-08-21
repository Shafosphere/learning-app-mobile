// src/contexts/SettingsContext.tsx
import { createContext, ReactNode, useContext, useState } from "react";
import { Theme, themeMap } from "../theme/theme";
import { usePersistedState } from "../hooks/usePersistedState";
import type { CEFRLevel } from "../types/language";
import { LanguageProfile } from "../types/profile";

interface SettingsContextValue {
  theme: Theme;
  colors: (typeof themeMap)[Theme];
  toggleTheme: () => Promise<void>;
  profiles: LanguageProfile[];
  addProfile: (profile: LanguageProfile) => Promise<void>;
  selectedLevel: CEFRLevel;
  setLevel: (lvl: CEFRLevel) => void;
  spellChecking: boolean;
  toggleSpellChecking: () => Promise<void>;
  activeProfileIdx: number | null; // NEW
  setActiveProfileIdx: (i: number | null) => Promise<void>; // NEW
  activeProfile: LanguageProfile | null;
}

export type CEFR = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

const defaultValue: SettingsContextValue = {
  theme: "light",
  colors: themeMap.light,
  toggleTheme: async () => {},
  profiles: [],
  addProfile: async () => {},
  selectedLevel: "A1",
  setLevel: (_lvl: CEFRLevel) => {},
  spellChecking: true,
  toggleSpellChecking: async () => {},
  activeProfileIdx: null,
  setActiveProfileIdx: async () => {},
  activeProfile: null,
};

const SettingsContext = createContext<SettingsContextValue>(defaultValue);
export const SettingsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [selectedLevel, setLevel] = useState<CEFRLevel>("A1");
  const [theme, setTheme] = usePersistedState<Theme>("theme", "light");
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
  const toggleSpellChecking = async () => {
    await setSpellChecking(!spellChecking);
  };
  const toggleTheme = async () => {
    const newTheme: Theme = theme === "light" ? "dark" : "light";
    await setTheme(newTheme);
  };
  const colors = themeMap[theme];

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
        profiles,
        addProfile,
        activeProfileIdx,
        setActiveProfileIdx,
        activeProfile,
        selectedLevel,
        setLevel,
        spellChecking,
        toggleSpellChecking,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
