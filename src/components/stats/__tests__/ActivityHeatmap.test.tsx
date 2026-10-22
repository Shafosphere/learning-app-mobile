import { act, fireEvent, render, within } from "@testing-library/react-native";
import React from "react";
import { AppState, FlatList, useWindowDimensions } from "react-native";

import { resolveThemeColors } from "@/src/theme/theme";
import { useSettings } from "@/src/contexts/SettingsContext";

import ActivityHeatmap, {
  type ActivityDay,
} from "@/src/components/stats/ActivityHeatmap";

jest.mock("react-native/Libraries/Utilities/useWindowDimensions", () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 375, height: 812, scale: 1, fontScale: 1 })),
}));

jest.mock("@expo/vector-icons/Ionicons", () => {
  const { Text } = jest.requireActual<typeof import("react-native")>(
    "react-native"
  );

  function MockIonicons({ testID }: { testID?: string }) {
    return <Text testID={testID}>shield</Text>;
  }
  return MockIonicons;
});

jest.mock("@/src/contexts/SettingsContext", () => {
  const settings = {
    theme: "light",
    colors: {
      background: "#f2f4f6",
      secondBackground: "#fffffe",
      headline: "#00214d",
      paragraph: "#1b2d45",
      my_green: "#00ebc7",
      my_red: "#ff5470",
      my_yellow: "#fde24f",
      border: "#e9e9e9",
      font: "#00214d",
      darkbg: "#001534",
      lightbg: "#fffffe",
      variants: {
        highContrast: {},
        deuteranopia: {},
        protanopia: {},
        tritanopia: {},
      },
    },
    accessibilityPreferences: { highContrastEnabled: false },
    fontScaleMultiplier: 1,
  };
  const useSettings = jest.fn(() => settings);
  return { useSettings, useThemeSettings: useSettings };
});

jest.mock("react-i18next", () => {
  const translation = { t: (key: string) => key };
  return { useTranslation: () => translation };
});

function formatLocalDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function activityDay(date: string, overrides: Partial<ActivityDay> = {}): ActivityDay {
  return {
    date,
    learnedCount: 0,
    timeMs: 0,
    correctCount: 0,
    wrongCount: 0,
    promotionsCount: 0,
    totalCount: 0,
    ...overrides,
  };
}

function measure(screen: ReturnType<typeof render>, width = 350) {
  fireEvent(screen.getByTestId("activity-heatmap-calendar"), "layout", {
    nativeEvent: { layout: { width, height: 0, x: 0, y: 0 } },
  });
}

function renderHeatmap(element: React.ReactElement) {
  const screen = render(element);
  measure(screen);
  return screen;
}

function dayCell(screen: ReturnType<typeof render>, day: number) {
  return screen.getByTestId(`activity-heatmap-day-2026-10-${String(day).padStart(2, "0")}`);
}

describe("ActivityHeatmap shielded days", () => {
  const todayKey = formatLocalDateOnly(new Date());

  it("renders a shield for a shielded day without activity", () => {
    const screen = renderHeatmap(
      <ActivityHeatmap
        data={[]}
        months={1}
        shieldedDates={[todayKey]}
      />
    );

    expect(
      screen.getByTestId(`activity-heatmap-shield-${todayKey}`)
    ).toBeTruthy();
  });

  it("does not render a shield for a shielded day with activity", () => {
    const screen = renderHeatmap(
      <ActivityHeatmap
        data={[activityDay(todayKey, { timeMs: 1000, totalCount: 1 })]}
        months={1}
        shieldedDates={[todayKey]}
      />
    );

    expect(
      screen.queryByTestId(`activity-heatmap-shield-${todayKey}`)
    ).toBeNull();
  });
});

