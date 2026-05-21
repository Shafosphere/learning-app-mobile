import React from "react";
import { render } from "@testing-library/react-native";

import StatsScreen from "@/src/screens/stats/StatsScreen/StatsScreen";
import { useNavbarStats } from "@/src/contexts/NavbarStatsContext";

jest.mock("@expo/vector-icons/Ionicons", () => {
  const { Text } = require("react-native");
  function MockIonicons({ testID }: { testID?: string }) {
    return <Text testID={testID}>icon</Text>;
  }
  return MockIonicons;
});

jest.mock("@expo/vector-icons/MaterialIcons", () => {
  const { Text } = require("react-native");
  function MockMaterialIcons({ testID }: { testID?: string }) {
    return <Text testID={testID}>icon</Text>;
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
  const { Text } = require("react-native");
  function MockBigKnownWordsCard() {
    return <Text>known</Text>;
  }
  return MockBigKnownWordsCard;
});
jest.mock("@/src/components/stats/ActivityHeatmap", () => {
  const { Text } = require("react-native");
  function MockActivityHeatmap() {
    return <Text>heatmap</Text>;
  }
  return MockActivityHeatmap;
});
jest.mock("@/src/components/stats/HardWordsList", () => {
  const { Text } = require("react-native");
  function MockHardWordsList() {
    return <Text>hard</Text>;
  }
  return MockHardWordsList;
});
jest.mock("@/src/components/stats/HourlyActivityChart", () => {
  const { Text } = require("react-native");
  function MockHourlyActivityChart() {
    return <Text>time</Text>;
  }
  return MockHourlyActivityChart;
});
jest.mock("@/src/components/stats/PinnedCoursesProgress", () => {
  const { Text } = require("react-native");
  function MockPinnedCoursesProgress() {
    return <Text>courses</Text>;
  }
  return MockPinnedCoursesProgress;
});

jest.mock("@/src/db/sqlite/db", () => ({
  getDailyActivitySummariesCustom: jest.fn(() => new Promise(() => {})),
  getTotalLearningTimeMs: jest.fn(() => new Promise(() => {})),
}));

const mockedUseNavbarStats = useNavbarStats as jest.MockedFunction<
  typeof useNavbarStats
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
});
