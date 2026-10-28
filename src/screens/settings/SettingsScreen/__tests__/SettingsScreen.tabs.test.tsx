import { completePagerSelection } from "@/src/components/settings/testing/completePagerSelection";
import { act, fireEvent, render } from "@testing-library/react-native";
import SettingsScreen from "../SettingsScreen";

const mockSectionRender = jest.fn();
let mockDeviceLayout = { isTabletLayout: false, width: 390, orientation: "portrait" };
beforeEach(() => {
  mockSectionRender.mockClear();
  mockDeviceLayout = { isTabletLayout: false, width: 390, orientation: "portrait" };
});
afterEach(() => jest.restoreAllMocks());

jest.mock("@expo/vector-icons/Ionicons", () => () => null);
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock("@/src/hooks/useDeviceLayout", () => ({
  useDeviceLayout: () => mockDeviceLayout,
}));
jest.mock("@/src/contexts/SettingsContext", () => {
  const { resolveThemeColors } = jest.requireActual("@/src/theme/theme");
  return {
    useThemeSettings: () => ({
      colors: resolveThemeColors("light"),
      fontScaleMultiplier: 1,
    }),
  };
});
jest.mock("@/src/components/settings/AppearanceSection", () => {
  const { Text } = jest.requireActual("react-native");
  return function MockAppearanceSection() {
    mockSectionRender("ui");
    return <Text>Appearance content</Text>;
  };
});
jest.mock("@/src/components/settings/AccessibilitySection", () => {
  const { Text } = jest.requireActual("react-native");
  return function MockAccessibilitySection() {
    mockSectionRender("accessibility");
    return <Text>Accessibility content</Text>;
  };
});
jest.mock("@/src/components/settings/LearningSection", () => {
  const { Text } = jest.requireActual("react-native");
  return function MockLearningSection() {
    mockSectionRender("learning");
    return <Text>Learning content</Text>;
  };
});
jest.mock("@/src/components/settings/CoursesDataSection", () => {
  const { Text } = jest.requireActual("react-native");
  return function MockCoursesSection() {
    mockSectionRender("coursesData");
    return <Text>Courses content</Text>;
  };
});
jest.mock("@/src/components/settings/DebuggingSection", () => {
  const { Text } = jest.requireActual("react-native");
  return function MockDebugSection() {
    mockSectionRender("debug");
    return <Text>Debug content</Text>;
  };
});

it("reuses real screen renderers across tab changes without rendering prepared sections", async () => {
  const screen = render(<SettingsScreen />);
  await act(async () => {});
  for (const key of ["learning", "ui", "coursesData", "debug", "learning", "debug", "ui"]) {
    fireEvent.press(screen.getByRole("tab", { name: `settings.tabs.${key}` }));
    completePagerSelection(key);
  }
  expect(mockSectionRender.mock.calls.map(([key]) => key).sort()).toEqual(
    ["ui", "accessibility", "learning", "coursesData", "debug"].sort(),
  );
});

it("preserves main Settings categories and development Debug tab using the shared bar", async () => {
  const screen = render(<SettingsScreen />);
  await act(async () => {});
  const categories = [
    ["ui", "Appearance content"],
    ["accessibility", "Accessibility content"],
    ["learning", "Learning content"],
    ["coursesData", "Courses content"],
    ["debug", "Debug content"],
  ];
  expect(screen.getAllByRole("tab")).toHaveLength(5);
  for (const [key, content] of categories) {
    fireEvent.press(screen.getByRole("tab", { name: `settings.tabs.${key}` }));
    completePagerSelection(key);
    expect(
      screen.getByRole("tab", { name: `settings.tabs.${key}`, selected: true }),
    ).toBeTruthy();
    expect(screen.getByText(content)).toBeTruthy();
    for (const [, other] of categories)
      if (other !== content) expect(screen.queryByText(other)).toBeNull();
  }
});

it("keeps the bottom selection in sync after native selection", async () => {
  const screen = render(<SettingsScreen />);
  await act(async () => {});
  completePagerSelection("accessibility");
  expect(screen.getByRole("tab", { name: "settings.tabs.accessibility", selected: true })).toBeTruthy();
  expect(screen.getByText("Accessibility content")).toBeTruthy();
  expect(screen.queryByText("Appearance content")).toBeNull();
});


it("keeps the selected settings page when rotating between the bottom tabs and sidebar", async () => {
  mockDeviceLayout = { isTabletLayout: true, width: 960, orientation: "landscape" };
  const screen = render(<SettingsScreen />);
  await act(async () => {});
  expect(screen.getByText("settings.tabs.learning")).toBeTruthy();
  fireEvent.press(screen.getByRole("tab", { name: "settings.tabs.learning" }));
  completePagerSelection("learning");
  expect(screen.getByText("Learning content")).toBeTruthy();
  mockSectionRender.mockClear();

  mockDeviceLayout = { isTabletLayout: true, width: 600, orientation: "portrait" };
  screen.rerender(<SettingsScreen />);
  expect(screen.queryByText("settings.tabs.learning")).toBeNull();
  expect(screen.getByRole("tab", { name: "settings.tabs.learning", selected: true })).toBeTruthy();
  expect(screen.getByText("Learning content")).toBeTruthy();
  mockDeviceLayout = { isTabletLayout: true, width: 960, orientation: "landscape" };
  screen.rerender(<SettingsScreen />);
  expect(screen.getByText("settings.tabs.learning")).toBeTruthy();
  expect(screen.getByRole("tab", { name: "settings.tabs.learning", selected: true })).toBeTruthy();
  expect(mockSectionRender).not.toHaveBeenCalled();
});
