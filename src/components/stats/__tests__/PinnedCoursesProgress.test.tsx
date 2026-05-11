/* eslint-disable @typescript-eslint/no-require-imports */
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { Text } from "react-native";

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

const mockCourseProgress = (progressByCourseId: Record<number, number>) => {
  mockedGetCustomCourseMasteryProgress.mockImplementation(
    async (courseId: number) => ({
      cardsCount: 100,
      completedCardsCount: progressByCourseId[courseId] ?? 0,
    })
  );
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
      expect(screen.getByText("Postęp przypiętych kursów")).toBeTruthy();
      expect(screen.getByText("Flagi Azji")).toBeTruthy();
      expect(screen.getByText("50/50 100%")).toBeTruthy();
    });
  });

  it("sorts courses by progress descending", async () => {
    mockedGetCustomCoursesWithCardCounts.mockResolvedValue([
      {
        id: 1,
        name: "Kurs 25",
        cardsCount: 100,
        reviewsEnabled: true,
        isOfficial: false,
      },
      {
        id: 2,
        name: "Kurs 100",
        cardsCount: 100,
        reviewsEnabled: true,
        isOfficial: false,
      },
      {
        id: 3,
        name: "Kurs 60",
        cardsCount: 100,
        reviewsEnabled: true,
        isOfficial: false,
      },
    ]);
    mockCourseProgress({ 1: 25, 2: 100, 3: 60 });

    const screen = render(<PinnedCoursesProgress />);

    await waitFor(() => {
      expect(screen.getByText("Kurs 100")).toBeTruthy();
      expect(screen.getByText("Kurs 60")).toBeTruthy();
      expect(screen.getByText("Kurs 25")).toBeTruthy();
    });

    const labels = screen
      .UNSAFE_getAllByType(Text)
      .map((node) => node.props.children);

    expect(labels.indexOf("Kurs 100")).toBeLessThan(
      labels.indexOf("Kurs 60")
    );
    expect(labels.indexOf("Kurs 60")).toBeLessThan(labels.indexOf("Kurs 25"));
  });

  it("limits visible list height from the measured progress rows", async () => {
    mockedGetCustomCoursesWithCardCounts.mockResolvedValue(
      Array.from({ length: 6 }, (_, index) => ({
        id: index + 1,
        name: `Kurs ${index + 1}`,
        cardsCount: 100,
        reviewsEnabled: true,
        isOfficial: false,
      }))
    );
    mockCourseProgress({ 1: 10, 2: 20, 3: 30, 4: 40, 5: 50, 6: 60 });

    const screen = render(<PinnedCoursesProgress />);

    await waitFor(() => {
      expect(screen.getByText("Kurs 1")).toBeTruthy();
      expect(screen.getByText("Kurs 6")).toBeTruthy();
    });

    const list = screen.getByTestId("pinned-courses-progress-list");
    expect(list.props.showsVerticalScrollIndicator).toBe(true);

    for (let index = 6; index >= 2; index -= 1) {
      const row = screen.getByText(`Kurs ${index}`).parent;
      expect(row).toBeTruthy();
      fireEvent(row!, "layout", {
        nativeEvent: { layout: { height: 76 } },
      });
    }

    await waitFor(() => {
      expect(
        screen.getByTestId("pinned-courses-progress-list").props.style
      ).toEqual(expect.objectContaining({ maxHeight: 428 }));
    });
  });
});
