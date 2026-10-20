import { act, fireEvent, render, within } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import { withTiming } from "react-native-reanimated";
import { SettingsTabBar } from "../SettingsTabBar";
import { useDeviceLayout } from "@/src/hooks/useDeviceLayout";
import { useThemeSettings } from "@/src/contexts/SettingsContext";
import { resolveThemeColors } from "@/src/theme/theme";

jest.mock("react-native-reanimated", () => ({
  ...jest.requireActual("react-native-reanimated/mock"),
  withTiming: jest.fn((value) => value),
}));
jest.mock("@expo/vector-icons/Ionicons", () => {
  const { Text } = jest.requireActual("react-native");
  return function MockIonicons(props: object) { return <Text {...props} testID="settings-icon" />; };
});
jest.mock("@/src/hooks/useDeviceLayout", () => ({
  useDeviceLayout: jest.fn(),
}));
jest.mock("@/src/contexts/SettingsContext", () => ({
  useThemeSettings: jest.fn(),
}));
const options = [
  { key: "learning", label: "Learning", icon: "school" },
  { key: "answers", label: "Answers", icon: "chatbubble-ellipses-outline" },
  { key: "audio", label: "Audio", icon: "volume-high-outline" },
] as const;

beforeEach(() => {
  jest.mocked(withTiming).mockClear();
  jest.spyOn(AccessibilityInfo, "isScreenReaderEnabled").mockImplementation(() => new Promise(() => {}));
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockImplementation(() => new Promise(() => {}));
  (useDeviceLayout as jest.Mock).mockReturnValue({ isTabletLayout: false });
  (useThemeSettings as jest.Mock).mockReturnValue({
    theme: "light",
    colors: resolveThemeColors("light"),
    fontScaleMultiplier: 1,
  });
});
afterEach(() => jest.restoreAllMocks());

it("announces selection and calls its owner only for another tab", () => {
  const onChange = jest.fn();
  const screen = render(
    <SettingsTabBar options={options} value="learning" onChange={onChange} />,
  );
  expect(screen.getAllByRole("tab", { selected: true })).toHaveLength(1);
  expect(
    screen.getByRole("tab", { name: "Learning", selected: true }),
  ).toBeTruthy();
  fireEvent.press(screen.getByRole("tab", { name: "Learning" }));
  expect(onChange).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole("tab", { name: "Audio" }));
  expect(onChange).toHaveBeenCalledWith("audio");
  screen.rerender(
    <SettingsTabBar options={options} value="audio" onChange={onChange} />,
  );
  expect(
    screen.getByRole("tab", { name: "Audio", selected: true }),
  ).toBeTruthy();
});

function measure(screen: ReturnType<typeof render>, labels: readonly string[], width: number) {
  act(() => {
    fireEvent(screen.getByTestId("settings-tab-bar"), "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width, height: 48 } },
    });
    labels.forEach((label, index) => fireEvent(screen.getByRole("tab", { name: label }), "layout", {
      nativeEvent: { layout: { x: index * width / labels.length, y: 0, width: width / labels.length, height: 48 } },
    }));
  });
}

it("measures each tab and snaps on entry, resize, and changing tab count", () => {
  const onChange = jest.fn();
  const screen = render(<SettingsTabBar options={options} value="audio" onChange={onChange} />);
  expect(screen.queryByTestId("settings-tab-indicator", { includeHiddenElements: true })).toBeNull();
  measure(screen, ["Learning", "Answers", "Audio"], 300);
  expect(screen.getByTestId("settings-tab-indicator", { includeHiddenElements: true })).toHaveStyle({
    width: 100, transform: [{ translateX: 200 }, { translateY: 0 }],
  });
  expect(withTiming).not.toHaveBeenCalled();
  measure(screen, ["Learning", "Answers", "Audio"], 420);
  expect(screen.getByTestId("settings-tab-indicator", { includeHiddenElements: true })).toHaveStyle({ width: 140 });
  expect(withTiming).not.toHaveBeenCalled();
  screen.rerender(<SettingsTabBar options={options.slice(1)} value="audio" onChange={onChange} />);
  measure(screen, ["Answers", "Audio"], 420);
  expect(screen.getByTestId("settings-tab-indicator", { includeHiddenElements: true })).toHaveStyle({
    width: 210, transform: [{ translateX: 210 }, { translateY: 0 }],
  });
  expect(withTiming).not.toHaveBeenCalled();
  screen.rerender(<SettingsTabBar options={[]} value="audio" onChange={onChange} />);
  expect(screen.queryByTestId("settings-tab-bar")).toBeNull();
});