describe("ActivityHeatmap month navigation", () => {
  const previousLabel = "components.stats.activityHeatmap.navigation.previousMonth";
  const nextLabel = "components.stats.activityHeatmap.navigation.nextMonth";

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 9, 21, 12));
    jest.spyOn(FlatList.prototype, "scrollToEnd").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it("scrolls between months, updates the details, and disables buttons at the ends", () => {
    const scrollToOffset = jest.spyOn(FlatList.prototype, "scrollToOffset")
      .mockImplementation(() => {});
    const screen = renderHeatmap(<ActivityHeatmap data={[]} months={2} />);
    fireEvent(screen.getByTestId("activity-heatmap-calendar"), "layout", {
      nativeEvent: { layout: { width: 350, height: 0, x: 0, y: 0 } },
    });
    act(() => { jest.advanceTimersByTime(32); });

    expect(screen.getByRole("button", { name: nextLabel })).toBeDisabled();
    fireEvent.press(screen.getByRole("button", { name: previousLabel }));
    expect(scrollToOffset).toHaveBeenLastCalledWith({ offset: 0, animated: true });
    expect(screen.getByText("components.stats.activityHeatmap.months.8 2026")).toBeTruthy();
    expect(screen.getByLabelText("30 components.stats.activityHeatmap.months.8 2026")).toBeTruthy();
    expect(screen.getByRole("button", { name: previousLabel })).toBeDisabled();

    fireEvent.press(screen.getByRole("button", { name: nextLabel }));
    expect(scrollToOffset).toHaveBeenLastCalledWith({ offset: 350, animated: true });
    expect(screen.getByText("components.stats.activityHeatmap.months.9 2026")).toBeTruthy();
    expect(screen.getByLabelText("21 components.stats.activityHeatmap.months.9 2026")).toBeTruthy();
    expect(screen.getByRole("button", { name: nextLabel })).toBeDisabled();
  });

  it("keeps button navigation in sync after swiping", () => {
    const scrollToOffset = jest.spyOn(FlatList.prototype, "scrollToOffset")
      .mockImplementation(() => {});
    const screen = renderHeatmap(<ActivityHeatmap data={[]} months={3} />);
    fireEvent(screen.getByTestId("activity-heatmap-calendar"), "layout", {
      nativeEvent: { layout: { width: 350, height: 0, x: 0, y: 0 } },
    });
    act(() => { jest.advanceTimersByTime(32); });
    fireEvent(screen.getByTestId("activity-heatmap-pager"), "momentumScrollEnd", {
      nativeEvent: { contentOffset: { x: 0, y: 0 } },
    });

    expect(screen.getByRole("button", { name: previousLabel })).toBeDisabled();
    fireEvent.press(screen.getByRole("button", { name: nextLabel }));
    expect(scrollToOffset).toHaveBeenLastCalledWith({ offset: 350, animated: true });
    expect(screen.getByText("components.stats.activityHeatmap.months.8 2026")).toBeTruthy();
  });

  it("disables both buttons when there is only one month", () => {
    const screen = renderHeatmap(<ActivityHeatmap data={[]} months={1} />);
    fireEvent(screen.getByTestId("activity-heatmap-calendar"), "layout", {
      nativeEvent: { layout: { width: 350, height: 0, x: 0, y: 0 } },
    });
    expect(screen.getByRole("button", { name: previousLabel })).toBeDisabled();
    expect(screen.getByRole("button", { name: nextLabel })).toBeDisabled();
  });
});

