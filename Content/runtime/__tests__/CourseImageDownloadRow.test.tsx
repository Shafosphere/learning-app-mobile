import React from "react";
import { act, fireEvent, render, within } from "@testing-library/react-native";
import { StyleSheet, View } from "react-native";
import * as Reanimated from "react-native-reanimated";
import { resolveThemeColors, type Theme } from "@/src/theme/theme";
import * as Diagnostics from "@/src/services/courseActivationDiagnostics";
import { CourseImageDownloadRow } from "../CourseImageDownloadRow";
import { CourseImageRevealProvider } from "../CourseImageRevealCoordinator";
import { downloadCourse, cancelCourse, confirmCourseDownload, refreshCourse } from "../courseDownloads";
import type { PackDownload } from "../packDownloads";

let mockImagePAD = true;
jest.mock("../images", () => ({ get usesImagePAD() { return mockImagePAD; } }));
jest.mock("../catalog", () => ({
  getCourseImagePacks: (slug: string) => slug && !slug.includes("unknown") ? ["images_birds"] : [],
  getImagePack: () => ({ titleKey: "contentDownload.birds" }),
}));
let mockState: PackDownload;
jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (effect: () => void) => {
    const React = jest.requireActual<typeof import("react")>("react");
    React.useEffect(effect, [effect]);
  },
}));
// Worklet closures capture imports at module load, before individual test spies.
jest.mock("react-native-reanimated", () => {
  const mock = jest.requireActual("react-native-reanimated/mock");
  return { ...mock, withTiming: jest.fn(mock.withTiming), runOnUI: jest.fn(mock.runOnUI) };
});
const mockListeners = new Set<() => void>();
const mockRowRender = jest.fn();
const mockThemeContext = React.createContext({
  theme: "light" as Theme,
  colors: resolveThemeColors("light"),
  highContrastEnabled: false,
});
jest.mock("@expo/vector-icons/FontAwesome6", () => "Icon");
jest.mock("@expo/vector-icons/Feather", () => "Icon");
jest.mock("../courseDownloads", () => ({
  getCourseDownload: () => mockState,
  refreshCourse: jest.fn(async () => {}), downloadCourse: jest.fn(), cancelCourse: jest.fn(), confirmCourseDownload: jest.fn(),
}));
jest.mock("../packDownloads", () => ({ subscribePackDownloads: (listener: () => void) => {
  mockListeners.add(listener); return () => { mockListeners.delete(listener); };
} }));
jest.mock("@/src/contexts/SettingsContext", () => ({
  useThemeSettings: () => jest.requireActual("react").useContext(mockThemeContext),
}));
jest.mock("react-i18next", () => ({ useTranslation: () => {
  mockRowRender();
  return { t: (key: string, values?: { value?: string; action?: string; course?: string }) =>
    key === "audioDownload.size" ? `${values?.value} MB` : key === "audioDownload.courseAction" ? `${values?.action} — ${values?.course}` : key };
} }));
beforeEach(() => {
  mockImagePAD = true;
  jest.clearAllMocks();
  mockState = { name: "audio_es_50", phase: "missing", totalBytes: 223392, downloadedBytes: 0, errorCode: 0,
    nativeStatus: 8, confirmationReason: null, confirmationPending: false };
});
function update(patch: Partial<PackDownload>) {
  act(() => {
    mockState = { ...mockState, ...patch };
    mockListeners.forEach((listener) => listener());
  });
}
it("downloads only on an explicit tap and stops press propagation", () => {
  const screen = render(<CourseImageDownloadRow slug="ptaki" courseName="Spanish PL" />);
  expect(refreshCourse).toHaveBeenCalledWith("ptaki");
  expect(downloadCourse).not.toHaveBeenCalled();
  const stopPropagation = jest.fn();
  fireEvent.press(screen.getByText("audioDownload.download"), { stopPropagation });
  expect(downloadCourse).toHaveBeenCalledWith("ptaki");
  expect(stopPropagation).toHaveBeenCalledTimes(1);
  expect(screen.getByText("contentDownload.birds · 0.22 MB")).toBeTruthy();
  expect(screen.queryByText("audioDownload.description")).toBeNull();
});
it("both course rows observe the same download and ready state", () => {
  const screen = render(<>
    <CourseImageDownloadRow slug="ptaki" courseName="Spanish PL" />
    <CourseImageDownloadRow slug="ptaki_fr" courseName="Spanish EN" />
  </>);
  update({ phase: "downloading", nativeStatus: 2, downloadedBytes: 100000 });
  expect(screen.getAllByText("audioDownload.downloading")).toHaveLength(2);
  update({ phase: "ready", nativeStatus: 4 });
  for (const slug of ["ptaki", "ptaki_fr"]) {
    const row = within(screen.getByTestId(`course-image-row-${slug}`));
    expect(row.getByText("audioDownload.downloaded")).toBeTruthy();
    expect(row.queryByRole("button")).toBeNull();
  }
});
it.each(["es_to_pl_first_150", "es_to_pl_first_327", "es_to_en_first_150", "es_to_en_first_327"])("offers the course download for %s", (slug) => {
  const screen = render(<CourseImageDownloadRow slug={slug} courseName="Spanish" />);
  expect(screen.getByTestId(`course-image-row-${slug}`)).toBeTruthy();
  fireEvent.press(screen.getByText("audioDownload.download"));
  expect(downloadCourse).toHaveBeenCalledWith(slug);
});
it("offers cancel, transfer confirmation, Play confirmation and retry", () => {
  mockState = { ...mockState, phase: "downloading", nativeStatus: 2 };
  const screen = render(<CourseImageDownloadRow slug="ptaki" courseName="Spanish" />);
  fireEvent.press(screen.getByText("audioDownload.cancel"));
  expect(cancelCourse).toHaveBeenCalledWith("ptaki");
  update({ phase: "confirmation", nativeStatus: 7, confirmationReason: "wifi" });
  expect(screen.getByText("audioDownload.waitingForWifi")).toBeTruthy();
  expect(screen.queryByText("audioDownload.playConfirmation")).toBeNull();
  fireEvent.press(screen.getByText("audioDownload.confirmTransfer"));
  expect(confirmCourseDownload).toHaveBeenCalledTimes(1);
  update({ nativeStatus: 9, confirmationReason: "play" });
  expect(screen.getByText("audioDownload.playConfirmation")).toBeTruthy();
  fireEvent.press(screen.getByText("audioDownload.confirm"));
  expect(confirmCourseDownload).toHaveBeenCalledTimes(2);
  update({ phase: "failed", nativeStatus: 5, errorCode: -10 });
  expect(screen.getByText("contentDownload.noSpace")).toBeTruthy();
  fireEvent.press(screen.getByText("audioDownload.retry"));
  expect(downloadCourse).toHaveBeenCalledWith("ptaki");
});
it("disables actions while checking and while a confirmation is in flight", () => {
  mockState = { ...mockState, phase: "checking", nativeStatus: null };
  const screen = render(<CourseImageDownloadRow slug="ptaki" courseName="Spanish" />);
  expect(screen.queryByRole("button")).toBeNull();
  update({ phase: "confirmation", nativeStatus: 9, confirmationReason: "play", confirmationPending: true });
  fireEvent.press(screen.getByText("audioDownload.confirm"));
  expect(confirmCourseDownload).not.toHaveBeenCalled();
});
it("hides the row for unsupported courses and disables unsupported clients", () => {
  const screen = render(<CourseImageDownloadRow slug="unknown_course" courseName="Other course" />);
  expect(screen.queryByTestId("course-image-row-unknown_course")).toBeNull();
  mockState = { ...mockState, phase: "unavailable" };
  screen.rerender(<CourseImageDownloadRow slug="ptaki" courseName="Spanish" />);
  expect(screen.getByText("audioDownload.unavailable")).toBeTruthy();
  expect(screen.queryByRole("button")).toBeNull();
});
it.each(["french_a1", "french_a2", "french_b1", "french_b2", "fr_to_pl_first_50", "fr_to_pl_first_150", "fr_to_pl_first_332",
  "fr_to_en_first_50", "fr_to_en_first_150", "fr_to_en_first_332"])("downloads all French course dependencies for %s", (slug) => {
  const screen = render(<CourseImageDownloadRow slug={slug} courseName="French" />);
  expect(screen.getByTestId(`course-image-row-${slug}`)).toBeTruthy();
  fireEvent.press(screen.getByText("audioDownload.download"));
  expect(downloadCourse).toHaveBeenCalledWith(slug);
});
it.each(["eng_to_pl_a1", "eng_to_pl_a2", "eng_to_pl_b1", "eng_to_pl_b2",
  "eng_to_pl_first_50", "eng_to_pl_first_100", "eng_to_pl_first_250", "eng_to_pl_first_500"])("offers English course audio for %s", (slug) => {
  const screen = render(<CourseImageDownloadRow slug={slug} courseName="English" />);
  expect(screen.getByTestId(`course-image-row-${slug}`)).toBeTruthy();
  fireEvent.press(screen.getByText("audioDownload.download"));
  expect(downloadCourse).toHaveBeenCalledWith(slug);
});

