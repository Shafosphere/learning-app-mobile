import React from "react";
import { render, waitFor, within } from "@testing-library/react-native";
import { Text as MockText } from "react-native";

import StatsScreen from "@/src/screens/stats/StatsScreen/StatsScreen";
import { useNavbarStatsSnapshot } from "@/src/contexts/NavbarStatsContext";
import { useSettings } from "@/src/contexts/SettingsContext";
import { themeMap } from "@/src/theme/theme";
import { getDailyActivitySummariesCustom } from "@/src/db/sqlite/db";
import { getProtectedDailyStreakState } from "@/src/services/streakProtection";

jest.mock("@expo/vector-icons/Ionicons", () => {
  function MockIonicons({ testID, name, color }: { testID?: string; name: string; color: string }) {
    return <MockText testID={testID} style={{ color }}>{name}</MockText>;
  }
  return MockIonicons;
});

jest.mock("@expo/vector-icons/MaterialIcons", () => {
  function MockMaterialIcons({ testID }: { testID?: string }) {
    return <MockText testID={testID}>icon</MockText>;
  }
  return MockMaterialIcons;
});

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      "screens.stats.stats.stats.textChild.codziennaPassa": "Codzienna passa",
      "repeats.labels.jumps": "Skoki",
    }[key] ?? key),
  }),
}));

jest.mock("@react-navigation/native", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    useFocusEffect: (effect: () => void | (() => void)) =>
      mockReact.useEffect(effect, [effect]),
  };
});

jest.mock("@/src/contexts/SettingsContext", () => {
  const useSettings = jest.fn();
  return { useSettings, useThemeSettings: useSettings };
});

jest.mock("@/src/contexts/NavbarStatsContext", () => ({
  useNavbarStatsSnapshot: jest.fn(),
}));

jest.mock("@/src/components/stats/BigKnownWordsCard", () => {
  function MockBigKnownWordsCard() {
    return <MockText>known</MockText>;
  }
  return MockBigKnownWordsCard;
});
jest.mock("@/src/components/stats/ActivityHeatmap", () => {
  function MockActivityHeatmap({
    data,
    shieldedDates,
    isLoading,
  }: {
    data: unknown[];
    shieldedDates?: string[];
    isLoading?: boolean;
  }) {
    return (
      <MockText testID="activity-heatmap-props">
        {JSON.stringify({ data, shieldedDates, isLoading })}
      </MockText>
    );
  }
  return MockActivityHeatmap;
});
jest.mock("@/src/components/stats/HardWordsList", () => {
  function MockHardWordsList() {
    return <MockText>hard</MockText>;
  }
  return MockHardWordsList;
});
jest.mock("@/src/components/stats/HourlyActivityChart", () => {
  function MockHourlyActivityChart() {
    return <MockText>time</MockText>;
  }
  return MockHourlyActivityChart;
});
jest.mock("@/src/components/stats/PinnedCoursesProgress", () => {
  function MockPinnedCoursesProgress() {
    return <MockText>courses</MockText>;
  }
  return MockPinnedCoursesProgress;
});

jest.mock("@/src/db/sqlite/db", () => ({
  getDailyActivitySummariesCustom: jest.fn(() => new Promise(() => {})),
  getTotalLearningTimeMs: jest.fn(() => new Promise(() => {})),
  getRecentLearningHistory: jest.fn(() => Promise.resolve([])),
}));

jest.mock("@/src/services/streakProtection", () => ({
  MAX_STREAK_SHIELDS: 2,
  getProtectedDailyStreakState: jest.fn(() => new Promise(() => {})),
}));

const mockedUseNavbarStatsSnapshot = useNavbarStatsSnapshot as jest.MockedFunction<
  typeof useNavbarStatsSnapshot
>;
const mockedUseSettings = useSettings as jest.Mock;
const mockedGetDailyActivitySummariesCustom =
  getDailyActivitySummariesCustom as jest.MockedFunction<
    typeof getDailyActivitySummariesCustom
  >;
const mockedGetProtectedDailyStreakState =
  getProtectedDailyStreakState as jest.MockedFunction<
    typeof getProtectedDailyStreakState
  >;

