import React from "react";
import { act, render } from "@testing-library/react-native";
import { createInstance } from "i18next";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import LearningTimeCard from "@/src/components/stats/HourlyActivityChart";
import { useSettings } from "@/src/contexts/SettingsContext";
import { resolveThemeColors } from "@/src/theme/theme";
import en from "@/src/locales/en.json";
import pl from "@/src/locales/pl.json";

jest.mock("@expo/vector-icons/Ionicons", () => "Ionicons");

jest.mock("react-i18next", () => ({
  useTranslation: jest.fn(),
}));

jest.mock("@/src/contexts/SettingsContext", () => {
  const useSettings = jest.fn(() => ({
    colors: {
      secondBackground: "#fff",
      headline: "#111",
      paragraph: "#222",
      my_green: "#00ebc7",
    },
    accessibilityPreferences: {},
    fontScaleMultiplier: 1,
  }));
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
  it("keeps period bars proportional to the real yearly total", () => {
    const screen = render(<LearningTimeCard timeMs={{ week: 0, month: 45 * 60_000, year: 90 * 60_000 }} />);
    expect(screen.getAllByRole("progressbar").map((bar) => bar.props.accessibilityValue.now)).toEqual([0, 50, 100]);
    screen.rerender(<LearningTimeCard timeMs={{ week: 0, month: 0, year: 0 }} />);
    expect(screen.getAllByRole("progressbar").map((bar) => bar.props.accessibilityValue.now)).toEqual([0, 0, 0]);
  });

  it("skips unrelated parent updates with the same learning totals", () => {
    const timeMs = { week: 0, month: 45 * 60_000, year: 90 * 60_000 };
    const Parent = ({ update }: { update: number }) => (
      <View>
        <Text>{update}</Text>
        <LearningTimeCard timeMs={timeMs} />
      </View>
    );
    const screen = render(<Parent update={1} />);
    const calls = jest.mocked(useTranslation).mock.calls.length;
    screen.rerender(<Parent update={2} />);
    expect(screen.getByText("2")).toBeTruthy();
    expect(jest.mocked(useTranslation).mock.calls).toHaveLength(calls);
    expect(screen.getByText("1 h 30 min")).toBeTruthy();
  });

  it("receives language, theme, contrast, and font updates with unchanged props", async () => {
    const { I18nextProvider, useTranslation: useRealTranslation } =
      jest.requireActual<typeof import("react-i18next")>("react-i18next");
    const settings = jest.mocked(useSettings)();
    const SettingsContext = React.createContext(settings);
    jest.mocked(useSettings).mockImplementation(function useMockSettings() {
      return React.useContext(SettingsContext);
    });
    jest.mocked(useTranslation).mockImplementation(useRealTranslation);
    const timeMs = { week: 0, month: 0, year: 0 };
    const tree = (value: typeof settings) => (
      <I18nextProvider i18n={i18n}>
        <SettingsContext.Provider value={value}>
          <LearningTimeCard timeMs={timeMs} />
        </SettingsContext.Provider>
      </I18nextProvider>
    );

    try {
      const screen = render(tree(settings));
      expect(screen.getByText("Since Monday")).toBeTruthy();
      await act(async () => { await i18n.changeLanguage("pl"); });
      expect(screen.getByText("Od poniedziałku")).toBeTruthy();
      const colors = resolveThemeColors("dark", { highContrast: true });
      screen.rerender(tree({
        ...settings,
        colors,
        fontScaleMultiplier: 1.5,
        accessibilityPreferences: { ...settings.accessibilityPreferences, highContrastEnabled: true },
      }));
      expect(screen.getByText(i18n.t("components.stats.hourlyActivityChart.period.thisWeek")))
        .toHaveStyle({ color: colors.headline, fontSize: 24 });
      expect(screen.getAllByRole("progressbar")[0]).toHaveStyle({ backgroundColor: colors.background });
    } finally {
      jest.mocked(useSettings).mockReturnValue(settings);
    }
  });
});
