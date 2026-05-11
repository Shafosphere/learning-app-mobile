/* eslint-disable @typescript-eslint/no-require-imports */
import { render, waitFor } from "@testing-library/react-native";
import React from "react";

import PinnedCoursesProgress from "@/src/components/stats/PinnedCoursesProgress";
import { useSettings } from "@/src/contexts/SettingsContext";
import {
  getCustomCourseMasteryProgress,
  getCustomCoursesWithCardCounts,
} from "@/src/db/sqlite/db";

jest.mock("@/src/contexts/SettingsContext", () => ({
  useSettings: jest.fn(),
}));

jest.mock("@/src/db/sqlite/db", () => ({
  getCustomCourseMasteryProgress: jest.fn(),
  getCustomCoursesWithCardCounts: jest.fn(),
}));

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (effect: () => void | (() => void)) => {
    const React = require("react");
    React.useEffect(effect, [effect]);
  },
}));

jest.mock("@/src/components/stats/ProgressBar", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function ProgressBarMock({
    label,
    value,
  }: {
    label?: string;
    value: number;
  }) {
    return <Text>{`${label ?? ""} ${Math.round(value * 100)}%`}</Text>;
  };
});

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        "components.stats.pinnedCoursesProgress.title.postepPrzypietychKursow":
          "Postęp przypiętych kursów",
        "components.stats.pinnedCoursesProgress.textChild.brakDanychDoWyswietlenia":
          "Brak danych do wyświetlenia.",
        "components.stats.pinnedCoursesProgress.label.valueValue":
          `${options?.learned ?? 0}/${options?.total ?? 0}`,
      };
      return translations[key] ?? key;
    },
  }),
}));

const mockedUseSettings = useSettings as jest.Mock;
const mockedGetCustomCoursesWithCardCounts =
  getCustomCoursesWithCardCounts as jest.Mock;
const mockedGetCustomCourseMasteryProgress =
  getCustomCourseMasteryProgress as jest.Mock;

const colors = {
  secondBackground: "#fff",
  headline: "#111",
  paragraph: "#222",
  border: "#ddd",
};

describe("PinnedCoursesProgress", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseSettings.mockReturnValue({
      activeCustomCourseId: 42,
      pinnedOfficialCourseIds: [],
      colors,
    });
  });

  it("shows 100% progress for a completed active official course", async () => {
    mockedGetCustomCoursesWithCardCounts.mockResolvedValue([
      {
        id: 42,
        name: "Flagi Azji",
        cardsCount: 50,
        reviewsEnabled: true,
        isOfficial: true,
      },
    ]);
    mockedGetCustomCourseMasteryProgress.mockResolvedValue({
      cardsCount: 50,
      completedCardsCount: 50,
    });

    const screen = render(<PinnedCoursesProgress />);

    await waitFor(() => {
      expect(screen.getByText("Flagi Azji")).toBeTruthy();
      expect(screen.getByText("50/50 100%")).toBeTruthy();
    });
  });
});
