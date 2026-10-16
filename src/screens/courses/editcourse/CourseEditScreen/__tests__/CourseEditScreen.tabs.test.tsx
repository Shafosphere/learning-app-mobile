import { completePagerSelection } from "@/src/components/settings/testing/completePagerSelection";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import CourseEditScreen from "../CourseEditScreen";
import { useSettings } from "@/src/contexts/SettingsContext";
import { defaultValue } from "@/src/contexts/settings/defaults";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCourseOverrideSettings } from "@/src/contexts/settings/useCourseOverrideSettings";

const mockStorageWrite = (AsyncStorage.setItem as jest.Mock).getMockImplementation()!;
beforeEach(() => {
  (AsyncStorage.setItem as jest.Mock).mockReset().mockImplementation(mockStorageWrite);
  mockPopup.mockClear();
});
const mockPopup = jest.fn();
jest.mock("@/src/contexts/PopupContext", () => ({ usePopup: () => mockPopup }));
const mockBack = jest.fn();
const mockParams = {
  name: "Test course",
  sourceLang: "en",
  targetLang: "pl",
  level: "A1",
};
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ back: mockBack }),
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock(
  "@expo/vector-icons/Ionicons",
  () =>
    function MockCustomCourseEditor() {
      return null;
    },
);
jest.mock("@/src/contexts/SettingsContext", () => {
  const useSettings = jest.fn();
  return { useSettings, useThemeSettings: useSettings };
});
jest.mock(
  "@/src/components/courseEditor/CustomCourseEditor",
  () =>
    function MockCustomCourseEditor() {
      return null;
    },
);
jest.mock("@/src/db/sqlite/db", () => ({
  getCustomCourseBySlug: jest.fn(async () => null),
  resetCustomReviewsForCourse: jest.fn(),
  setCustomCourseReviewsEnabled: jest.fn(),
}));

it("keeps all built-in course categories reachable and persists choices through original setter", async () => {
  let cardSize = "large";
  const setBuiltinCourseCardSize = jest.fn(async (_params, value) => { cardSize = value; });
  (useSettings as jest.Mock).mockReturnValue({
    ...defaultValue,
    getBuiltinCourseCardSize: () => cardSize,
    setBuiltinCourseCardSize,
  });
  const screen = render(<CourseEditScreen />);
  expect(
    screen.getByRole("tab", {
      name: "courseSettingsGroups.learning.title",
      selected: true,
    }),
  ).toBeTruthy();
  for (const category of [
    "answers",
    "audio",
    "appearance",
    "progress",
    "learning",
  ]) {
    fireEvent.press(
      screen.getByRole("tab", {
        name: `courseSettingsGroups.${category}.title`,
      }),
    );
    completePagerSelection(category);
    expect(
      screen.getByRole("header", {
        name: `courseSettingsGroups.${category}.title`,
      }),
    ).toBeTruthy();
    fireEvent.press(
      screen.getByRole("button", { name: "repeats.a11y.backToCoursesPanel" }),
    );
  }
  expect(mockBack).toHaveBeenCalledTimes(5);
  fireEvent.press(
    screen.getByRole("tab", { name: "courseSettingsGroups.appearance.title" }),
  );
  completePagerSelection("appearance");
  const name =
    "components.courseEditor.settingsCourse.title.rozmiarFiszki, components.courseEditor.settingsCourse.title.mala, components.courseEditor.settingsCourse.subtitle.tekstZostaje";
  fireEvent.press(screen.getByRole("button", { name }));
  await waitFor(() =>
    expect(setBuiltinCourseCardSize).toHaveBeenCalledWith(
      { sourceLang: "en", targetLang: "pl", level: "A1" },
      "small",
    ),
  );
  fireEvent.press(
    screen.getByRole("tab", { name: "courseSettingsGroups.learning.title" }),
  );
  completePagerSelection("learning");
  fireEvent.press(
    screen.getByRole("tab", { name: "courseSettingsGroups.appearance.title" }),
  );
  completePagerSelection("appearance");
  expect(screen.getByRole("button", { name, selected: true })).toBeTruthy();
  mockParams.name = "Another test course";
  screen.rerender(<CourseEditScreen />);
  expect(screen.getByRole("tab", { name: "courseSettingsGroups.learning.title", selected: true })).toBeTruthy();
});

