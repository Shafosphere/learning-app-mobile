/* eslint-disable @typescript-eslint/no-require-imports */
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { Image, Text } from "react-native";

import PinnedCoursesProgress from "@/src/components/stats/PinnedCoursesProgress";
import { resolveCourseIconProps } from "@/src/constants/customCourse";
import { themeMap } from "@/src/theme/theme";
import { useSettings } from "@/src/contexts/SettingsContext";
import {
  getCustomCourseMasteryProgress,
  getCustomCoursesWithCardCounts,
} from "@/src/db/sqlite/db";

jest.mock("@/src/contexts/SettingsContext", () => {
  const useSettings = jest.fn();
  return { useSettings, useThemeSettings: useSettings };
});

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

jest.mock("@/src/constants/customCourse", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    resolveCourseIconProps: jest.fn((iconId, iconColor) => ({
      mainImageSource: iconId?.startsWith("flag:") ? { uri: "course-flag" } : undefined,
      icon: {
        Component: ({ name }: { name: string }) => <Text>{name}</Text>,
        name: iconId ?? "grid-outline",
        color: iconColor,
      },
    })),
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
        "components.stats.progressBar.textChildTemplate.value": `${options?.value ?? 0}%`,
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

const colors = themeMap.light;

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
      fontScaleMultiplier: 1,
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
      expect(screen.getByText("50/50")).toBeTruthy();
      expect(screen.getByText("100%")).toBeTruthy();
      expect(screen.getByRole("progressbar", { name: "Flagi Azji" })).toHaveAccessibilityValue({ now: 100 });
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

    for (let index = 6; index >= 3; index -= 1) {
      const row = screen.getByTestId(`pinned-course-row-${index}`);
      fireEvent(row, "layout", {
        nativeEvent: { layout: { height: index === 6 ? 100 : 83 } },
      });
    }

    await waitFor(() => {
      expect(
        screen.getByTestId("pinned-courses-progress-list").props.style
      ).toEqual(expect.objectContaining({ maxHeight: 349 }));
    });
  });

  it("keeps zero progress empty, preserves saved icons, and calculates partial progress", async () => {
    mockedGetCustomCoursesWithCardCounts.mockResolvedValue([
      { id: 1, name: "Not started", cardsCount: 332, reviewsEnabled: true, iconId: "book", iconColor: "#6A0DAD" },
      { id: 2, name: "Flagi Ameryk", cardsCount: 49, reviewsEnabled: true, iconId: "flag:us", iconColor: "#00214d" },
      { id: 3, name: "Empty course", cardsCount: 0, reviewsEnabled: true },
    ]);
    mockCourseProgress({ 1: 0, 2: 39, 3: 0 });

    const screen = render(<PinnedCoursesProgress />);
    await waitFor(() => expect(screen.getByText("39/49")).toBeTruthy());

    expect(screen.getByText("80%")).toBeTruthy();
    expect(screen.getByText("0/332")).toBeTruthy();
    expect(screen.getByText("0/0")).toBeTruthy();
    expect(screen.queryByTestId("pinned-course-fill-1")).toBeNull();
    expect(screen.queryByTestId("pinned-course-fill-3")).toBeNull();
    expect(screen.getByTestId("pinned-course-fill-2")).toHaveStyle({ width: `${(39 / 49) * 100}%` });
    expect(resolveCourseIconProps).toHaveBeenCalledWith("book", "#6A0DAD");
    expect(resolveCourseIconProps).toHaveBeenCalledWith("flag:us", "#00214d");
    expect(screen.UNSAFE_getByType(Image).props.source).toEqual({ uri: "course-flag" });
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.getByTestId("pinned-courses-progress-list").props.showsVerticalScrollIndicator).toBe(false);
  });

  it("retains active and pinned official courses plus review-enabled custom courses", async () => {
    mockedUseSettings.mockReturnValue({
      ...mockedUseSettings(),
      pinnedOfficialCourseIds: [43],
    });
    mockedGetCustomCoursesWithCardCounts.mockResolvedValue([
      { id: 42, name: "Active official", cardsCount: 10, reviewsEnabled: true, isOfficial: true },
      { id: 43, name: "Pinned official", cardsCount: 10, reviewsEnabled: true, isOfficial: true },
      { id: 44, name: "Unpinned official", cardsCount: 10, reviewsEnabled: true, isOfficial: true },
      { id: 45, name: "Custom", cardsCount: 10, reviewsEnabled: true, isOfficial: false },
      { id: 46, name: "Reviews disabled", cardsCount: 10, reviewsEnabled: false, isOfficial: false },
    ]);
    mockCourseProgress({});

    const screen = render(<PinnedCoursesProgress />);
    await waitFor(() => expect(screen.getByText("Active official")).toBeTruthy());
    expect(screen.getByText("Pinned official")).toBeTruthy();
    expect(screen.getByText("Custom")).toBeTruthy();
    expect(screen.queryByText("Unpinned official")).toBeNull();
    expect(screen.queryByText("Reviews disabled")).toBeNull();
    expect(mockedGetCustomCourseMasteryProgress.mock.calls.map(([id]) => id)).toEqual([42, 43, 45]);
  });

  it("retains the empty state", async () => {
    mockedGetCustomCoursesWithCardCounts.mockResolvedValue([]);
    const screen = render(<PinnedCoursesProgress />);
    await waitFor(() => expect(screen.getByText("Brak danych do wyświetlenia.")).toBeTruthy());
    expect(screen.queryByTestId("pinned-courses-progress-list")).toBeNull();
  });
});