it("skips unchanged parent props, but updates name, expansion, slug and download state", () => {
  const screen = render(<CourseImageDownloadRow slug="ptaki" courseName="Spanish" />);
  const baseline = mockRowRender.mock.calls.length;
  screen.rerender(<CourseImageDownloadRow slug="ptaki" courseName="Spanish" />);
  expect(mockRowRender).toHaveBeenCalledTimes(baseline);

  screen.rerender(<CourseImageDownloadRow slug="ptaki" courseName="Spanish PL" expanded={false} />);
  expect(mockRowRender.mock.calls.length).toBeGreaterThan(baseline);
  const collapsed = screen.UNSAFE_getByProps({ pointerEvents: "none" });
  expect(collapsed.props.pointerEvents).toBe("none");
  expect(collapsed.props.accessibilityElementsHidden).toBe(true);
  expect(screen.getByLabelText("audioDownload.download — Spanish PL", { includeHiddenElements: true })).toBeTruthy();

  screen.rerender(<CourseImageDownloadRow slug="ptaki_fr" courseName="Spanish EN" expanded />);
  expect(screen.queryByTestId("course-image-row-ptaki")).toBeNull();
  expect(refreshCourse).toHaveBeenLastCalledWith("ptaki_fr");
  expect(screen.getByLabelText("audioDownload.download — Spanish EN")).toBeTruthy();
  const renders = mockRowRender.mock.calls.length;
  update({ phase: "ready", nativeStatus: 4 });
  expect(mockRowRender.mock.calls.length).toBeGreaterThan(renders);
  expect(screen.getByText("audioDownload.downloaded")).toBeTruthy();
});

