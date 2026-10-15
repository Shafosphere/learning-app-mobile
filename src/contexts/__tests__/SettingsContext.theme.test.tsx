import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, render, waitFor } from "@testing-library/react-native";
import { memo, type ReactNode } from "react";
import { Text } from "react-native";

import { SettingsProvider, useSettings, useThemeSettings } from "../SettingsContext";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { resolveThemeColors, type Theme } from "@/src/theme/theme";

// Keep real theme, persistence, course selection, learning preferences and stats.
// Isolate native/database/notification/backup effects unrelated to subscriptions.
jest.mock("@/src/db/sqlite/db", () => ({ resetCustomReviewsForCourse: jest.fn() }));
jest.mock("../settings/useLocaleSettings", () => ({ useLocaleSettings: () => ({}) }));
jest.mock("../settings/useAudioFeedbackSettings", () => ({ useAudioFeedbackSettings: () => ({}) }));
jest.mock("../settings/useCourseOverrideSettings", () => ({ useCourseOverrideSettings: () => ({}) }));
jest.mock("../settings/useLearningReminderSettings", () => ({ useLearningReminderSettings: () => ({}) }));
jest.mock("../settings/useGoogleDriveBackupSettings", () => ({ useGoogleDriveBackupSettings: () => ({}) }));

const useStyles = createThemeStylesHook((colors, accessibility) => ({
  text: {
    color: colors.headline,
    backgroundColor: colors.background,
    fontSize: 20,
    lineHeight: 24,
    textAlign: accessibility.dominantHand === "right" ? "right" : "left",
  },
}));

function setup(initialTheme: Theme = "light") {
  let settings!: ReturnType<typeof useSettings>;
  let theme!: ReturnType<typeof useThemeSettings>;
  let styles!: ReturnType<typeof useStyles>;
  let themeRenders = 0;
  let styleRenders = 0;
  let parentRenders = 0;

  const ThemeConsumer = memo(function ThemeConsumer() {
    theme = useThemeSettings();
    themeRenders += 1;
    return null;
  });
  const StyleConsumer = memo(function StyleConsumer() {
    styles = useStyles();
    styleRenders += 1;
    return <Text testID="styled" style={styles.text}>Theme</Text>;
  });
  function SettingsConsumerParent() {
    settings = useSettings();
    parentRenders += 1;
    // Recreate children on every broad-context update. Memo isolates parent
    // renders, while theme context changes must still reach both consumers.
    return <><ThemeConsumer /><StyleConsumer /></>;
  }

  const screen = render(
    <SettingsProvider initialTheme={initialTheme}>
      <SettingsConsumerParent />
    </SettingsProvider>
  );
  return {
    screen,
    get settings() { return settings; },
    get theme() { return theme; },
    get styles() { return styles; },
    get renders() { return { theme: themeRenders, styles: styleRenders, parent: parentRenders }; },
  };
}

