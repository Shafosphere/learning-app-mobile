import React from "react";
import { render } from "@testing-library/react-native";

import LearningTimeCard from "@/src/components/stats/HourlyActivityChart";

jest.mock("@expo/vector-icons/Ionicons", () => "Ionicons");

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("@/src/contexts/SettingsContext", () => ({
  useSettings: () => ({
    colors: {
      secondBackground: "#fff",
      headline: "#111",
      paragraph: "#222",
      my_green: "#00ebc7",
    },
    accessibilityPreferences: {},
    fontScaleMultiplier: 1,
  }),
}));

describe("LearningTimeCard", () => {
  it("shows whole hours and remaining minutes without decimal values", () => {
    const screen = render(
      <LearningTimeCard
        timeMs={{
          week: 0,
          month: 45 * 60_000,
          year: 90 * 60_000,
        }}
      />
    );

    expect(screen.getByText("0")).toBeTruthy();
    expect(screen.getByText("45")).toBeTruthy();
    expect(screen.getAllByText("min")).toHaveLength(2);
    expect(screen.getByText("1 h")).toBeTruthy();
    expect(screen.getByText("30 min")).toBeTruthy();
    expect(JSON.stringify(screen.toJSON())).not.toContain("1.5");
  });

  it("shows exact and large hour totals without a minutes remainder", () => {
    const screen = render(
      <LearningTimeCard
        timeMs={{
          week: 60 * 60_000,
          month: 10 * 60 * 60_000,
          year: 125 * 60 * 60_000,
        }}
      />
    );

    expect(screen.getByText("1 h")).toBeTruthy();
    expect(screen.getByText("10 h")).toBeTruthy();
    expect(screen.getByText("125 h")).toBeTruthy();
    expect(screen.queryByText("min")).toBeNull();
  });
});
