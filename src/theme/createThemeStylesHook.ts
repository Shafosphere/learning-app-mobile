// src/contexts/createThemeStylesHook.ts
import { useMemo } from 'react';
import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';
import { useSettings } from '../contexts/SettingsContext';
import type { ThemeColors } from './theme';

// utility type: każda właściwość T musi być stylem RN
type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

type StylesMap<T> = (colors: ThemeColors) => T;

// Teraz T musi rozszerzać NamedStyles<T>
export function createThemeStylesHook<
  T extends NamedStyles<T> | NamedStyles<any>
>(stylesMap: StylesMap<T>) {
  return function useStyles() {
    const { colors } = useSettings();
    return useMemo(
      () =>
        StyleSheet.create<T>(stylesMap(colors)),
      [colors]
    );
  };
}
