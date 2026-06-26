import { useCallback, useEffect, useMemo, useRef } from "react";
import { StyleProp, Text, TextProps, TextStyle } from "react-native";

import { usePersistedState } from "@/src/hooks/usePersistedState";
import {
  ColorBlindMode,
  resolveThemeColors,
  Theme,
} from "@/src/theme/theme";
import type { DominantHand } from "./types";

type TextWithDefaultProps = typeof Text & {
  defaultProps?: TextProps & {
    style?: StyleProp<TextStyle>;
  };
};

function useTextDefaultColor(color: string) {
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
      style: [...baseArray, { color }],
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
  }, [color]);
}

export function useThemeAccessibilitySettings(initialTheme: Theme) {
  const [theme, setTheme] = usePersistedState<Theme>("theme", initialTheme);
  const [highContrastEnabled, setHighContrastEnabled] =
    usePersistedState<boolean>("accessibility.highContrast", false);
  const [colorBlindMode, setColorBlindModeState] =
    usePersistedState<ColorBlindMode>("accessibility.colorBlindMode", "none");
  const [largeFontEnabled, setLargeFontEnabled] = usePersistedState<boolean>(
    "accessibility.largeFont",
    false
  );
  const [correctionErrorMarkersEnabled, setCorrectionErrorMarkersEnabled] =
    usePersistedState<boolean>("accessibility.correctionErrorMarkers", true);
  const [dominantHand, setDominantHandState] = usePersistedState<DominantHand>(
    "accessibility.dominantHand",
    "center"
  );

  const toggleTheme = useCallback(async () => {
    const newTheme: Theme = theme === "light" ? "dark" : "light";
    await setTheme(newTheme);
  }, [setTheme, theme]);

  const colors = useMemo(
    () =>
      resolveThemeColors(theme, {
        highContrast: highContrastEnabled,
        colorBlindMode,
      }),
    [theme, highContrastEnabled, colorBlindMode]
  );

  useTextDefaultColor(colors.headline);

  const toggleHighContrast = useCallback(async () => {
    await setHighContrastEnabled(!highContrastEnabled);
  }, [highContrastEnabled, setHighContrastEnabled]);

  const setColorBlindMode = useCallback(
    async (mode: ColorBlindMode) => {
      await setColorBlindModeState(mode);
    },
    [setColorBlindModeState]
  );

  const toggleColorBlindMode = useCallback(async () => {
    const order: ColorBlindMode[] = [
      "none",
      "deuteranopia",
      "protanopia",
      "tritanopia",
    ];
    const currentIndex = order.indexOf(colorBlindMode);
    const safeIndex = currentIndex === -1 ? 0 : currentIndex;
    const nextMode = order[(safeIndex + 1) % order.length];
    await setColorBlindMode(nextMode);
  }, [colorBlindMode, setColorBlindMode]);

  const toggleLargeFont = useCallback(async () => {
    await setLargeFontEnabled(!largeFontEnabled);
  }, [largeFontEnabled, setLargeFontEnabled]);

  const toggleCorrectionErrorMarkers = useCallback(async () => {
    await setCorrectionErrorMarkersEnabled(!correctionErrorMarkersEnabled);
  }, [correctionErrorMarkersEnabled, setCorrectionErrorMarkersEnabled]);

  const setDominantHand = useCallback(
    async (hand: DominantHand) => {
      await setDominantHandState(hand);
    },
    [setDominantHandState]
  );

  const fontScaleMultiplier = largeFontEnabled ? 1.15 : 1;
  const accessibilityPreferences = useMemo(
    () => ({
      highContrastEnabled,
      colorBlindMode,
      largeFontEnabled,
      correctionErrorMarkersEnabled,
      dominantHand,
    }),
    [
      colorBlindMode,
      correctionErrorMarkersEnabled,
      dominantHand,
      highContrastEnabled,
      largeFontEnabled,
    ]
  );

  return {
    theme,
    colors,
    toggleTheme,
    highContrastEnabled,
    toggleHighContrast,
    colorBlindMode,
    setColorBlindMode,
    toggleColorBlindMode,
    largeFontEnabled,
    toggleLargeFont,
    correctionErrorMarkersEnabled,
    toggleCorrectionErrorMarkers,
    dominantHand,
    setDominantHand,
    fontScaleMultiplier,
    accessibilityPreferences,
  };
}
