import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, render, waitFor } from "@testing-library/react-native";
import { memo } from "react";

import {
  SettingsProvider,
  useCourseSelectionActions,
  usePinnedOfficialCourseIds,
  useSettings,
} from "../SettingsContext";

// Keep real selection, persistence, theme and preferences; isolate unrelated effects.
jest.mock("@/src/db/sqlite/db", () => ({ resetCustomReviewsForCourse: jest.fn() }));
jest.mock("../settings/useLocaleSettings", () => ({ useLocaleSettings: () => ({}) }));
jest.mock("../settings/useAudioFeedbackSettings", () => ({ useAudioFeedbackSettings: () => ({}) }));
jest.mock("../settings/useCourseOverrideSettings", () => ({ useCourseOverrideSettings: () => ({}) }));
jest.mock("../settings/useLearningReminderSettings", () => ({ useLearningReminderSettings: () => ({}) }));
jest.mock("../settings/useGoogleDriveBackupSettings", () => ({ useGoogleDriveBackupSettings: () => ({}) }));

function setup() {
  let settings!: ReturnType<typeof useSettings>;
  let pinned!: ReturnType<typeof usePinnedOfficialCourseIds>;
  let actions!: ReturnType<typeof useCourseSelectionActions>;
  let pinnedRenders = 0;
  let actionRenders = 0;
  let parentRenders = 0;
  const PinnedConsumer = memo(function PinnedConsumer() {
    pinned = usePinnedOfficialCourseIds();
    pinnedRenders += 1;
    return null;
  });
  const ActionConsumer = memo(function ActionConsumer() {
    actions = useCourseSelectionActions();
    actionRenders += 1;
    return null;
  });
  function Parent() {
    settings = useSettings();
    parentRenders += 1;
    // Recreate children to verify context stability even under a broad subscriber.
    return <><PinnedConsumer /><ActionConsumer /></>;
  }
  render(<SettingsProvider><Parent /></SettingsProvider>);
  return {
    get settings() { return settings; },
    get pinned() { return pinned; },
    get actions() { return actions; },
    get renders() { return { pinned: pinnedRenders, actions: actionRenders, parent: parentRenders }; },
  };
}

async function hydrate(app: ReturnType<typeof setup>) {
  await waitFor(() => {
    expect(app.settings.activeCustomCourseIdHydrated).toBe(true);
    expect(app.settings.customCourseEntrySettingsSeenHydrated).toBe(true);
  });
  await act(async () => {});
}

beforeEach(async () => { await AsyncStorage.clear(); });

it("keeps scoped values and selection callbacks stable across hydration and unrelated updates", async () => {
  const app = setup();
  const initialActions = app.actions;
  const initialPinned = app.pinned;
  const setActiveCourseIdx = app.settings.setActiveCourseIdx;
  await hydrate(app);
  expect(app.actions).toBe(initialActions);
  expect(app.pinned).toBe(initialPinned);
  const baseline = app.renders;

  for (const change of [
    () => app.settings.setActiveCustomCourseId(42),
    () => app.settings.setActiveCustomCourseId(43),
    () => app.settings.setActiveCourseIdx(0),
    () => app.settings.setActiveCourseIdx(1),
    () => app.settings.setDailyGoal(30),
    () => app.settings.toggleTheme(),
    () => app.settings.toggleHighContrast(),
    () => app.settings.toggleLargeFont(),
  ]) {
    const before = app.renders.parent;
    await act(async () => { await change(); });
    expect(app.renders.parent).toBeGreaterThan(before);
    expect(app.renders.pinned).toBe(baseline.pinned);
    expect(app.renders.actions).toBe(baseline.actions);
    expect(app.actions).toBe(initialActions);
    expect(app.pinned).toBe(initialPinned);
    expect(app.actions.setActiveCustomCourseId).toBe(app.settings.setActiveCustomCourseId);
    expect(app.settings.setActiveCourseIdx).toBe(setActiveCourseIdx);
  }

  await act(async () => { await app.actions.setActiveCustomCourseId(99); });
  expect(app.settings.activeCustomCourseId).toBe(99);
  expect(app.settings.activeCourseIdx).toBeNull();
  expect(await AsyncStorage.getItem("activeCustomCourseId")).toBe("99");
});

it("hydrates and publishes pinned changes without invalidating the action context", async () => {
  await AsyncStorage.setItem("officialPinnedCourseIds", "[21]");
  const app = setup();
  const actions = app.actions;
  await hydrate(app);
  expect(app.pinned).toEqual([21]);
  expect(app.pinned).toBe(app.settings.pinnedOfficialCourseIds);
  const actionRenders = app.renders.actions;

  for (const [change, expected] of [
    [() => app.settings.pinOfficialCourse(22), [21, 22]],
    [() => app.settings.unpinOfficialCourse(21), [22]],
  ] as const) {
    const before = app.renders.pinned;
    await act(async () => { await change(); });
    expect(app.pinned).toEqual(expected);
    expect(app.pinned).toBe(app.settings.pinnedOfficialCourseIds);
    expect(app.renders.pinned).toBeGreaterThan(before);
    expect(app.actions).toBe(actions);
    expect(app.renders.actions).toBe(actionRenders);
    expect(await AsyncStorage.getItem("officialPinnedCourseIds")).toBe(JSON.stringify(expected));
  }

  const pinned = app.pinned;
  const before = app.renders.pinned;
  await act(async () => {
    await app.settings.pinOfficialCourse(22);
    await app.settings.unpinOfficialCourse(21);
  });
  expect(app.pinned).toBe(pinned);
  expect(app.renders.pinned).toBe(before);
});

it("provides matching defaults outside SettingsProvider", () => {
  function Consumer() {
    const settings = useSettings();
    expect(usePinnedOfficialCourseIds()).toBe(settings.pinnedOfficialCourseIds);
    expect(useCourseSelectionActions().setActiveCustomCourseId).toBe(settings.setActiveCustomCourseId);
    return null;
  }
  render(<Consumer />);
});