it("updates colors through theme context even when memoized props do not change", () => {
  const row = () => <CourseImageDownloadRow slug="ptaki" courseName="Spanish" />;
  const light = { theme: "light" as Theme, colors: resolveThemeColors("light"), highContrastEnabled: false };
  const screen = render(<mockThemeContext.Provider value={light}>{row()}</mockThemeContext.Provider>);
  const panel = () => screen.UNSAFE_getByProps({ pointerEvents: "auto" });
  expect(StyleSheet.flatten(panel().props.style).backgroundColor).toBe("#D5F8F2");

  const dark = { theme: "dark" as Theme, colors: resolveThemeColors("dark"), highContrastEnabled: false };
  screen.rerender(<mockThemeContext.Provider value={dark}>{row()}</mockThemeContext.Provider>);
  expect(StyleSheet.flatten(panel().props.style).backgroundColor).toBe("#143E43");
  const contrast = { ...light, highContrastEnabled: true, colors: resolveThemeColors("light", { highContrast: true }) };
  screen.rerender(<mockThemeContext.Provider value={contrast}>{row()}</mockThemeContext.Provider>);
  expect(StyleSheet.flatten(panel().props.style).backgroundColor).toBe(contrast.colors.secondBackground);
  expect(screen.getByText("audioDownload.download")).toHaveStyle({ color: contrast.colors.lightbg });
  expect(refreshCourse).toHaveBeenCalledTimes(1);
});

it("keeps download subscriptions and progress alive while collapsed, then reveals current state", () => {
  const timing = jest.spyOn(Reanimated, "withTiming");
  const screen = render(<CourseImageDownloadRow slug="ptaki" courseName="Spanish" expanded />);
  try {
    fireEvent(screen.getByTestId("course-image-row-ptaki"), "layout", {
      nativeEvent: { layout: { height: 120 } },
    });
    expect(timing).toHaveBeenLastCalledWith(120, expect.objectContaining({ duration: 260 }));
    update({ phase: "downloading", nativeStatus: 2, downloadedBytes: 100000 });
    const subscribers = mockListeners.size;
    screen.rerender(<CourseImageDownloadRow slug="ptaki" courseName="Spanish" expanded={false} />);
    expect(timing).toHaveBeenLastCalledWith(0, expect.objectContaining({ duration: 260 }));
    expect(screen.queryByTestId("course-image-row-ptaki")).toBeNull();
    expect(mockListeners.size).toBe(subscribers);

    update({ downloadedBytes: mockState.totalBytes / 2 });
    expect(screen.getByText("audioDownload.downloading", { includeHiddenElements: true })).toBeTruthy();
    expect(screen.UNSAFE_getAllByType(View).some((view) => StyleSheet.flatten(view.props.style)?.width === "50%"))
      .toBe(true);
    update({ phase: "ready", nativeStatus: 4 });
    screen.rerender(<CourseImageDownloadRow slug="ptaki" courseName="Spanish" expanded />);
    expect(timing).toHaveBeenLastCalledWith(120, expect.objectContaining({ duration: 260 }));
    expect(screen.getByText("audioDownload.downloaded")).toBeTruthy();
    expect(refreshCourse).toHaveBeenCalledTimes(1);
    expect(cancelCourse).not.toHaveBeenCalled();
    expect(downloadCourse).not.toHaveBeenCalled();
  } finally {
    timing.mockRestore();
  }
});

