// src/contexts/SettingsContext.tsx
import { createContext, ReactNode, useContext, useState } from "react";
import { Theme, themeMap } from "../theme/theme";
import { usePersistedState } from "../hooks/usePersistedState";

interface SettingsContextValue {
  theme: Theme;
  colors: (typeof themeMap)[Theme];
  toggleTheme: () => Promise<void>;
  profiles: LanguageProfile[];
  addProfile: (profile: LanguageProfile) => Promise<void>;
  selectedLevel: string;
  setLevel: (lvl: string) => void;
  spellChecking: boolean;
  toggleSpellChecking: () => Promise<void>;
}

export interface LanguageProfile {
  sourceLang: string;
  targetLang: string;
}

const defaultValue: SettingsContextValue = {
  theme: "light",
  colors: themeMap.light,
  toggleTheme: async () => {},
  profiles: [],
  addProfile: async () => {},
  selectedLevel: "A1",
  setLevel: () => {},
  spellChecking: true,
  toggleSpellChecking: async () => {},
};

const SettingsContext = createContext<SettingsContextValue>(defaultValue);
const [spellChecking, setSpellChecking] = usePersistedState<boolean>(
  "spellChecking",
  true
);

const toggleSpellChecking = async () => {
  await setSpellChecking(!spellChecking);
};

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [selectedLevel, setLevel] = useState<string>("A1");
  const [theme, setTheme] = usePersistedState<Theme>("theme", "light");
  const [profiles, setProfiles] = usePersistedState<LanguageProfile[]>(
    "profiles",
    []
  );

  const toggleTheme = async () => {
    const newTheme: Theme = theme === "light" ? "dark" : "light";
    await setTheme(newTheme);
  };
  const colors = themeMap[theme];

  const addProfile = async (profile: LanguageProfile) => {
    const exists = profiles.some(
      (p) =>
        p.sourceLang === profile.sourceLang &&
        p.targetLang === profile.targetLang
    );
    if (!exists) {
      await setProfiles([...profiles, profile]);
    }
    console.log(profiles);
  };

  return (
    <SettingsContext.Provider
      value={{
        theme,
        colors,
        toggleTheme,
        profiles,
        addProfile,
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
