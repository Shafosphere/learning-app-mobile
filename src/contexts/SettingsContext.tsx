import { createContext, ReactNode, useContext, useState } from "react";
import { Theme, themeMap } from "../theme/theme";

interface SettingsContextValue {
  theme: Theme;
  colors: (typeof themeMap)[Theme];
  toggleTheme: () => void;
}

const defaultValue: SettingsContextValue = {
  theme: "light",
  colors: themeMap.light,
  toggleTheme: () => {},
};

const SettingsContext = createContext<SettingsContextValue>(defaultValue);

export function SettingsProvider({children}: {children: ReactNode} ) {
    const [theme, setTheme] = useState<Theme>('light');
    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
    const colors = themeMap[theme];

    return(
        <SettingsContext.Provider value={{theme, colors, toggleTheme}}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
  return useContext(SettingsContext)
}