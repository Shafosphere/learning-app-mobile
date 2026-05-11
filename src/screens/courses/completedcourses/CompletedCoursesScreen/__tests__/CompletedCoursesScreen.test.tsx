/* eslint-disable @typescript-eslint/no-require-imports */
import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import CompletedCoursesScreen from "@/src/screens/courses/completedcourses/CompletedCoursesScreen/CompletedCoursesScreen";
import { useSettings } from "@/src/contexts/SettingsContext";
import { getCompletedCustomCoursesWithCardCounts } from "@/src/db/sqlite/db";

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: jest.fn(() => ({
    push: mockPush,
    back: mockBack,
  })),
}));

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (effect: () => void | (() => void)) => {
    const React = require("react");
    React.useEffect(effect, [effect]);
  },
}));

jest.mock("@/src/contexts/SettingsContext", () => ({
  useSettings: jest.fn(),
}));

jest.mock("@/src/db/sqlite/db", () => ({
  getCompletedCustomCoursesWithCardCounts: jest.fn(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "screens.courses.completedCourses.title": "Completed courses",
        "screens.courses.completedCourses.empty": "No completed courses yet.",
        "screens.courses.completedCourses.editA11y": "Edit completed course",
        "screens.courses.activatecourse.courseActivate.courseActivate.textChild.stworzonePrzezCiebie":
          "Created by you",
        "repeats.format.flashcardsValue": "flashcards: 4",
        "app.actions.back": "Back",
      };
      return translations[key] ?? key;
    },
  }),
}));

jest.mock("@/src/screens/courses/activatecourse/CourseActivateScreen/CourseActivateScreen-styles", () => ({
  useStyles: jest.fn(() => new Proxy({}, { get: () => ({}) })),
}));

jest.mock("@/src/components/button/button", () => {
  const React = require("react");
  const { Text } = require("react-native");
  function MockButton({ text, onPress }: { text: string; onPress?: () => void }) {
    return <Text onPress={onPress}>{text}</Text>;
  }
  return MockButton;
});

jest.mock("@/src/components/course/CourseListCard", () => {
  const React = require("react");
  const { Text } = require("react-native");
  function MockCourseListCard({ title, onPress }: { title: string; onPress?: () => void }) {
    return <Text onPress={onPress}>{title}</Text>;
  }
  return {
    CourseListCard: MockCourseListCard,
  };
});

jest.mock("@/src/components/course/CourseGroupList", () => {
  const React = require("react");
  const { Text } = require("react-native");
  function MockCourseGroupList({
    groups,
    onPress,
  }: {
    groups: { official: { id: number; name: string }[] }[];
    onPress: (id: number) => void;
  }) {
    return (
      <>
        {groups.flatMap((group) =>
          group.official.map((course) => (
            <Text key={course.id} onPress={() => onPress(course.id)}>
              {course.name}
            </Text>
          ))
        )}
      </>
    );
  }
  return {
    CourseGroupList: MockCourseGroupList,
  };
});

const mockedUseSettings = useSettings as jest.Mock;
const mockedGetCompletedCustomCoursesWithCardCounts =
  getCompletedCustomCoursesWithCardCounts as jest.Mock;

describe("CompletedCoursesScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseSettings.mockReturnValue({
      activeCustomCourseId: null,
      pinOfficialCourse: jest.fn(() => Promise.resolve()),
      pinnedOfficialCourseIds: [],
      setActiveCustomCourseId: jest.fn(() => Promise.resolve()),
      colors: {
        paragraph: "#222",
        headline: "#111",
      },
    });
    mockedGetCompletedCustomCoursesWithCardCounts.mockResolvedValue([]);
  });

  it("renders completed custom courses and activates a selected course", async () => {
    const setActiveCustomCourseId = jest.fn(() => Promise.resolve());
    mockedUseSettings.mockReturnValue({
      activeCustomCourseId: null,
      pinOfficialCourse: jest.fn(() => Promise.resolve()),
      pinnedOfficialCourseIds: [],
      setActiveCustomCourseId,
      colors: {
        paragraph: "#222",
        headline: "#111",
      },
    });
    mockedGetCompletedCustomCoursesWithCardCounts.mockResolvedValue([
      {
        id: 44,
        name: "Mastered course",
        iconId: "book",
        iconColor: "#123",
        cardsCount: 4,
        completedCardsCount: 4,
        reviewsEnabled: true,
        isOfficial: false,
      },
    ]);

    const screen = render(<CompletedCoursesScreen />);

    await waitFor(() => {
      expect(screen.getByText("Mastered course")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Mastered course"));

    await waitFor(() => {
      expect(setActiveCustomCourseId).toHaveBeenCalledWith(44);
      expect(mockPush).toHaveBeenCalledWith("/flashcards");
    });
  });

  it("pins completed official courses when activating them from the archive", async () => {
    const setActiveCustomCourseId = jest.fn(() => Promise.resolve());
    const pinOfficialCourse = jest.fn(() => Promise.resolve());
    mockedUseSettings.mockReturnValue({
      activeCustomCourseId: null,
      pinOfficialCourse,
      pinnedOfficialCourseIds: [],
      setActiveCustomCourseId,
      colors: {
        paragraph: "#222",
        headline: "#111",
      },
    });
    mockedGetCompletedCustomCoursesWithCardCounts.mockResolvedValue([
      {
        id: 42,
        name: "Flagi Azji",
        iconId: "flag",
        iconColor: "#123",
        cardsCount: 50,
        completedCardsCount: 50,
        reviewsEnabled: true,
        isOfficial: true,
        slug: "flagi_azji",
      },
    ]);

    const screen = render(<CompletedCoursesScreen />);

    await waitFor(() => {
      expect(screen.getByText("Flagi Azji")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Flagi Azji"));

    await waitFor(() => {
      expect(pinOfficialCourse).toHaveBeenCalledWith(42);
      expect(setActiveCustomCourseId).toHaveBeenCalledWith(42);
      expect(mockPush).toHaveBeenCalledWith("/flashcards");
    });
  });

  it("shows an empty state when there are no completed courses", async () => {
    const screen = render(<CompletedCoursesScreen />);

    await waitFor(() => {
      expect(screen.queryByTestId("completed-courses-loading")).toBeNull();
      expect(screen.getByText("No completed courses yet.")).toBeTruthy();
    });
  });
});
