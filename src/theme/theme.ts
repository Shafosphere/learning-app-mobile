// src/theme/theme.ts

// Typy motywu
export type Theme = 'light' | 'dark';

export interface ThemeColors {
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

// Twoje zmienne z CSS przerobione na JS
export const lightColors: ThemeColors = {
  background: '#f2f4f6',
  secondBackground: '#fffffe',
  headline: '#00214d',
  paragraph: '#1b2d45',
  my_green: '#00ebc7',
  my_red: '#ff5470',
  my_yellow: '#fde24f',
  border: '#e9e9e9',
  font: '#00214d',  
  darkbg: '#001534',
  lightbg: '#fffffe',
};

export const darkColors: ThemeColors = {
  background: '#001534',
  secondBackground: '#1b2d45',
  headline: '#fffffe',
  paragraph: '#b7c9e4',
  my_green: '#00caacff',
  my_red: '#ce3b53ff',
  my_yellow: '#ebd247ff',
  border: '#00214d',
  font: '#00214d',
  darkbg: '#001534',
  lightbg: '#fffffe',
};

// Mapowanie motywu na kolory
export const themeMap: Record<Theme, ThemeColors> = {
  light: lightColors,
  dark: darkColors,
};