it("restores a built-in manifest's defaults and saves its reviews flag immediately", async () => {
  const { OFFICIAL_PACKS } = jest.requireActual("@/src/constants/officialPacks");
  const { getCustomCourseBySlug, setCustomCourseReviewsEnabled } = jest.requireMock("@/src/db/sqlite/db");
  const { resolveCourseSettingsDefaults } = jest.requireActual("@/src/contexts/settings/courseSettingsDefaults");
  const pack = OFFICIAL_PACKS.find((pack: { slug: string }) => pack.slug === "eng_to_pl_first_50");
  mockParams.name = pack.name;
  getCustomCourseBySlug.mockResolvedValue({ id: 7, reviewsEnabled: false });
  let boxZeroEnabled = false;
  const resetBuiltinCourseSettings = jest.fn(async (_params, values) => { boxZeroEnabled = values.boxZeroEnabled; });
  (useSettings as jest.Mock).mockReturnValue({ ...defaultValue, getBuiltinCourseBoxZeroEnabled: () => boxZeroEnabled, resetBuiltinCourseSettings, courseSettingsResetHydrated: true });
  const screen = render(<CourseEditScreen />);
  fireEvent.press(screen.getByRole("tab", { name: "courseSettingsGroups.progress.title" }));
  completePagerSelection("progress");
  fireEvent.press(screen.getByRole("button", { name: "courseSettingsReset.action" }));
  expect(resetBuiltinCourseSettings).not.toHaveBeenCalled();
  fireEvent.press(screen.getAllByRole("button", { name: "courseSettingsReset.action" }).slice(-1)[0]);
  await waitFor(() => expect(screen.getByText("courseSettingsReset.doneTitle")).toBeTruthy());
  expect(resetBuiltinCourseSettings).toHaveBeenCalledWith({ sourceLang: "en", targetLang: "pl", level: "A1" }, resolveCourseSettingsDefaults(pack));
  expect(setCustomCourseReviewsEnabled).toHaveBeenCalledWith(7, pack.reviewsEnabled, { seedCompletedReviews: false });
  fireEvent.press(screen.getByRole("button", { name: "courseSettingsReset.ok" }));
  fireEvent.press(screen.getByRole("tab", { name: "courseSettingsGroups.learning.title" }));
  completePagerSelection("learning");
  expect(screen.getByRole("switch", { name: "components.courseEditor.settingsCourse.accessibilityLabel.przelaczFazeZapoznania" })).toHaveAccessibilityState({ checked: true });
});


function PersistedBuiltinEditor() {
  const settings = useCourseOverrideSettings({ courses: [], activeCourseIdx: null, activeCustomCourseId: null });
  (useSettings as jest.Mock).mockReturnValue({ ...defaultValue, ...settings });
  return <CourseEditScreen />;
}

it("shows optimistic changes and restores the saved built-in value when storage rejects", async () => {
  await AsyncStorage.clear();
  const screen = render(<PersistedBuiltinEditor />);
  // Readiness includes all override stores used by the editor.
  await waitFor(() => expect((useSettings as jest.Mock)().courseSettingsResetHydrated).toBe(true));
  const label = "components.courseEditor.settingsCourse.accessibilityLabel.przelaczAutomatFiszek";
  expect(screen.getByRole("switch", { name: label })).toHaveAccessibilityState({ checked: true });
  let reject!: (error: Error) => void;
  const write = jest.spyOn(AsyncStorage, "setItem").mockImplementationOnce(() => new Promise<void>((_resolve, no) => { reject = no; }));
  const log = jest.spyOn(console, "error").mockImplementation(() => {});
  try {
    fireEvent.press(screen.getByRole("switch", { name: label }));
    await waitFor(() => expect(screen.getByRole("switch", { name: label })).toHaveAccessibilityState({ checked: false }));
    await act(async () => { reject(new Error("Disk full")); });
    expect(screen.getByRole("switch", { name: label })).toHaveAccessibilityState({ checked: true });
    expect(mockPopup).toHaveBeenCalledWith(expect.objectContaining({ color: "angry" }));
  } finally {
    write.mockReset().mockImplementation(mockStorageWrite);
    log.mockRestore();
  }
});

it("persists the latest built-in toggle while an earlier write is delayed", async () => {
  await AsyncStorage.clear();
  const screen = render(<PersistedBuiltinEditor />);
  await waitFor(() => expect((useSettings as jest.Mock)().courseSettingsResetHydrated).toBe(true));
  let finish!: () => void;
  const write = jest.spyOn(AsyncStorage, "setItem").mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
  const label = "components.courseEditor.settingsCourse.accessibilityLabel.przelaczAutomatFiszek";
  try {
    fireEvent.press(screen.getByRole("switch", { name: label }));
    await waitFor(() => expect(write).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("switch", { name: label })).toHaveAccessibilityState({ checked: false });
    fireEvent.press(screen.getByRole("switch", { name: label }));
    expect(screen.getByRole("switch", { name: label })).toHaveAccessibilityState({ checked: true });
    expect(write).toHaveBeenCalledTimes(1);
    await act(async () => { finish(); });
    await waitFor(() => expect(write).toHaveBeenCalledTimes(2));
    const stored = JSON.parse((await AsyncStorage.getItem("flashcards.courseAutoflowOverrides"))!);
    expect(stored.builtin["en|pl|A1"]).toBeUndefined();
    screen.unmount();
    const restored = render(<PersistedBuiltinEditor />);
    await waitFor(() => expect((useSettings as jest.Mock)().courseSettingsResetHydrated).toBe(true));
    expect(restored.getByRole("switch", { name: label })).toHaveAccessibilityState({ checked: true });
  } finally {
    write.mockReset().mockImplementation(mockStorageWrite);
  }
});
