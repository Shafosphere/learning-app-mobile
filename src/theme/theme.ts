// src/theme/theme.ts

// Typy motywu
export type Theme = "light" | "dark";

export type ColorBlindMode =
  | "none"
  | "deuteranopia"
  | "protanopia"
  | "tritanopia";

export interface ThemePalette {
  background: string;
  secondBackground: string;
  headline: string;
  paragraph: string;
  my_green: string;
  my_red: string;
  my_yellow: string;
  border: string;
  font: string;
  darkbg: string;
  lightbg: string;
}

type ThemePaletteOverrides = Partial<ThemePalette>;

export interface ThemeColors extends ThemePalette {
  variants: {
    highContrast: ThemePaletteOverrides;
    deuteranopia: ThemePaletteOverrides;
    protanopia: ThemePaletteOverrides;
    tritanopia: ThemePaletteOverrides;
  };
}

const lightBasePalette: ThemePalette = {
  background: "#f2f4f6",
  secondBackground: "#fffffe",
  headline: "#00214d",
  paragraph: "#1b2d45",
  my_green: "#00ebc7",
  my_red: "#ff5470",
  my_yellow: "#fde24f",
  border: "#e9e9e9",
  font: "#00214d",
  darkbg: "#001534",
  lightbg: "#fffffe",
};

const darkBasePalette: ThemePalette = {
  background: "#001534",
  secondBackground: "#1b2d45",
  headline: "#fffffe",
  paragraph: "#b7c9e4",
  my_green: "#00caacff",
  my_red: "#ce3b53ff",
  my_yellow: "#ebd247ff",
  border: "#00214d",
  font: "#00214d",
  darkbg: "#001534",
  lightbg: "#fffffe",
};

const lightColors: ThemeColors = {
  ...lightBasePalette,
  variants: {
    highContrast: {
      background: "#ffffff",
      secondBackground: "#f7f9fc",
      headline: "#000000",
      paragraph: "#121212",
      border: "#000000",
      my_green: "#006f5b",
      my_red: "#9c0033",
      my_yellow: "#c28a00",
      font: "#000000",
    },
    deuteranopia: {
      my_green: "#1f77b4",
      my_red: "#d95f02",
      my_yellow: "#ffd92f",
    },
    protanopia: {
      my_green: "#1e88e5",
      my_red: "#ef6c00",
      my_yellow: "#ffd54f",
    },
    tritanopia: {
      my_green: "#2e7d32",
      my_red: "#d81b60",
      my_yellow: "#8e24aa",
    },
  },
};

const darkColors: ThemeColors = {
  ...darkBasePalette,
  variants: {
    highContrast: {
      background: "#000000",
      secondBackground: "#0c0c0c",
      headline: "#ffffff",
      paragraph: "#ffffff",
      border: "#ffffff",
      my_green: "#00f5d4",
      my_red: "#ff5d73",
      my_yellow: "#ffd166",
      font: "#ffffff",
    },
    deuteranopia: {
      my_green: "#00bcd4",
      my_red: "#ff9100",
      my_yellow: "#ffd166",
    },
    protanopia: {
      my_green: "#4fc3f7",
      my_red: "#ffb74d",
      my_yellow: "#ffe082",
    },
    tritanopia: {
      my_green: "#81c784",
      my_red: "#f06292",
      my_yellow: "#ba68c8",
    },
  },
};

export const themeMap: Record<Theme, ThemeColors> = {
  light: lightColors,
  dark: darkColors,
};

interface ThemeResolutionOptions {
  highContrast?: boolean;
  colorBlindMode?: ColorBlindMode;
}

const DEFAULT_THEME_RESOLUTION: Required<ThemeResolutionOptions> = {
  highContrast: false,
  colorBlindMode: "none",
};

export function resolveThemeColors(
  theme: Theme,
  options: ThemeResolutionOptions = DEFAULT_THEME_RESOLUTION
): ThemeColors {
  const base = themeMap[theme];
  const { highContrast = false, colorBlindMode = "none" } = options;

  const overrides: ThemePaletteOverrides = {};

  if (colorBlindMode !== "none") {
    Object.assign(overrides, base.variants[colorBlindMode]);
  }

  if (highContrast) {
    Object.assign(overrides, base.variants.highContrast);
  }

  return {
    ...base,
    ...overrides,
    variants: base.variants,
  };
}

export type ThemeColorKey = keyof ThemePalette;
