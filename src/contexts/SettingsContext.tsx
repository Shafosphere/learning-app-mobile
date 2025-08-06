// src/contexts/SettingsContext.tsx
import { createContext, ReactNode, useContext } from "react";
import { Theme, themeMap } from "../theme/theme";
import { usePersistedState } from "../hooks/usePersistedState";

interface SettingsContextValue {
  theme: Theme;
  colors: (typeof themeMap)[Theme];
  toggleTheme: () => Promise<void>;
}

const defaultValue: SettingsContextValue = {
  theme: "light",
  colors: themeMap.light,
  toggleTheme: async () => {},
};

const SettingsContext = createContext<SettingsContextValue>(defaultValue);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [theme, setTheme] = usePersistedState<Theme>("theme", "light");

  const toggleTheme = async () => {
    const newTheme: Theme = theme === "light" ? "dark" : "light";
    await setTheme(newTheme);
  };
  const colors = themeMap[theme];

  return (
    <SettingsContext.Provider value={{ theme, colors, toggleTheme }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
