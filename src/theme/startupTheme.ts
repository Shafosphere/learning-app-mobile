import AsyncStorage from "@react-native-async-storage/async-storage";

import { resolveThemeColors, type Theme } from "./theme";

const STARTUP_THEME_STORAGE_KEY = "theme";

export interface StartupThemeUi {
  theme: Theme;
  backgroundColor: string;
  surfaceColor: string;
  primaryTextColor: string;
  secondaryTextColor: string;
  primaryButtonBackgroundColor: string;
  primaryButtonTextColor: string;
  secondaryButtonBackgroundColor: string;
  secondaryButtonTextColor: string;
  ghostButtonBackgroundColor: string;
  ghostButtonBorderColor: string;
  ghostButtonTextColor: string;
  errorTextColor: string;
  errorBadgeBackgroundColor: string;
  errorBadgeTextColor: string;
  shadowColor: string;
  statusBarStyle: "light" | "dark";
}

export function normalizeStoredTheme(value: string | null): Theme {
  if (value == null) {
    return "light";
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed === "light" || parsed === "dark") {
      return parsed;
    }
  } catch {
    if (value === "light" || value === "dark") {
      return value;
    }
  }

  return "light";
}

export async function loadStartupTheme(): Promise<Theme> {
  const raw = await AsyncStorage.getItem(STARTUP_THEME_STORAGE_KEY);
  return normalizeStoredTheme(raw);
}

export function getStartupThemeUi(theme: Theme): StartupThemeUi {
  const colors = resolveThemeColors(theme);

  return {
    theme,
    backgroundColor: colors.background,
    surfaceColor: colors.secondBackground,
    primaryTextColor: colors.headline,
    secondaryTextColor: colors.paragraph,
    primaryButtonBackgroundColor: colors.my_green,
    primaryButtonTextColor: colors.darkbg,
    secondaryButtonBackgroundColor: colors.my_yellow,
    secondaryButtonTextColor: colors.darkbg,
    ghostButtonBackgroundColor: colors.secondBackground,
    ghostButtonBorderColor: colors.border,
    ghostButtonTextColor: colors.headline,
    errorTextColor: colors.my_red,
    errorBadgeBackgroundColor:
      theme === "dark" ? `${colors.my_yellow}24` : "#fef3c7",
    errorBadgeTextColor: theme === "dark" ? colors.my_yellow : "#92400e",
    shadowColor: colors.darkbg,
    statusBarStyle: theme === "dark" ? "light" : "dark",
  };
}
