import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, router } from "expo-router";
import {
  act,
  cleanup,
  fireEvent,
  renderRouter,
  screen,
  waitFor,
} from "expo-router/testing-library";
import { FlatList, StyleSheet, Text } from "react-native";

import StartupIndexRoute from "../index";
import { renderHomeTile } from "@/src/components/home/flatList";
import { SettingsProvider, useSettings } from "@/src/contexts/SettingsContext";
import i18n from "@/src/i18n";

// Keep real settings subscriptions, persistence, locale, styles, Home and router.
// Native/database/notification/backup effects are outside this regression.
jest.mock("@/src/db/sqlite/db", () => ({ resetCustomReviewsForCourse: jest.fn() }));
jest.mock("@/src/contexts/settings/useAudioFeedbackSettings", () => ({ useAudioFeedbackSettings: () => ({}) }));
jest.mock("@/src/contexts/settings/useCourseOverrideSettings", () => ({ useCourseOverrideSettings: () => ({}) }));
jest.mock("@/src/contexts/settings/useLearningReminderSettings", () => ({ useLearningReminderSettings: () => ({}) }));
jest.mock("@/src/contexts/settings/useGoogleDriveBackupSettings", () => ({ useGoogleDriveBackupSettings: () => ({}) }));

jest.mock("@/src/components/home/flatList", () => {
  const actual = jest.requireActual<typeof import("@/src/components/home/flatList")>("@/src/components/home/flatList");
  return {
    ...actual,
    renderHomeTile: jest.fn((...args: Parameters<typeof actual.renderHomeTile>) =>
      jest.fn(actual.renderHomeTile(...args)),
    ),
  };
});

let settings: ReturnType<typeof useSettings>;

function SettingsProbe() {
  settings = useSettings();
  return null;
}

function Layout() {
  return (
    <SettingsProvider>
      <SettingsProbe />
      {/* Fabric leaves the previous screen unfrozen. Do not let freezing mask subscriptions. */}
      <Stack screenOptions={{ headerShown: false, animation: "none", freezeOnBlur: false }} />
    </SettingsProvider>
  );
}

async function startHome() {
  const app = renderRouter({
    _layout: Layout,
    index: StartupIndexRoute,
    "coursepanel/index": () => <Text>Course panel</Text>,
  });
  await waitFor(() => {
    expect(settings.activeCustomCourseIdHydrated).toBe(true);
    expect(settings.uiLanguage).toBe("en");
    expect(screen.getByTestId("home-grid-viewport")).toBeTruthy();
  });
  await act(async () => {});
  fireEvent(screen.getByTestId("home-grid-viewport"), "layout", {
    nativeEvent: { layout: { x: 0, y: 0, width: 372, height: 430 } },
  });
  return app;
}

function grid() {
  return screen.UNSAFE_getByType(FlatList);
}

function homeWork() {
  return {
    renders: jest.mocked(renderHomeTile).mock.calls.length,
    tiles: jest.mocked(renderHomeTile).mock.results.reduce(
      (count, result) => count + (result.value as jest.Mock).mock.calls.length,
      0,
    ),
  };
}

beforeAll(async () => {
  if (!i18n.isInitialized) {
    await new Promise<void>((resolve) => i18n.on("initialized", () => resolve()));
  }
});

beforeEach(async () => {
  await AsyncStorage.clear();
  await AsyncStorage.multiSet([
    ["activeCustomCourseId", "11"],
    ["uiLanguage", '"en"'],
    ["courses", JSON.stringify([
      { sourceLang: "en", targetLang: "pl", sourceLangId: 1, targetLangId: 2 },
      { sourceLang: "pl", targetLang: "en", sourceLangId: 2, targetLangId: 1 },
    ])],
  ]);
  await i18n.changeLanguage("en");
  jest.clearAllMocks();
});

afterEach(() => {
  cleanup();
  jest.useRealTimers();
});

it("does no Home render or tile work for course changes while blurred, and retains the grid on return", async () => {
  const app = await startHome();
  const initialGrid = grid();
  const initialData = initialGrid.props.data;
  const initialStyle = initialGrid.props.style;
  expect(initialGrid.props.scrollEnabled).toBe(true);

  act(() => router.push("/coursepanel"));
  expect(app.getPathname()).toBe("/coursepanel");
  const baseline = homeWork();
  expect(baseline.renders).toBeGreaterThan(0);
  expect(baseline.tiles).toBeGreaterThan(0);
  for (const change of [
    () => settings.setActiveCustomCourseId(12),
    () => settings.setActiveCustomCourseId(13),
    () => settings.setActiveCourseIdx(0),
    () => settings.setActiveCourseIdx(1),
    () => settings.setActiveCustomCourseId(14),
  ]) {
    await act(async () => { await change(); });
    expect(homeWork()).toEqual(baseline);
    expect(grid()).toBe(initialGrid);
    expect(grid().props.data).toBe(initialData);
    expect(grid().props.style).toBe(initialStyle);
    expect(app.getPathname()).toBe("/coursepanel");
  }
  expect(settings.activeCustomCourseId).toBe(14);
  expect(settings.activeCourseIdx).toBeNull();
  expect(await AsyncStorage.getItem("activeCustomCourseId")).toBe("14");

  act(() => router.back());
  expect(app.getPathname()).toBe("/");
  expect(homeWork()).toEqual(baseline);
  expect(grid()).toBe(initialGrid);
  expect(grid().props.scrollEnabled).toBe(true);
  expect(StyleSheet.flatten(grid().props.style)).toEqual(StyleSheet.flatten(initialStyle));
  expect(settings.activeCustomCourseId).toBe(14);
});

it("keeps theme, accessibility and language live while blurred and on return", async () => {
  const app = await startHome();
  const initialGrid = grid();
  const titleKey = "repeats.labels.courses";
  const initialTitle = i18n.t(titleKey);
  const initialTitleStyle = StyleSheet.flatten(screen.getByText(initialTitle).props.style);
  act(() => router.push("/coursepanel"));

  for (const change of [
    () => settings.toggleTheme(),
    () => settings.toggleHighContrast(),
    () => settings.setColorBlindMode("deuteranopia"),
  ]) {
    await act(async () => { await change(); });
    expect(StyleSheet.flatten(screen.getByText(initialTitle, { includeHiddenElements: true }).props.style).color)
      .toBe(settings.colors.headline);
  }
  await act(async () => { await settings.toggleLargeFont(); });
  expect(StyleSheet.flatten(screen.getByText(initialTitle, { includeHiddenElements: true }).props.style).fontSize)
    .toBe(initialTitleStyle.fontSize * 1.15);
  expect(jest.mocked(renderHomeTile).mock.lastCall?.[1].tileSize).toBe(178);

  await act(async () => { await settings.setUiLanguage("pl"); });
  expect(i18n.resolvedLanguage).toBe("pl");
  const latestTitle = i18n.t(titleKey);
  expect(latestTitle).not.toBe(initialTitle);
  expect(screen.getByText(latestTitle, { includeHiddenElements: true })).toBeTruthy();
  expect(app.getPathname()).toBe("/coursepanel");

  act(() => router.back());
  expect(grid()).toBe(initialGrid);
  expect(screen.getByText(latestTitle)).toBeTruthy();
});
