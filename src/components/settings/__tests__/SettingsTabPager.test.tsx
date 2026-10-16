import React, { createRef, useCallback, useEffect, useState } from "react";
import { NavigationContext } from "@react-navigation/native";
import { act, render } from "@testing-library/react-native";
import { AccessibilityInfo, Keyboard, ScrollView, Text, TextInput } from "react-native";
import PagerView from "react-native-pager-view";
import { TrackSlider } from "@/src/components/slider/TrackSlider";
import { SettingsTabPager, type SettingsTabPagerHandle } from "../SettingsTabPager";
import { completePagerSelection } from "../testing/completePagerSelection";

const native = PagerView as unknown as {
  mockSetPage: jest.Mock;
  mockSetPageWithoutAnimation: jest.Mock;
  mockSetScrollEnabled: jest.Mock;
};
const options = ["learning", "answers", "audio", "appearance", "progress"].map((key) => ({ key }));
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Keyboard, "dismiss").mockImplementation(() => {});
  jest.spyOn(AccessibilityInfo, "isScreenReaderEnabled").mockImplementation(() => new Promise(() => {}));
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockImplementation(() => new Promise(() => {}));
});
afterEach(() => jest.restoreAllMocks());

function Body({ tab, revision, rendered, mounted, disabledSlider }: {
  tab: string; revision?: string; rendered?: jest.Mock; mounted?: jest.Mock; disabledSlider?: boolean;
}) {
  rendered?.(tab);
  useEffect(() => { mounted?.(tab); }, [tab, mounted]);
  return <>
    <Text accessibilityRole="header">{tab}</Text><Text>{revision}</Text>
    <TextInput testID={`input-${tab}`} defaultValue="draft" />
    <TrackSlider testID={`slider-${tab}`} value={0.5} onValueChange={() => {}} disabled={disabledSlider} accessibilityLabel={`slider-${tab}`} />
  </>;
}
function setup(props: { scopeKey?: number; enabled?: boolean; disabledSlider?: boolean; keys?: typeof options; rendered?: jest.Mock; mounted?: jest.Mock; revision?: string } = {}) {
  const pagerRef = createRef<SettingsTabPagerHandle<string>>();
  const onChange = jest.fn();
  function Harness({ scopeKey = 1, enabled, disabledSlider, keys = options, rendered, mounted, revision }: typeof props) {
    const [value, setValue] = useState("learning");
    const renderPage = useCallback((tab: string) => <Body {...{ tab, disabledSlider, rendered, mounted, revision }} />,
      [disabledSlider, rendered, mounted, revision]);
    return <SettingsTabPager ref={pagerRef} options={keys} value={value} scopeKey={scopeKey} enabled={enabled}
      onChange={(key) => { onChange(key); setValue(key); }} renderPage={renderPage} />;
  }
  const screen = render(<Harness {...props} />);
  return { screen, pagerRef, onChange, rerender: (next: typeof props) => screen.rerender(<Harness {...next} />) };
}
function state(screen: ReturnType<typeof render>, pageScrollState: string) {
  act(() => screen.getByTestId("settings-native-pager").props.onPageScrollStateChanged({ nativeEvent: { pageScrollState } }));
}

it("renders active and adjacent bodies, hiding inactive pages from accessibility and touches", () => {
  const { screen } = setup();
  expect(screen.getAllByRole("header").map((node) => node.props.children)).toEqual(["learning"]);
  expect(screen.getAllByRole("header", { includeHiddenElements: true })).toHaveLength(2);
  expect(screen.queryByText("audio", { includeHiddenElements: true })).toBeNull();
  expect(screen.getByTestId("settings-page-answers", { includeHiddenElements: true }).props.pointerEvents).toBe("none");
  for (const scroll of screen.UNSAFE_getAllByType(ScrollView)) expect(scroll.props.removeClippedSubviews).toBe(false);
});

it("requests distant pages, waits for native selection, and ignores busy or invalid navigation", () => {
  const { screen, pagerRef, onChange } = setup();
  act(() => pagerRef.current?.navigate("progress"));
  expect(native.mockSetPage).toHaveBeenCalledWith(4);
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.getByRole("header", { name: "learning" })).toBeTruthy();
  act(() => { pagerRef.current?.navigate("answers"); pagerRef.current?.navigate("missing"); });
  expect(native.mockSetPage).toHaveBeenCalledTimes(1);
  completePagerSelection("progress");
  completePagerSelection("progress");
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(Keyboard.dismiss).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("header", { name: "progress" })).toBeTruthy();
  act(() => pagerRef.current?.navigate("progress"));
  expect(native.mockSetPage).toHaveBeenCalledTimes(1);
});