describe("ActivityHeatmap day details", () => {
  const todayKey = formatLocalDateOnly(new Date());

  afterEach(() => {
    jest.mocked(useWindowDimensions).mockReturnValue({
      width: 375, height: 812, scale: 1, fontScale: 1,
    });
    jest.useRealTimers();
  });

  it("animates the date and switches empty content to real activity when selecting another day", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 9, 21, 12));
    const screen = renderHeatmap(
      <ActivityHeatmap
        data={[activityDay("2026-10-20", { totalCount: 1 })]}
        months={1}
      />
    );
    const previousTitle = "21 components.stats.activityHeatmap.months.9 2026";
    const nextTitle = "20 components.stats.activityHeatmap.months.9 2026";
    const previousDescription = "components.stats.activityHeatmap.details.emptyDescription";
    const nextDescription = "components.stats.activityHeatmap.details.selectedDayActivity";
    const includeAnimation = { includeHiddenElements: true };

    expect(screen.getByText(previousDescription)).toBeTruthy();
    fireEvent.press(screen.getByText("20"));
    expect(screen.getByText(previousTitle, includeAnimation)).toBeTruthy();
    expect(screen.queryByTestId("activity-details-empty")).toBeNull();
    expect(screen.getByLabelText(nextTitle)).toBeTruthy();
    expect(screen.getByText(nextTitle, includeAnimation)).toHaveStyle({ opacity: 0 });

    act(() => { jest.advanceTimersByTime(160); });
    expect(screen.queryByText(previousTitle, includeAnimation)).toBeNull();
    expect(screen.getAllByText(nextTitle, includeAnimation)).toHaveLength(1);
    expect(screen.queryByText(previousDescription, includeAnimation)).toBeNull();
    expect(screen.getAllByText(nextDescription, includeAnimation)).toHaveLength(1);

    act(() => { jest.advanceTimersByTime(1000); });
    expect(screen.getAllByText(nextTitle, includeAnimation)).toHaveLength(2);
    expect(screen.getAllByText(nextDescription, includeAnimation)).toHaveLength(1);
  });

  it("shows loading before the empty state and updates when real data arrives", () => {
    const screen = renderHeatmap(<ActivityHeatmap data={[]} months={1} isLoading />);
    expect(screen.getByTestId("activity-details-loading")).toBeTruthy();
    expect(screen.queryByTestId("activity-details-empty")).toBeNull();
    screen.rerender(<ActivityHeatmap data={[]} months={1} />);
    expect(screen.getByTestId("activity-details-empty")).toBeTruthy();
    expect(screen.queryByTestId("activity-details-grid")).toBeNull();
    screen.rerender(<ActivityHeatmap data={[activityDay(todayKey, { timeMs: 60000 })]} months={1} />);
    expect(screen.queryByTestId("activity-details-empty")).toBeNull();
    expect(within(screen.getByTestId("activity-details-stat-time")).getByText("1")).toBeTruthy();
  });

  it.each(["timeMs", "learnedCount", "correctCount", "wrongCount", "promotionsCount", "totalCount"] as const)(
    "treats a positive %s as activity even when other fields are zero",
    (field) => {
      const screen = renderHeatmap(<ActivityHeatmap data={[activityDay(todayKey, { [field]: 1 })]} months={1} />);
      expect(screen.getByTestId("activity-details-grid")).toBeTruthy();
      expect(screen.queryByTestId("activity-details-empty")).toBeNull();
    },
  );

  it("keeps shield-only days empty and switches back after selecting a day without events", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 9, 21, 12));
    const screen = renderHeatmap(<ActivityHeatmap
      data={[activityDay("2026-10-20", { correctCount: 2 })]}
      shieldedDates={["2026-10-21"]}
      months={1}
    />);
    expect(screen.getByTestId("activity-details-empty")).toBeTruthy();
    expect(screen.getByTestId("activity-heatmap-shield-2026-10-21")).toBeTruthy();
    fireEvent.press(dayCell(screen, 20));
    expect(screen.getByTestId("activity-details-grid")).toBeTruthy();
    fireEvent.press(dayCell(screen, 21));
    expect(screen.getByTestId("activity-details-empty")).toBeTruthy();
    expect(screen.queryByTestId("activity-details-grid")).toBeNull();
  });

  it.each([
    { width: 220, fontScale: 1 },
    { width: 260, fontScale: 1 },
    { width: 315, fontScale: 1 },
    { width: 370, fontScale: 1 },
    { width: 440, fontScale: 1 },
    { width: 315, fontScale: 1.5 },
  ])("keeps one full-width column at $width with font scale $fontScale, including after widening", ({ width, fontScale }) => {
    jest.mocked(useWindowDimensions).mockReturnValue({
      width: 375, height: 812, scale: 1, fontScale,
    });
    const screen = renderHeatmap(<ActivityHeatmap data={[activityDay(todayKey, { totalCount: 1 })]} months={1} />);

    for (const gridWidth of [width, 500]) {
      fireEvent(screen.getByTestId("activity-details-grid"), "layout", {
        nativeEvent: { layout: { width: gridWidth, height: 0, x: 0, y: 0 } },
      });
      const grid = screen.getByTestId("activity-details-grid");
      expect(grid).toHaveStyle({ flexDirection: "column", alignItems: "stretch" });
      expect(within(grid).getAllByTestId(/^activity-details-stat-/)).toHaveLength(5);
      for (const key of ["promotions", "learned", "correct", "wrong", "time"]) {
        expect(screen.getByTestId(`activity-details-stat-${key}`)).toHaveStyle({
          flex: 0, alignSelf: "stretch", minWidth: 0,
        });
      }
    }
  });

  it("resolves animated counts and total minutes after updating the day", () => {
    jest.useFakeTimers();
    const screen = renderHeatmap(<ActivityHeatmap data={[activityDay(todayKey, { totalCount: 1 })]} months={1} />);
    expect(within(screen.getByTestId("activity-details-stat-time")).getByText("0")).toBeTruthy();

    screen.rerender(<ActivityHeatmap
      data={[activityDay(todayKey, {
        promotionsCount: 123456, learnedCount: 42, correctCount: 87,
        wrongCount: 3, timeMs: 65 * 60000, totalCount: 123588,
      })]}
      months={1}
    />);
    act(() => { jest.advanceTimersByTime(800); });

    for (const [key, value] of [
      ["promotions", "123456"], ["learned", "42"], ["correct", "87"], ["wrong", "3"],
    ]) {
      expect(within(screen.getByTestId(`activity-details-stat-${key}`)).getByText(value)).toBeTruthy();
    }
    expect(within(screen.getByTestId("activity-details-stat-time")).getByText("65")).toBeTruthy();
  });
});


