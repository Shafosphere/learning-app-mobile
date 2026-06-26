import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import { Text as MockText } from "react-native";

import StatsScreen from "@/src/screens/stats/StatsScreen/StatsScreen";
import { useNavbarStats } from "@/src/contexts/NavbarStatsContext";
import { getDailyActivitySummariesCustom } from "@/src/db/sqlite/db";
import { getProtectedDailyStreakState } from "@/src/services/streakProtection";

jest.mock("@expo/vector-icons/Ionicons", () => {
  function MockIonicons({ testID }: { testID?: string }) {
    return <MockText testID={testID}>icon</MockText>;
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
    t: (key: string) => key,
  }),
}));

jest.mock("@/src/contexts/SettingsContext", () => ({
  useSettings: () => ({
    statsBookshelfEnabled: false,
    colors: {
      background: "#fff",
      secondBackground: "#f4f4f4",
      headline: "#111",
      paragraph: "#333",
      my_green: "#00ebc7",
      my_red: "#ff5470",
      my_yellow: "#fde24f",
    },
  }),
}));

jest.mock("@/src/contexts/NavbarStatsContext", () => ({
  useNavbarStats: jest.fn(),
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
  }: {
    data: unknown[];
    shieldedDates?: string[];
  }) {
    return (
      <MockText testID="activity-heatmap-props">
        {JSON.stringify({ data, shieldedDates })}
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
}));

jest.mock("@/src/services/streakProtection", () => ({
  getProtectedDailyStreakState: jest.fn(() => new Promise(() => {})),
}));

const mockedUseNavbarStats = useNavbarStats as jest.MockedFunction<
  typeof useNavbarStats
>;
const mockedGetDailyActivitySummariesCustom =
  getDailyActivitySummariesCustom as jest.MockedFunction<
    typeof getDailyActivitySummariesCustom
  >;
const mockedGetProtectedDailyStreakState =
  getProtectedDailyStreakState as jest.MockedFunction<
    typeof getProtectedDailyStreakState
  >;

function mockStats(shieldCount: 0 | 1 | 2) {
  mockedUseNavbarStats.mockReturnValue({
    stats: {
      masteredCount: 0,
      streakDays: 12,
      shieldCount,
      promotionsCount: 4,
    },
    activeStatKey: "streak",
    currentBurst: null,
    applyStatBurst: jest.fn(),
    acknowledgeCurrentBurst: jest.fn(),
    getStatsSnapshot: jest.fn(),
  });
}

describe("StatsScreen streak shields", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not render shield icons when the user has no shields", () => {
    mockStats(0);

    const screen = render(<StatsScreen />);

    expect(screen.queryByTestId("streak-shield-0")).toBeNull();
  });

  it("renders one owned shield", () => {
    mockStats(1);

    const screen = render(<StatsScreen />);

    expect(screen.getByTestId("streak-shield-0")).toBeTruthy();
    expect(screen.queryByTestId("streak-shield-1")).toBeNull();
  });

  it("renders two owned shields", () => {
    mockStats(2);

    const screen = render(<StatsScreen />);

    expect(screen.getByTestId("streak-shield-0")).toBeTruthy();
    expect(screen.getByTestId("streak-shield-1")).toBeTruthy();
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