function mockStats(shieldCount: 0 | 1 | 2, streakDays = 12, promotionsCount = 4) {
  mockedUseNavbarStatsSnapshot.mockReturnValue({
    masteredCount: 0,
    streakDays,
    shieldCount,
    promotionsCount,
  });
}

describe("StatsScreen streak shields", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseSettings.mockReturnValue({
      statsBookshelfEnabled: false,
      theme: "light",
      colors: themeMap.light,
      fontScaleMultiplier: 1,
    });
  });

  it.each([0, 1, 2] as const)("renders two shield slots with %i owned shields", (shieldCount) => {
    mockStats(shieldCount);
    const screen = render(<StatsScreen />);

    for (let index = 0; index < 2; index += 1) {
      const owned = index < shieldCount;
      const ownedId = `streak-shield-${index}`;
      const emptyId = `streak-shield-empty-${index}`;
      const shield = screen.getByTestId(owned ? ownedId : emptyId);
      expect(shield.props.source).toContainEqual(
        owned
          ? require("@/assets/ui/stats/shield.svg")
          : require("@/assets/ui/stats/shield-border.svg")
      );
      expect(screen.queryByTestId(owned ? emptyId : ownedId)).toBeNull();
    }
    expect(screen.queryByTestId("streak-shield-empty-2")).toBeNull();
  });

  it("keeps live counts and labels inside static cards", () => {
    mockStats(1, 3, 1834);
    const screen = render(<StatsScreen />);

    const streak = within(screen.getByTestId("streak-card"));
    const jumps = within(screen.getByTestId("jumps-card"));
    expect(streak.getByText("3")).toBeTruthy();
    expect(streak.getByText("Codzienna passa")).toBeTruthy();
    expect(jumps.getByText("1834")).toBeTruthy();
    expect(jumps.getByText("Skoki")).toBeTruthy();
    expect(streak.queryByRole("button")).toBeNull();
    expect(jumps.queryByRole("button")).toBeNull();

    mockStats(0, 0, 0);
    screen.rerender(<StatsScreen />);
    expect(screen.getByTestId("streak-value")).toHaveTextContent("0");
    expect(screen.getByTestId("jumps-value")).toHaveTextContent("0");
  });

  it("passes loading state until activity summaries have finished loading", async () => {
    mockStats(0);
    let finish!: (value: []) => void;
    mockedGetDailyActivitySummariesCustom.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    mockedGetProtectedDailyStreakState.mockRejectedValue(new Error("shield read failed"));
    const screen = render(<StatsScreen />);
    const props = () => JSON.parse(screen.getByTestId("activity-heatmap-props").props.children);
    expect(props().isLoading).toBe(true);
    finish([]);
    await waitFor(() => expect(props().isLoading).toBe(false));
  });

  it("ends the loading state when activity summaries fail", async () => {
    mockStats(0);
    mockedGetDailyActivitySummariesCustom.mockRejectedValue(new Error("activity read failed"));
    const screen = render(<StatsScreen />);
    await waitFor(() => {
      const props = JSON.parse(screen.getByTestId("activity-heatmap-props").props.children);
      expect(props.isLoading).toBe(false);
      expect(props.data).toEqual([]);
    });
    expect(mockedGetProtectedDailyStreakState).not.toHaveBeenCalled();
  });

  it("keeps heatmap activity when shield history fails to load", async () => {
    mockStats(1);
    const activitySummary = {
      date: "2026-04-20",
      learnedCount: 3,
      timeMs: 0,
      correctCount: 0,
      wrongCount: 0,
      promotionsCount: 0,
      totalCount: 3,
    };
    mockedGetDailyActivitySummariesCustom.mockResolvedValue([
      activitySummary,
    ]);
    mockedGetProtectedDailyStreakState.mockRejectedValue(
      new Error("shield read failed")
    );

    const screen = render(<StatsScreen />);

    await waitFor(() => {
      const props = JSON.parse(
        screen.getByTestId("activity-heatmap-props").props.children
      );
      expect(props.data).toEqual([activitySummary]);
      expect(props.shieldedDates).toEqual([]);
    });
  });
});
