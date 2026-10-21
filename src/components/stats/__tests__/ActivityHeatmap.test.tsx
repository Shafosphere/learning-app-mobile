import { act, fireEvent, render, within } from "@testing-library/react-native";
import React from "react";
import { FlatList, useWindowDimensions } from "react-native";

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
  const useSettings = () => ({
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
    accessibilityPreferences: {},
    fontScaleMultiplier: 1,
  });
  return { useSettings, useThemeSettings: useSettings };
});

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

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

describe("ActivityHeatmap shielded days", () => {
  const todayKey = formatLocalDateOnly(new Date());

  it("renders a shield for a shielded day without activity", () => {
    const screen = render(
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
    const screen = render(
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
    const screen = render(<ActivityHeatmap data={[]} months={2} />);
    fireEvent(screen.getByTestId("activity-heatmap"), "layout", {
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
    const screen = render(<ActivityHeatmap data={[]} months={3} />);
    fireEvent(screen.getByTestId("activity-heatmap"), "layout", {
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
    const screen = render(<ActivityHeatmap data={[]} months={1} />);
    fireEvent(screen.getByTestId("activity-heatmap"), "layout", {
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

  it("animates the date and description when selecting another day", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 9, 21, 12));
    const screen = render(
      <ActivityHeatmap
        data={[activityDay("2026-10-20", { totalCount: 1 })]}
        months={1}
      />
    );
    const previousTitle = "21 components.stats.activityHeatmap.months.9 2026";
    const nextTitle = "20 components.stats.activityHeatmap.months.9 2026";
    const previousDescription = "components.stats.activityHeatmap.details.noActivityForDay";
    const nextDescription = "components.stats.activityHeatmap.details.selectedDayActivity";
    const includeAnimation = { includeHiddenElements: true };

    fireEvent.press(screen.getByText("20"));
    expect(screen.getByText(previousTitle, includeAnimation)).toBeTruthy();
    expect(screen.getByText(previousDescription, includeAnimation)).toBeTruthy();
    expect(screen.getByLabelText(nextTitle)).toBeTruthy();
    expect(screen.getByText(nextTitle, includeAnimation)).toHaveStyle({ opacity: 0 });

    act(() => { jest.advanceTimersByTime(160); });
    expect(screen.queryByText(previousTitle, includeAnimation)).toBeNull();
    expect(screen.getAllByText(nextTitle, includeAnimation)).toHaveLength(1);
    expect(screen.queryByText(previousDescription, includeAnimation)).toBeNull();
    expect(screen.getAllByText(nextDescription, includeAnimation)).toHaveLength(1);

    act(() => { jest.advanceTimersByTime(1000); });
    expect(screen.getAllByText(nextTitle, includeAnimation)).toHaveLength(2);
    expect(screen.getAllByText(nextDescription, includeAnimation)).toHaveLength(2);
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
    const screen = render(<ActivityHeatmap data={[]} months={1} />);

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
    const screen = render(<ActivityHeatmap data={[]} months={1} />);
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