describe("accepted content height and reveal scheduling", () => {
  beforeEach(() => {
    // Reanimated's stock Jest mock creates a fresh shared value each render;
    // the installed native hook keeps one value for the component lifetime.
    const createMockSharedValue = Reanimated.useSharedValue;
    jest.spyOn(Reanimated, "useSharedValue").mockImplementation(function useStableSharedValue<Value>(initial: Value) {
      const [value] = React.useState(() => createMockSharedValue(initial));
      return value;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function renderPanel(expanded: boolean) {
    const row = (open: boolean) => <CourseImageDownloadRow slug="ptaki" courseName="Spanish" expanded={open} />;
    const screen = render(row(expanded));
    const layout = (height: number) => fireEvent(
      screen.getByTestId("course-image-row-ptaki", { includeHiddenElements: true }),
      "layout", { nativeEvent: { layout: { height } } },
    );
    return { screen, row, layout };
  }

  it.each([true, false])("rejects observed jitter without repeated renders or retargeting (expanded=%s)", (expanded) => {
    const timing = jest.spyOn(Reanimated, "withTiming");
    const diagnostic = jest.spyOn(Diagnostics, "recordCourseActivationEvent");
    const { layout } = renderPanel(expanded);
    const heights = [74.666687, 75.047607, 75.047638];
    layout(heights[0]);
    expect(timing).toHaveBeenLastCalledWith(expanded ? heights[0] : 0, expect.objectContaining({ duration: 260 }));
    timing.mockClear();
    diagnostic.mockClear();
    const renders = mockRowRender.mock.calls.length;

    layout(heights[1]);
    // React can attempt one render before bailing out of an unchanged state update.
    expect(mockRowRender.mock.calls.length - renders).toBeLessThanOrEqual(1);
    const settledRenders = mockRowRender.mock.calls.length;
    const remaining = [heights[2], ...heights, ...heights];
    remaining.forEach(layout);

    expect(mockRowRender).toHaveBeenCalledTimes(settledRenders);
    expect(timing).not.toHaveBeenCalled();
    expect(diagnostic.mock.calls).toEqual([heights[1], ...remaining].map(height => [
      "panel.layout", { slug: "ptaki", height },
    ]));
  });

  it("retains heights at both tolerance boundaries and accepts larger growth and shrinkage", () => {
    const timing = jest.spyOn(Reanimated, "withTiming");
    const { layout } = renderPanel(true);
    layout(100);
    timing.mockClear();

    layout(100.5);
    layout(99.5);
    expect(timing).not.toHaveBeenCalled();

    layout(100.5001);
    layout(99.5);
    expect(timing.mock.calls.map(([height]) => height)).toEqual([100.5001, 99.5]);
  });

  it.each([1, -1])("compares cumulative small changes against accepted height (direction=%s)", (direction) => {
    const timing = jest.spyOn(Reanimated, "withTiming");
    const { layout } = renderPanel(true);
    layout(100);
    timing.mockClear();

    layout(100 + direction * 0.25);
    layout(100 + direction * 0.5);
    expect(timing).not.toHaveBeenCalled();
    layout(100 + direction * 0.75);
    expect(timing).toHaveBeenCalledTimes(1);
    expect(timing).toHaveBeenLastCalledWith(100 + direction * 0.75, expect.objectContaining({ duration: 260 }));
    layout(100 + direction);
    layout(100 + direction * 1.25);
    expect(timing).toHaveBeenCalledTimes(1);
    layout(100 + direction * 1.5);
    expect(timing).toHaveBeenCalledTimes(2);
    expect(timing).toHaveBeenLastCalledWith(100 + direction * 1.5, expect.objectContaining({ duration: 260 }));
  });

  it("stores accepted collapsed growth and shrinkage for reopening without retargeting zero", () => {
    const timing = jest.spyOn(Reanimated, "withTiming");
    const diagnostic = jest.spyOn(Diagnostics, "recordCourseActivationEvent");
    const { screen, row, layout } = renderPanel(false);
    timing.mockClear();
    diagnostic.mockClear();

    [100, 100.25, 100.5, 100.75, 120, 90, 90.5].forEach(layout);
    expect(timing).not.toHaveBeenCalled();
    expect(diagnostic.mock.calls.every(([event]) => event === "panel.layout")).toBe(true);
    screen.rerender(row(true));
    expect(timing).toHaveBeenCalledTimes(1);
    expect(timing).toHaveBeenLastCalledWith(90, expect.objectContaining({ duration: 260 }));
    expect(diagnostic).toHaveBeenLastCalledWith("panel.state", {
      slug: "ptaki", expanded: true, phase: "missing",
    });
    expect(diagnostic).toHaveBeenCalledWith("panel.target", { slug: "ptaki", targetHeight: 90 });
  });

  it("only schedules reveal timing when target changes, including dynamic heights and rapid reversal", () => {
    const timing = jest.spyOn(Reanimated, "withTiming");
    const { screen, row, layout } = renderPanel(false);
    timing.mockClear();
    layout(120);
    layout(140);
    expect(timing).not.toHaveBeenCalled();
    screen.rerender(row(true));
    expect(timing).toHaveBeenLastCalledWith(140, expect.objectContaining({ duration: 260 }));
    timing.mockClear();
    layout(140);
    update({ phase: "downloading", downloadedBytes: 20000 });
    expect(timing).not.toHaveBeenCalled();

    // Translation/font scaling/status wrapping can change intrinsic height.
    layout(180);
    expect(timing).toHaveBeenLastCalledWith(180, expect.objectContaining({ duration: 260 }));
    screen.rerender(row(false));
    expect(timing).toHaveBeenLastCalledWith(0, expect.objectContaining({ duration: 260 }));
    timing.mockClear();
    layout(200); // New height during closing must not reschedule its zero target.
    expect(timing).not.toHaveBeenCalled();
    screen.rerender(row(true));
    expect(timing).toHaveBeenLastCalledWith(200, expect.objectContaining({ duration: 260 }));
    expect(refreshCourse).toHaveBeenCalledTimes(1);
  });

  it("batches actual old/new panels and ignores layout jitter under the provider", () => {
    const microtasks: (() => void)[] = [];
    jest.spyOn(globalThis, "queueMicrotask").mockImplementation(task => { microtasks.push(task); });
    const timing = jest.spyOn(Reanimated, "withTiming");
    const dispatch = jest.spyOn(Reanimated, "runOnUI");
    const rows = (selected: string) => <CourseImageRevealProvider>
      {["ptaki", "ptaki_fr"].map(slug => (
        <CourseImageDownloadRow key={slug} slug={slug} courseName={slug} expanded={selected === slug} />
      ))}
    </CourseImageRevealProvider>;
    const screen = render(rows("ptaki"));
    const layout = (slug: string, height: number) => fireEvent(
      screen.getByTestId(`course-image-row-${slug}`, { includeHiddenElements: true }),
      "layout", { nativeEvent: { layout: { height } } },
    );
    const flush = () => act(() => { microtasks.splice(0).forEach(task => task()); });
    layout("ptaki", 74.666687);
    layout("ptaki_fr", 120);
    expect(dispatch).not.toHaveBeenCalled();
    flush();
    expect(dispatch).toHaveBeenCalledTimes(1);
    timing.mockClear();
    dispatch.mockClear();

    screen.rerender(rows("ptaki_fr"));
    expect(timing).not.toHaveBeenCalled();
    expect(microtasks).toHaveLength(1);
    flush();
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(timing.mock.calls.map(([height]) => height)).toEqual([0, 120]);
    timing.mockClear();
    dispatch.mockClear();

    [120.38, 120.00003, 120].forEach(height => layout("ptaki_fr", height));
    [75.047607, 75.047638].forEach(height => layout("ptaki", height));
    flush();
    expect(dispatch).not.toHaveBeenCalled();
    expect(timing).not.toHaveBeenCalled();
    expect(refreshCourse).toHaveBeenCalledTimes(2);
    expect(downloadCourse).not.toHaveBeenCalled();
  });
});

it("shows the download panel and preview label with bundled images in development", () => {
  mockImagePAD = false;
  const screen = render(<CourseImageDownloadRow slug="ptaki" courseName="Ptaki" />);
  expect(screen.getByText("audioDownload.download")).toBeTruthy();
  expect(screen.getByText("contentDownload.preview")).toBeTruthy();
});
