import { act, fireEvent, render } from "@testing-library/react-native";
import { AccessibilityInfo, Animated } from "react-native";
import { SettingsTabBar } from "../SettingsTabBar";
import { useDeviceLayout } from "@/src/hooks/useDeviceLayout";
import { useThemeSettings } from "@/src/contexts/SettingsContext";
import { resolveThemeColors } from "@/src/theme/theme";

jest.mock("@expo/vector-icons/Ionicons", () => () => null);
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
  (useDeviceLayout as jest.Mock).mockReturnValue({ isTabletLayout: false });
  (useThemeSettings as jest.Mock).mockReturnValue({
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

it("positions the indicator after measurement, resize, and changing tab count", () => {
  const timing = jest
    .spyOn(Animated, "timing")
    .mockReturnValue({ start: jest.fn(), stop: jest.fn(), reset: jest.fn() });
  const onChange = jest.fn();
  const screen = render(
    <SettingsTabBar options={options} value="audio" onChange={onChange} />,
  );
  expect(screen.queryByTestId("settings-tab-indicator")).toBeNull();
  fireEvent(screen.getByTestId("settings-tab-bar"), "layout", {
    nativeEvent: { layout: { width: 300 } },
  });
  expect(
    screen.getByTestId("settings-tab-indicator", {
      includeHiddenElements: true,
    }),
  ).toHaveStyle({ width: 100 });
  expect(timing).toHaveBeenLastCalledWith(
    expect.anything(),
    expect.objectContaining({
      toValue: 200,
      duration: 220,
      useNativeDriver: true,
    }),
  );
  fireEvent(screen.getByTestId("settings-tab-bar"), "layout", {
    nativeEvent: { layout: { width: 420 } },
  });
  expect(
    screen.getByTestId("settings-tab-indicator", {
      includeHiddenElements: true,
    }),
  ).toHaveStyle({ width: 140 });
  expect(timing).toHaveBeenLastCalledWith(
    expect.anything(),
    expect.objectContaining({ toValue: 280 }),
  );
  screen.rerender(
    <SettingsTabBar
      options={options.slice(1)}
      value="audio"
      onChange={onChange}
    />,
  );
  expect(
    screen.getByTestId("settings-tab-indicator", {
      includeHiddenElements: true,
    }),
  ).toHaveStyle({ width: 210 });
  expect(timing).toHaveBeenLastCalledWith(
    expect.anything(),
    expect.objectContaining({ toValue: 210 }),
  );
  screen.rerender(
    <SettingsTabBar options={[]} value="audio" onChange={onChange} />,
  );
  expect(screen.queryByTestId("settings-tab-bar")).toBeNull();
});

it.each(["light", "dark"] as const)(
  "keeps tablet width capped and tab targets accessible in %s theme",
  (theme) => {
    (useDeviceLayout as jest.Mock).mockReturnValue({ isTabletLayout: true });
    (useThemeSettings as jest.Mock).mockReturnValue({
      colors: resolveThemeColors(theme),
      fontScaleMultiplier: 1.4,
    });
    const screen = render(
      <SettingsTabBar options={options} value="answers" onChange={jest.fn()} />,
    );
    expect(screen.getByTestId("settings-tab-bar")).toHaveStyle({
      maxWidth: 500,
    });
    expect(screen.getByRole("tab", { name: "Answers" })).toHaveStyle({
      minHeight: 48,
    });
  },
);

it("moves the indicator without animation when reduced motion is enabled", async () => {
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
  const timing = jest.spyOn(Animated, "timing");
  const screen = render(<SettingsTabBar options={options} value="audio" onChange={jest.fn()} />);
  await act(async () => {});
  timing.mockClear();
  fireEvent(screen.getByTestId("settings-tab-bar"), "layout", { nativeEvent: { layout: { width: 300 } } });
  expect(timing).not.toHaveBeenCalled();
  expect(screen.getByTestId("settings-tab-indicator", { includeHiddenElements: true })).toHaveStyle({
    transform: [{ translateX: 200 }],
  });
});