it("animates background and line together toward the latest selection", () => {
  const screen = render(<SettingsTabBar options={options} value="learning" onChange={jest.fn()} />);
  measure(screen, ["Learning", "Answers", "Audio"], 300);
  screen.rerender(<SettingsTabBar options={options} value="audio" onChange={jest.fn()} />);
  expect(withTiming).toHaveBeenCalledWith(200, expect.objectContaining({ duration: 220 }));
  jest.mocked(withTiming).mockClear();
  screen.rerender(<SettingsTabBar options={options} value="answers" onChange={jest.fn()} />);
  expect(withTiming).toHaveBeenCalledWith(100, expect.objectContaining({ duration: 220 }));
  const indicator = screen.getByTestId("settings-tab-indicator", { includeHiddenElements: true });
  expect(within(indicator).getByTestId("settings-tab-active-background", { includeHiddenElements: true })).toBeTruthy();
  expect(within(indicator).getByTestId("settings-tab-active-line", { includeHiddenElements: true })).toBeTruthy();
});

it.each(["light", "dark"] as const)(
  "keeps tablet width capped and tab targets accessible in %s theme",
  (theme) => {
    (useDeviceLayout as jest.Mock).mockReturnValue({ isTabletLayout: true });
    (useThemeSettings as jest.Mock).mockReturnValue({
      theme,
      colors: resolveThemeColors(theme),
      fontScaleMultiplier: 1.4,
    });
    const screen = render(
      <SettingsTabBar options={options} value="answers" onChange={jest.fn()} />,
    );
    expect(screen.getByTestId("settings-tab-bar")).toHaveStyle({
      maxWidth: 500,
    });
    expect(screen.getByRole("tab", { name: "Answers" })).toHaveStyle({ minHeight: 48 });
    measure(screen, ["Learning", "Answers", "Audio"], 480);
    expect(screen.getByTestId("settings-tab-active-background", { includeHiddenElements: true })).toHaveStyle({
      backgroundColor: resolveThemeColors(theme).my_green, borderRadius: 16, opacity: theme === "dark" ? 0.14 : 0.08,
    });
    expect(screen.getByTestId("settings-tab-active-line", { includeHiddenElements: true })).toHaveStyle({ width: 20, height: 3 });
    expect(screen.getAllByTestId("settings-icon")[1]).toHaveStyle({ color: resolveThemeColors(theme).headline });
    expect(screen.getByTestId("settings-tab-bar")).toHaveStyle({ overflow: "visible" });
  },
);

it("moves the indicator without animation when reduced motion is enabled", async () => {
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
  const onChange = jest.fn();
  const screen = render(<SettingsTabBar options={options} value="learning" onChange={onChange} />);
  await act(async () => {});
  measure(screen, ["Learning", "Answers", "Audio"], 300);
  jest.mocked(withTiming).mockClear();
  screen.rerender(<SettingsTabBar options={options} value="audio" onChange={onChange} />);
  expect(withTiming).not.toHaveBeenCalled();
  expect(screen.getByTestId("settings-tab-indicator", { includeHiddenElements: true })).toHaveStyle({
    transform: [{ translateX: 200 }, { translateY: 0 }],
  });
});

it("removes the highlight when its tab disappears even if its frame was cached", () => {
  const screen = render(<SettingsTabBar options={options} value="audio" onChange={jest.fn()} />);
  measure(screen, ["Learning", "Answers", "Audio"], 300);
  screen.rerender(<SettingsTabBar options={options.slice(0, 2)} value="audio" onChange={jest.fn()} />);
  expect(screen.queryByTestId("settings-tab-indicator", { includeHiddenElements: true })).toBeNull();
});