describe("ActivityHeatmap date refresh", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 9, 21, 23, 59, 59));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it("enables each new day at local midnight without parent updates", () => {
    const onSelect = jest.fn();
    const screen = renderHeatmap(<ActivityHeatmap data={[]} months={1} onSelect={onSelect} />);
    expect(dayCell(screen, 22)).toBeDisabled();

    act(() => { jest.advanceTimersByTime(1000); });
    expect(dayCell(screen, 22)).not.toBeDisabled();
    expect(dayCell(screen, 23)).toBeDisabled();
    fireEvent.press(dayCell(screen, 22));
    expect(onSelect).toHaveBeenCalledWith(activityDay("2026-10-22"));

    act(() => { jest.advanceTimersByTime(24 * 60 * 60 * 1000); });
    expect(dayCell(screen, 23)).not.toBeDisabled();
    expect(dayCell(screen, 24)).toBeDisabled();
  });

  it.each([
    [new Date(2026, 9, 31, 23, 59, 59), "2026-11"],
    [new Date(2026, 11, 31, 23, 59, 59), "2027-01"],
  ])("updates the calendar month after midnight from %s", (date, monthKey) => {
    jest.setSystemTime(date);
    const screen = renderHeatmap(<ActivityHeatmap data={[]} months={1} />);

    act(() => { jest.advanceTimersByTime(1000); });

    expect(screen.getByTestId(`activity-heatmap-month-${monthKey}`)).toBeTruthy();
    expect(screen.getByTestId(`activity-heatmap-day-${monthKey}-01`)).not.toBeDisabled();
    expect(screen.getByTestId(`activity-heatmap-day-${monthKey}-02`)).toBeDisabled();
  });

  it("refreshes on resume and reschedules midnight after suspended timers", () => {
    const listener = jest.spyOn(AppState, "addEventListener");
    const screen = renderHeatmap(<ActivityHeatmap data={[]} months={1} />);
    const onChange = (state: "background" | "active") => {
      listener.mock.calls.forEach(([event, handler]) => {
        if (event === "change") handler(state);
      });
    };

    act(() => { onChange("background"); });
    // Move the clock without running timers, as when the app is suspended.
    jest.setSystemTime(new Date(2026, 9, 24, 23, 59, 58));
    act(() => { onChange("active"); });
    expect(dayCell(screen, 24)).not.toBeDisabled();
    expect(dayCell(screen, 25)).toBeDisabled();

    act(() => { jest.advanceTimersByTime(1000); });
    expect(dayCell(screen, 25)).toBeDisabled();
    act(() => { jest.advanceTimersByTime(1000); });
    expect(dayCell(screen, 25)).not.toBeDisabled();
  });

  it("removes the resume listener and midnight timer on unmount", () => {
    const remove = jest.fn();
    jest.spyOn(AppState, "addEventListener").mockReturnValue({ remove });
    const timersBefore = jest.getTimerCount();
    const screen = renderHeatmap(<ActivityHeatmap data={[]} months={1} />);
    expect(jest.getTimerCount()).toBeGreaterThan(timersBefore);

    screen.unmount();

    expect(remove).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(timersBefore);
  });
});