it("keeps busy through native settling even after selection", () => {
  const { screen, pagerRef } = setup();
  state(screen, "dragging");
  act(() => screen.getByTestId("settings-native-pager").props.onPageSelected({ nativeEvent: { position: 1 } }));
  act(() => pagerRef.current?.navigate("progress"));
  expect(native.mockSetPage).not.toHaveBeenCalled();
  state(screen, "idle");
  act(() => pagerRef.current?.navigate("progress"));
  expect(native.mockSetPage).toHaveBeenCalledWith(4);
});

it("preserves source and destination scroll on cancellation; resets only a committed destination", () => {
  const { screen, pagerRef, onChange } = setup();
  const scrollTo = jest.spyOn(ScrollView.prototype, "scrollTo");
  const scrolls = screen.UNSAFE_getAllByType(ScrollView);
  state(screen, "dragging");
  state(screen, "settling");
  state(screen, "idle");
  completePagerSelection("learning");
  expect(scrollTo).not.toHaveBeenCalled();
  expect(onChange).not.toHaveBeenCalled();
  completePagerSelection("answers");
  expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: false });
  expect(scrollTo.mock.instances[0]).toBe(scrolls[1].instance);
  scrollTo.mockClear();
  act(() => pagerRef.current?.navigate("learning"));
  completePagerSelection("learning");
  expect(scrollTo).toHaveBeenCalledTimes(1);
  act(() => pagerRef.current?.scrollToTop());
  expect(scrollTo).toHaveBeenCalledTimes(2);
});

it("retains mounted forms and memoized bodies across selections; real props still update", () => {
  const rendered = jest.fn(); const mounted = jest.fn();
  const { screen, rerender } = setup({ rendered, mounted, revision: "old" });
  const input = screen.getByTestId("input-learning").instance;
  completePagerSelection("appearance");
  completePagerSelection("learning");
  expect(screen.getByTestId("input-learning").instance).toBe(input);
  expect(mounted.mock.calls.filter(([key]) => key === "learning")).toHaveLength(1);
  expect(rendered.mock.calls.filter(([key]) => key === "learning")).toHaveLength(1);
  rerender({ rendered, mounted, revision: "new" });
  expect(screen.getByText("new")).toBeTruthy();
  expect(mounted.mock.calls.filter(([key]) => key === "learning")).toHaveLength(1);
  expect(rendered.mock.calls.filter(([key]) => key === "learning")).toHaveLength(2);
});

it("retains existing forms across category changes, ignoring callbacks from the old list", () => {
  const mounted = jest.fn();
  const { screen, rerender, onChange } = setup({ mounted });
  const oldSelect = screen.getByTestId("settings-native-pager").props.onPageSelected;
  rerender({ mounted, keys: options.filter(({ key }) => key !== "audio") });
  act(() => oldSelect({ nativeEvent: { position: 2 } }));
  expect(onChange).not.toHaveBeenCalled();
  expect(mounted.mock.calls.filter(([key]) => key === "learning")).toHaveLength(1);
  expect(native.mockSetPageWithoutAnimation).toHaveBeenCalledWith(0);
});

it("ignores stale callbacks after changing course or unmounting", () => {
  const { screen, rerender, onChange } = setup();
  const oldSelect = screen.getByTestId("settings-native-pager").props.onPageSelected;
  rerender({ scopeKey: 2 });
  act(() => oldSelect({ nativeEvent: { position: 1 } }));
  expect(onChange).not.toHaveBeenCalled();
  const select = screen.getByTestId("settings-native-pager").props.onPageSelected;
  screen.unmount();
  act(() => select({ nativeEvent: { position: 1 } }));
  expect(onChange).not.toHaveBeenCalled();
});

it.each([-1, 5, 1.5, NaN])("ignores invalid native position %s", (position) => {
  const { screen, onChange } = setup();
  act(() => screen.getByTestId("settings-native-pager").props.onPageSelected({ nativeEvent: { position } }));
  expect(onChange).not.toHaveBeenCalled();
});

