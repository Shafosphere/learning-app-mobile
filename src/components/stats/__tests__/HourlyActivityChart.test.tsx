import React from "react";
import { render } from "@testing-library/react-native";
import { createInstance } from "i18next";
import { useTranslation } from "react-i18next";

import LearningTimeCard from "@/src/components/stats/HourlyActivityChart";
import en from "@/src/locales/en.json";
import pl from "@/src/locales/pl.json";

jest.mock("@expo/vector-icons/Ionicons", () => "Ionicons");

jest.mock("react-i18next", () => ({
  useTranslation: jest.fn(),
}));

jest.mock("@/src/contexts/SettingsContext", () => {
  const useSettings = () => ({
    colors: {
      secondBackground: "#fff",
      headline: "#111",
      paragraph: "#222",
      my_green: "#00ebc7",
    },
    accessibilityPreferences: {},
    fontScaleMultiplier: 1,
  });
  return { useSettings, useThemeSettings: useSettings };
});

describe("LearningTimeCard", () => {
  const i18n = createInstance();

  beforeEach(async () => {
    await i18n.init({
      lng: "en",
      fallbackLng: "en",
      resources: { en: { translation: en }, pl: { translation: pl } },
    });
    (useTranslation as jest.Mock).mockReturnValue({ t: i18n.t.bind(i18n) });
  });

  it.each([
    ["en", ["Since Monday", "Since the start of the month", "Since the start of the year"]],
    ["pl", ["Od poniedziałku", "Od początku miesiąca", "Od początku roku"]],
  ] as const)("describes calendar periods in %s", async (language, descriptions) => {
    await i18n.changeLanguage(language);
    const screen = render(
      <LearningTimeCard timeMs={{ week: 0, month: 0, year: 0 }} />
    );

    for (const description of descriptions) {
      expect(screen.getByText(description)).toBeTruthy();
    }
  });

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

    expect(screen.getByText("0 min")).toBeTruthy();
    expect(screen.getByText("45 min")).toBeTruthy();
    expect(screen.getByText("1 h 30 min")).toBeTruthy();
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