describe("ActivityHeatmap rendering boundaries", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 9, 21, 12));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it("waits for width and initially mounts only the current month", () => {
    const scrollToEnd = jest.spyOn(FlatList.prototype, "scrollToEnd").mockImplementation(() => {});
    const screen = render(<ActivityHeatmap data={[]} />);
    expect(screen.queryByTestId("activity-heatmap-pager")).toBeNull();
    expect(screen.queryByText("21")).toBeNull();
    measure(screen, 0);
    expect(screen.queryByTestId("activity-heatmap-pager")).toBeNull();

    measure(screen);
    const pager = screen.UNSAFE_getByType(FlatList);
    expect(pager.props.initialScrollIndex).toBe(11);
    expect(pager.props.initialNumToRender).toBe(1);
    expect(pager.props.windowSize).toBe(5);
    expect(pager.props.getItemLayout(pager.props.data, 11)).toEqual({
      length: 350, offset: 3850, index: 11,
    });
    // Disabled 22nd belongs to October, rather than an earlier month.
    expect(dayCell(screen, 22)).toBeDisabled();
    expect(screen.getAllByText("21")).toHaveLength(1);
    act(() => { jest.advanceTimersByTime(100); });
    expect(scrollToEnd).not.toHaveBeenCalled();
  });

  it("updates only previous/new cells and leaves grids stable during details animation", () => {
    const screen = renderHeatmap(<ActivityHeatmap data={[]} months={1} />);
    const before = new Map(Array.from({ length: 31 }, (_, index) => {
      const day = index + 1;
      return [day, dayCell(screen, day).props];
    }));
    fireEvent.press(dayCell(screen, 20));
    for (let day = 1; day <= 31; day += 1) {
      const props = dayCell(screen, day).props;
      if (day === 20 || day === 21) {
        expect(props.style).not.toBe(before.get(day).style);
      } else {
        expect(props.style).toBe(before.get(day).style);
      }
    }
    expect(dayCell(screen, 20)).toHaveStyle({ borderWidth: 2 });
    expect(dayCell(screen, 21)).toHaveStyle({ borderWidth: 0 });
    const styles = Array.from({ length: 31 }, (_, index) => dayCell(screen, index + 1).props.style);
    act(() => { jest.advanceTimersByTime(1000); });
    styles.forEach((style, index) => expect(dayCell(screen, index + 1).props.style).toBe(style));
  });

  it("leaves other mounted months unchanged when selecting a day", () => {
    const screen = renderHeatmap(<ActivityHeatmap data={[]} months={3} />);
    const pager = screen.getByTestId("activity-heatmap-pager");
    fireEvent(pager, "layout", {
      nativeEvent: { layout: { width: 350, height: 600, x: 0, y: 0 } },
    });
    fireEvent(pager, "contentSizeChange", 1050, 600);
    fireEvent.scroll(pager, {
      nativeEvent: {
        contentOffset: { x: 700, y: 0 },
        contentSize: { width: 1050, height: 600 },
        layoutMeasurement: { width: 350, height: 600 },
      },
    });
    act(() => { jest.advanceTimersByTime(100); });
    const previousMonth = screen.getByTestId("activity-heatmap-month-2026-09");
    const monthStyle = previousMonth.props.style;
    const dayStyle = screen.getByTestId("activity-heatmap-day-2026-09-19").props.style;
    fireEvent.press(dayCell(screen, 20));
    expect(screen.getByTestId("activity-heatmap-month-2026-09").props.style).toBe(monthStyle);
    expect(screen.getByTestId("activity-heatmap-day-2026-09-19").props.style).toBe(dayStyle);
    const currentMonthStyle = screen.getByTestId("activity-heatmap-month-2026-10").props.style;
    act(() => { jest.advanceTimersByTime(1000); });
    expect(screen.getByTestId("activity-heatmap-month-2026-09").props.style).toBe(monthStyle);
    expect(screen.getByTestId("activity-heatmap-month-2026-10").props.style).toBe(currentMonthStyle);
  });

  it("keeps selection callbacks current, including repeated selections, and rejects future days", () => {
    const first = jest.fn();
    const second = jest.fn();
    const day = activityDay("2026-10-20", { totalCount: 1 });
    const data = [day];
    const screen = renderHeatmap(<ActivityHeatmap data={data} months={1} onSelect={first} />);
    fireEvent.press(dayCell(screen, 20));
    fireEvent.press(dayCell(screen, 20));
    expect(first).toHaveBeenCalledTimes(2);
    expect(first).toHaveBeenLastCalledWith(day);
    fireEvent.press(dayCell(screen, 22));
    expect(first).toHaveBeenCalledTimes(2);

    screen.rerender(<ActivityHeatmap data={data} months={1} onSelect={second} />);
    fireEvent.press(dayCell(screen, 20));
    expect(second).toHaveBeenCalledWith(day);
    expect(first).toHaveBeenCalledTimes(2);
  });

  it("keeps unrelated parent renders out of the heatmap", () => {
    const data: ActivityDay[] = [];
    const screen = renderHeatmap(<ActivityHeatmap data={data} months={1} />);
    const calls = jest.mocked(useSettings).mock.calls.length;
    const style = dayCell(screen, 21).props.style;
    screen.rerender(<ActivityHeatmap data={data} months={1} />);
    expect(jest.mocked(useSettings).mock.calls.length).toBe(calls);
    expect(dayCell(screen, 21).props.style).toBe(style);
  });

  it("realigns the visible month after resize without resetting selection", () => {
    const scroll = jest.spyOn(FlatList.prototype, "scrollToOffset").mockImplementation(() => {});
    const screen = renderHeatmap(<ActivityHeatmap data={[]} months={3} />);
    fireEvent.press(dayCell(screen, 20));
    fireEvent(screen.getByTestId("activity-heatmap-pager"), "momentumScrollEnd", {
      nativeEvent: { contentOffset: { x: 350, y: 0 } },
    });
    measure(screen, 500);
    expect(scroll).toHaveBeenLastCalledWith({ offset: 500, animated: false });
    expect(screen.getByLabelText("30 components.stats.activityHeatmap.months.8 2026")).toBeTruthy();
    const calls = scroll.mock.calls.length;
    measure(screen, 0);
    measure(screen, 500);
    expect(scroll).toHaveBeenCalledTimes(calls);
    fireEvent.press(screen.getByRole("button", {
      name: "components.stats.activityHeatmap.navigation.nextMonth",
    }));
    expect(scroll).toHaveBeenLastCalledWith({ offset: 1000, animated: true });
    expect(screen.getByLabelText("20 components.stats.activityHeatmap.months.9 2026")).toBeTruthy();
  });

  it("refreshes cell colors, shields, and details when activity changes", () => {
    const shieldedDates = ["2026-10-21"];
    const screen = renderHeatmap(<ActivityHeatmap data={[]} months={1} shieldedDates={shieldedDates} />);
    expect(screen.getByTestId("activity-heatmap-shield-2026-10-21")).toBeTruthy();
    screen.rerender(<ActivityHeatmap
      data={[activityDay("2026-10-21", { timeMs: 60000, totalCount: 1 })]}
      months={1}
      shieldedDates={shieldedDates}
    />);
    expect(screen.queryByTestId("activity-heatmap-shield-2026-10-21")).toBeNull();
    expect(dayCell(screen, 21)).toHaveStyle({ backgroundColor: "#00ebc7FF", borderWidth: 2 });
    act(() => { jest.advanceTimersByTime(1000); });
    expect(within(screen.getByTestId("activity-details-stat-time")).getByText("1")).toBeTruthy();
  });

  it.each(["light", "dark"] as const)("keeps both empty and active calendar days readable in %s high contrast", (theme) => {
    const original = jest.mocked(useSettings)();
    const colors = resolveThemeColors(theme, { highContrast: true });
    jest.mocked(useSettings).mockReturnValue({
      ...original, theme, colors,
      accessibilityPreferences: { ...original.accessibilityPreferences, highContrastEnabled: true },
    });
    try {
      const screen = renderHeatmap(<ActivityHeatmap data={[activityDay("2026-10-21", { timeMs: 60000 })]} months={1} />);
      expect(dayCell(screen, 20)).toHaveStyle({ backgroundColor: colors.background });
      expect(within(dayCell(screen, 20)).getByText("20")).toHaveStyle({ color: colors.headline, opacity: 1 });
      expect(within(dayCell(screen, 21)).getByText("21")).toHaveStyle({
        color: theme === "light" ? colors.lightbg : colors.darkbg,
        opacity: 1,
      });
    } finally {
      jest.mocked(useSettings).mockReturnValue(original);
    }
  });

  it("propagates theme, contrast, and font changes through memoized cells", () => {
    const settings = jest.mocked(useSettings)();
    const data: ActivityDay[] = [];
    const screen = renderHeatmap(<ActivityHeatmap data={data} months={1} shieldedDates={["2026-10-21"]} />);
    try {
      jest.mocked(useSettings).mockReturnValue({
        ...settings,
        theme: "dark",
        colors: { ...settings.colors, headline: "#ffffff", border: "#123456", my_green: "#abcdef" },
        accessibilityPreferences: { ...settings.accessibilityPreferences, highContrastEnabled: true },
        fontScaleMultiplier: 1.5,
      });
      screen.rerender(<ActivityHeatmap data={data} months={1} shieldedDates={["2026-10-21"]} />);
      expect(dayCell(screen, 21)).toHaveStyle({ backgroundColor: settings.colors.background, borderColor: "#abcdef" });
      expect(within(dayCell(screen, 21)).getByText("21")).toHaveStyle({ color: settings.colors.darkbg, fontSize: 33.75 });
      expect(screen.getByTestId("activity-heatmap-shield-2026-10-21")).toHaveStyle({ opacity: 0.34 });
      expect(screen.getByTestId("activity-details-card")).toHaveStyle({ borderWidth: 1 });
    } finally {
      jest.mocked(useSettings).mockReturnValue(settings);
    }
  });
});
