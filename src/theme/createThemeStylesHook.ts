// src/contexts/createThemeStylesHook.ts
import { useMemo } from "react";
import {
  StyleSheet,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useSettings } from "../contexts/SettingsContext";
import type { ThemeColors } from "./theme";

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

type AccessibilityPreferences = ReturnType<typeof useSettings>["accessibilityPreferences"];

type StylesMap<T> = (
  colors: ThemeColors,
  accessibility: AccessibilityPreferences
) => T;

function scaleFontStyles<T>(styles: T, multiplier: number): T {
  if (multiplier === 1) return styles;

  const scaled: Partial<Record<keyof T, T[keyof T]>> = {};

  for (const key in styles) {
    const value = styles[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const styleValue: Record<string, unknown> = { ...value };

      if (typeof styleValue.fontSize === "number") {
        styleValue.fontSize = (styleValue.fontSize as number) * multiplier;
      }

      if (typeof styleValue.lineHeight === "number") {
        styleValue.lineHeight = (styleValue.lineHeight as number) * multiplier;
      }

      scaled[key] = styleValue as T[keyof T];
    } else {
      scaled[key] = value;
    }
  }

  return scaled as T;
}

export function createThemeStylesHook<
  T extends NamedStyles<T> | NamedStyles<any>
>(stylesMap: StylesMap<T>) {
  return function useStyles() {
    const { colors, accessibilityPreferences, fontScaleMultiplier } =
      useSettings();

    return useMemo(
      () =>
        StyleSheet.create<T>(
          scaleFontStyles(
            stylesMap(colors, accessibilityPreferences),
            fontScaleMultiplier
          )
        ),
      [colors, accessibilityPreferences, fontScaleMultiplier]
    );
  };
}