async function hydrate(app: ReturnType<typeof setup>) {
  await waitFor(() => {
    expect(app.settings.activeCustomCourseIdHydrated).toBe(true);
    expect(app.settings.customCourseEntrySettingsSeenHydrated).toBe(true);
  });
  await act(async () => {});
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

it("isolates theme and generated styles from official/custom course and unrelated settings updates", async () => {
  const app = setup();
  await hydrate(app);
  await act(async () => {
    await app.settings.addCourse({ sourceLang: "en", targetLang: "pl", sourceLangId: 1, targetLangId: 2 });
  });
  const theme = app.theme;
  const styles = app.styles;
  const baseline = app.renders;

  for (const { update, expected } of [
    { update: () => app.settings.setActiveCourseIdx(0), expected: { activeCourseIdx: 0, activeCustomCourseId: null } },
    { update: () => app.settings.setActiveCustomCourseId(42), expected: { activeCourseIdx: null, activeCustomCourseId: 42 } },
    { update: () => app.settings.setActiveCustomCourseId(43), expected: { activeCourseIdx: null, activeCustomCourseId: 43 } },
    { update: () => app.settings.setActiveCourseIdx(0), expected: { activeCourseIdx: 0, activeCustomCourseId: null } },
    { update: () => app.settings.setDailyGoal(30), expected: { dailyGoal: 30 } },
    { update: () => app.settings.toggleStatsBookshelfEnabled(), expected: { statsBookshelfEnabled: true } },
  ]) {
    const previousParentRenders = app.renders.parent;
    await act(async () => { await update(); });
    expect(app.settings).toMatchObject(expected);
    expect(app.renders.parent).toBeGreaterThan(previousParentRenders);
    expect(app.theme).toBe(theme);
    expect(app.styles).toBe(styles);
    expect(app.renders.theme).toBe(baseline.theme);
    expect(app.renders.styles).toBe(baseline.styles);
  }
  expect(app.renders.parent).toBeGreaterThan(baseline.parent);
  expect(app.settings.activeCourseIdx).toBe(0);
  expect(app.settings.activeCustomCourseId).toBeNull();
  expect(app.settings.activeCourse?.targetLang).toBe("pl");
  expect(app.settings.dailyGoal).toBe(30);
  expect(app.settings.statsBookshelfEnabled).toBe(true);
  expect(await AsyncStorage.getItem("activeCourseIdx")).toBe("0");
  expect(await AsyncStorage.getItem("activeCustomCourseId")).toBe("null");
});

it("keeps both APIs synchronized and updates memoized consumers for every theme/accessibility preference", async () => {
  const app = setup();
  await hydrate(app);
  const changes: (() => Promise<void>)[] = [
    () => app.settings.toggleTheme(),
    () => app.theme.toggleTheme(),
    () => app.settings.toggleTheme(),
    () => app.theme.toggleHighContrast(),
    () => app.settings.toggleHighContrast(),
    () => app.theme.toggleHighContrast(),
    () => app.settings.setColorBlindMode("protanopia"),
    () => app.theme.toggleColorBlindMode(),
    () => app.settings.toggleLargeFont(),
    () => app.theme.toggleLargeFont(),
    () => app.settings.toggleLargeFont(),
    () => app.theme.toggleCorrectionErrorMarkers(),
    () => app.settings.toggleCorrectionErrorMarkers(),
    () => app.theme.toggleCorrectionErrorMarkers(),
    () => app.settings.setDominantHand("right"),
  ];
  for (const change of changes) {
    const previousTheme = app.theme;
    const previousRenders = app.renders;
    await act(async () => { await change(); });
    expect(app.theme).not.toBe(previousTheme);
    expect(app.renders.theme).toBeGreaterThan(previousRenders.theme);
    expect(app.renders.styles).toBeGreaterThan(previousRenders.styles);
    for (const key of Object.keys(app.theme) as (keyof typeof app.theme)[]) {
      expect(app.settings[key]).toBe(app.theme[key]);
    }
    expect(app.styles.text.color).toBe(app.theme.colors.headline);
    expect(app.styles.text.backgroundColor).toBe(app.theme.colors.background);
    expect(app.styles.text.fontSize).toBe(20 * app.theme.fontScaleMultiplier);
    expect(app.styles.text.lineHeight).toBe(24 * app.theme.fontScaleMultiplier);
    expect(app.theme.colors).toEqual(resolveThemeColors(app.theme.theme, {
      highContrast: app.theme.highContrastEnabled,
      colorBlindMode: app.theme.colorBlindMode,
    }));
  }
  expect(app.theme.theme).toBe("dark");
  expect(app.theme.highContrastEnabled).toBe(true);
  expect(app.theme.colorBlindMode).toBe("tritanopia");
  expect(app.theme.fontScaleMultiplier).toBe(1.15);
  expect(app.theme.correctionErrorMarkersEnabled).toBe(false);
  expect(app.styles.text.textAlign).toBe("right");

  expect(await AsyncStorage.multiGet([
    "theme", "accessibility.highContrast", "accessibility.colorBlindMode",
    "accessibility.largeFont", "accessibility.correctionErrorMarkers", "accessibility.dominantHand",
  ])).toEqual([
    ["theme", '"dark"'], ["accessibility.highContrast", "true"],
    ["accessibility.colorBlindMode", '"tritanopia"'], ["accessibility.largeFont", "true"],
    ["accessibility.correctionErrorMarkers", "false"], ["accessibility.dominantHand", '"right"'],
  ]);
  const savedTheme = app.theme;
  app.screen.unmount();
  const restored = setup();
  await hydrate(restored);
  expect(restored.theme.theme).toBe(savedTheme.theme);
  expect(restored.theme.colors).toEqual(savedTheme.colors);
  expect(restored.theme.accessibilityPreferences).toEqual(savedTheme.accessibilityPreferences);
  expect(restored.theme.fontScaleMultiplier).toBe(savedTheme.fontScaleMultiplier);
});

it("uses initialTheme immediately, then hydrates stored theme and accessibility", async () => {
  await AsyncStorage.multiSet([
    ["theme", '"light"'], ["accessibility.highContrast", "true"],
    ["accessibility.colorBlindMode", '"deuteranopia"'], ["accessibility.largeFont", "true"],
  ]);
  const app = setup("dark");
  expect(app.theme.theme).toBe("dark");
  expect(app.styles.text.color).toBe(resolveThemeColors("dark").headline);
  await hydrate(app);
  expect(app.theme.theme).toBe("light");
  expect(app.theme.colors).toEqual(resolveThemeColors("light", { highContrast: true, colorBlindMode: "deuteranopia" }));
  expect(app.styles.text.fontSize).toBe(23);
  expect(app.styles.text.lineHeight).toBe(24 * 1.15);
  expect(app.settings.colors).toBe(app.theme.colors);
});

it("retains initialTheme when no theme is stored", async () => {
  const app = setup("dark");
  await hydrate(app);
  expect(app.settings.theme).toBe("dark");
  expect(app.theme.theme).toBe("dark");
  expect(await AsyncStorage.getItem("theme")).toBeNull();
});

it("retains a stable theme value even when an un-memoized child renders with its parent", async () => {
  let settings!: ReturnType<typeof useSettings>;
  const values: ReturnType<typeof useThemeSettings>[] = [];
  function Child() {
    values.push(useThemeSettings());
    return null;
  }
  function Parent() {
    settings = useSettings();
    return <Child />;
  }
  render(<SettingsProvider><Parent /></SettingsProvider>);
  await waitFor(() => expect(settings.activeCustomCourseIdHydrated).toBe(true));
  const before = values.length;
  const theme = values[before - 1];
  await act(async () => { await settings.setActiveCustomCourseId(42); });
  expect(values.length).toBeGreaterThan(before);
  expect(values.slice(before).every(value => value === theme)).toBe(true);
});

it("provides matching defaults outside SettingsProvider", () => {
  function Consumer({ children }: { children?: ReactNode }) {
    const settings = useSettings();
    const theme = useThemeSettings();
    expect(theme.colors).toBe(settings.colors);
    expect(theme.toggleTheme).toBe(settings.toggleTheme);
    expect(theme.accessibilityPreferences).toBe(settings.accessibilityPreferences);
    return <>{children}</>;
  }
  render(<Consumer />);
});
