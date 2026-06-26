import { render } from "@testing-library/react-native";
import React from "react";

import ActivityHeatmap, {
  type ActivityDay,
} from "@/src/components/stats/ActivityHeatmap";

jest.mock("@expo/vector-icons/Ionicons", () => {
  const { Text } = jest.requireActual<typeof import("react-native")>(
    "react-native"
  );

  function MockIonicons({ testID }: { testID?: string }) {
    return <Text testID={testID}>shield</Text>;
  }
  return MockIonicons;
});

jest.mock("@/src/contexts/SettingsContext", () => ({
  useSettings: () => ({
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
  }),
}));

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