it.each([false, true])("locks native scrolling during slider touches, cancel and unmount (disabled=%s)", (disabledSlider) => {
  const { screen, rerender } = setup({ disabledSlider });
  const slider = screen.getByRole("adjustable", { name: "slider-learning" });
  const neighbor = screen.getByTestId("slider-answers", { includeHiddenElements: true });
  act(() => slider.props.onTouchStart());
  expect(native.mockSetScrollEnabled).toHaveBeenLastCalledWith(false);
  // A second token must keep the lock until both touches end.
  act(() => neighbor.props.onTouchStart());
  act(() => slider.props.onTouchEnd({ nativeEvent: { touches: [] } }));
  expect(native.mockSetScrollEnabled).toHaveBeenLastCalledWith(false);
  act(() => neighbor.props.onTouchCancel());
  expect(native.mockSetScrollEnabled).toHaveBeenLastCalledWith(true);
  act(() => slider.props.onTouchStart());
  act(() => slider.props.onTouchEnd({ nativeEvent: { touches: [{}] } }));
  expect(native.mockSetScrollEnabled).toHaveBeenLastCalledWith(false);
  rerender({ disabledSlider, scopeKey: 2 });
  expect(native.mockSetScrollEnabled).toHaveBeenLastCalledWith(true);
});

it("supports disabled swipe mode with imperative navigation", () => {
  const { screen, pagerRef } = setup({ enabled: false });
  expect(screen.getAllByRole("header", { includeHiddenElements: true })).toHaveLength(1);
  expect(screen.getByTestId("settings-native-pager").props.scrollEnabled).toBe(false);
  act(() => pagerRef.current?.navigate("answers"));
  completePagerSelection("answers");
  expect(screen.getByRole("header", { name: "answers" })).toBeTruthy();
});

it("disables native swipe for screen readers and uses nonanimated navigation for reduced motion", async () => {
  jest.mocked(AccessibilityInfo.isScreenReaderEnabled).mockResolvedValue(true);
  jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(true);
  const { screen, pagerRef, onChange } = setup();
  await act(async () => {});
  expect(screen.getByTestId("settings-native-pager").props.scrollEnabled).toBe(false);
  act(() => pagerRef.current?.navigate("answers"));
  expect(native.mockSetPageWithoutAnimation).toHaveBeenCalledWith(1);
  expect(native.mockSetPage).not.toHaveBeenCalled();
  completePagerSelection("answers");
  expect(onChange).toHaveBeenCalledWith("answers");
  act(() => pagerRef.current?.navigate("learning"));
  expect(native.mockSetPageWithoutAnimation).toHaveBeenLastCalledWith(0);
});

it("reacts to accessibility changes without letting a late initial query override them", async () => {
  let resolveReader!: (enabled: boolean) => void;
  jest.mocked(AccessibilityInfo.isScreenReaderEnabled).mockImplementation(() => new Promise((resolve) => { resolveReader = resolve; }));
  const listeners = jest.spyOn(AccessibilityInfo, "addEventListener");
  const { screen, pagerRef } = setup();
  // Jest exposes only the final RN overload (announcementFinished).
  const calls = listeners.mock.calls as unknown as [string, (enabled: boolean) => void][];
  const reader = calls.find(([name]) => name === "screenReaderChanged")![1];
  const motion = calls.find(([name]) => name === "reduceMotionChanged")![1];
  act(() => { reader(true); motion(true); });
  expect(screen.getByTestId("settings-native-pager").props.scrollEnabled).toBe(false);
  await act(async () => resolveReader(false));
  expect(screen.getByTestId("settings-native-pager").props.scrollEnabled).toBe(false);
  act(() => pagerRef.current?.navigate("answers"));
  expect(native.mockSetPageWithoutAnimation).toHaveBeenCalledWith(1);
});

it("releases pages on blur and recreates them on focus", () => {
  const listeners = new Map<string, () => void>();
  const navigation = {
    isFocused: () => true,
    addListener: (event: string, callback: () => void) => {
      listeners.set(event, callback); return () => listeners.delete(event);
    },
  };
  const rendered = jest.fn((key: string) => <Text>{key}</Text>);
  const screen = render(<NavigationContext.Provider value={navigation as never}>
    <SettingsTabPager options={options} value="learning" onChange={() => {}} renderPage={rendered} scopeKey={1} />
  </NavigationContext.Provider>);
  expect(rendered).toHaveBeenCalledTimes(2);
  act(() => listeners.get("blur")?.());
  expect(screen.queryByTestId("settings-tab-pager")).toBeNull();
  act(() => listeners.get("focus")?.());
  expect(rendered).toHaveBeenCalledTimes(4);
});
