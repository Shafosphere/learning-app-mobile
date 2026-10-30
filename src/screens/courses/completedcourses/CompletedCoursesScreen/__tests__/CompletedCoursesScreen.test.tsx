/* eslint-disable @typescript-eslint/no-require-imports */
import React from "react";
import { StyleSheet } from "react-native";
import { fireEvent, render, waitFor, within } from "@testing-library/react-native";

import CompletedCoursesScreen from "@/src/screens/courses/completedcourses/CompletedCoursesScreen/CompletedCoursesScreen";
import { useSettings } from "@/src/contexts/SettingsContext";
import { getCompletedCustomCoursesWithCardCounts } from "@/src/db/sqlite/db";

let mockDeviceLayout = { isTabletLayout: false, orientation: "portrait" };
jest.mock("@/src/hooks/useDeviceLayout", () => ({
  useDeviceLayout: () => mockDeviceLayout,
}));

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

jest.mock("@edwardloopez/react-native-coachmark", () => ({
  CoachmarkAnchor: ({ children }: { children?: React.ReactNode }) => children,
}));

jest.mock("@/src/db/sqlite/db", () => ({
  getCompletedCustomCoursesWithCardCounts: jest.fn(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "screens.courses.completedCourses.title": "Completed courses",
        "screens.courses.completedCourses.empty": "Courses you complete will appear here.",
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

const mockedUseSettings = useSettings as jest.Mock;
const mockedGetCompletedCustomCoursesWithCardCounts =
  getCompletedCustomCoursesWithCardCounts as jest.Mock;

describe("CompletedCoursesScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeviceLayout = { isTabletLayout: false, orientation: "portrait" };
    mockedUseSettings.mockReturnValue({
      activeCustomCourseId: null,
      activeCustomCourseIdHydrated: true,
      customCourseEntrySettingsSeenHydrated: true,
      hasSeenCustomCourseEntrySettings: jest.fn(() => true),
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
      activeCustomCourseIdHydrated: true,
      customCourseEntrySettingsSeenHydrated: true,
      hasSeenCustomCourseEntrySettings: jest.fn(() => true),
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
      expect(screen.getByTestId("completed-courses-trophy")).toBeTruthy();
      expect(screen.getByText("Completed courses")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Mastered course"));

    await waitFor(() => {
      expect(setActiveCustomCourseId).toHaveBeenCalledWith(44);
      expect(mockPush).toHaveBeenCalledWith("/flashcards");
    });
  });

  it.each([null, 42])("opens completed official courses even when already active (active=%s)", async (activeCustomCourseId) => {
    const setActiveCustomCourseId = jest.fn(() => Promise.resolve());
    const pinOfficialCourse = jest.fn(() => Promise.resolve());
    mockedUseSettings.mockReturnValue({
      activeCustomCourseId,
      activeCustomCourseIdHydrated: true,
      customCourseEntrySettingsSeenHydrated: true,
      hasSeenCustomCourseEntrySettings: jest.fn(() => true),
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

  it("opens required settings for an unconfigured completed course", async () => {
    mockedUseSettings.mockReturnValue({
      activeCustomCourseId: null,
      activeCustomCourseIdHydrated: true,
      customCourseEntrySettingsSeenHydrated: true,
      hasSeenCustomCourseEntrySettings: jest.fn(() => false),
      pinOfficialCourse: jest.fn(() => Promise.resolve()),
      pinnedOfficialCourseIds: [],
      setActiveCustomCourseId: jest.fn(() => Promise.resolve()),
      colors: { paragraph: "#222", headline: "#111" },
    });
    mockedGetCompletedCustomCoursesWithCardCounts.mockResolvedValue([
      {
        id: 44,
        name: "Unconfigured course",
        iconId: "book",
        iconColor: "#123",
        cardsCount: 4,
        completedCardsCount: 4,
        reviewsEnabled: true,
        isOfficial: false,
      },
    ]);

    const screen = render(<CompletedCoursesScreen />);
    fireEvent.press(await screen.findByText("Unconfigured course"));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/course-entry-settings");
    });
    expect(mockPush).not.toHaveBeenCalledWith("/flashcards");
  });

  it("does not enter a completed course before settings hydrate", async () => {
    const setActiveCustomCourseId = jest.fn(() => Promise.resolve());
    mockedUseSettings.mockReturnValue({
      activeCustomCourseId: null,
      activeCustomCourseIdHydrated: true,
      customCourseEntrySettingsSeenHydrated: false,
      hasSeenCustomCourseEntrySettings: jest.fn(() => false),
      pinOfficialCourse: jest.fn(() => Promise.resolve()),
      pinnedOfficialCourseIds: [],
      setActiveCustomCourseId,
      colors: { paragraph: "#222", headline: "#111" },
    });
    mockedGetCompletedCustomCoursesWithCardCounts.mockResolvedValue([
      {
        id: 44,
        name: "Unconfigured course",
        iconId: "book",
        iconColor: "#123",
        cardsCount: 4,
        completedCardsCount: 4,
        reviewsEnabled: true,
        isOfficial: false,
      },
    ]);

    const screen = render(<CompletedCoursesScreen />);
    fireEvent.press(await screen.findByText("Unconfigured course"));

    expect(setActiveCustomCourseId).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it.each([false, true])("places a long course list beside the fixed trophy (tablet: %s)", async (isTabletLayout) => {
    mockDeviceLayout = { isTabletLayout, orientation: "landscape" };
    mockedGetCompletedCustomCoursesWithCardCounts.mockResolvedValue(
      Array.from({ length: 20 }, (_, index) => ({
        id: index + 1,
        name: `Completed course ${index + 1}`,
        cardsCount: 4,
        isOfficial: false,
      })),
    );
    const screen = render(<CompletedCoursesScreen />);
    await screen.findByText("Completed course 20");
    const list = within(screen.getByTestId("completed-courses-scroll"));
    expect(list.getAllByText(/^Completed course \d+$/)).toHaveLength(20);
    expect(list.queryByTestId("completed-courses-trophy")).toBeNull();
    expect(list.queryByText("Completed courses")).toBeNull();
    expect(screen.getByTestId("completed-courses-trophy")).toBeTruthy();
    expect(screen.queryByText("Back")).toBeNull();
    fireEvent.press(list.getByText("Completed course 20"));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/flashcards"));
    expect(mockedUseSettings.mock.results[0].value.setActiveCustomCourseId).toHaveBeenCalledWith(20);
  });

  it.each([false, true])("keeps the trophy fixed and restores portrait flow on rotation (tablet: %s)", async (isTabletLayout) => {
    mockDeviceLayout = { isTabletLayout, orientation: "landscape" };
    const screen = render(<CompletedCoursesScreen />);
    await screen.findByText("Courses you complete will appear here.");
    const size = isTabletLayout ? 200 : 120;
    expect(StyleSheet.flatten(screen.getByTestId("completed-courses-trophy").props.style)).toMatchObject({ width: size, height: size });
    expect(within(screen.getByTestId("completed-courses-scroll")).queryByTestId("completed-courses-trophy")).toBeNull();
    expect(screen.queryByText("Back")).toBeNull();

    mockDeviceLayout = { isTabletLayout, orientation: "portrait" };
    screen.rerender(<CompletedCoursesScreen />);
    expect(screen.getByText("Courses you complete will appear here.")).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId("completed-courses-trophy").props.style)).toMatchObject({ width: 160, height: 160 });
    expect(within(screen.getByTestId("completed-courses-scroll")).getByTestId("completed-courses-trophy")).toBeTruthy();
    expect(screen.queryByText("Back")).toBeNull();
    expect(mockedGetCompletedCustomCoursesWithCardCounts).toHaveBeenCalledTimes(1);
  });

  it("shows an empty state when there are no completed courses", async () => {
    const screen = render(<CompletedCoursesScreen />);

    await waitFor(() => {
      expect(screen.queryByTestId("completed-courses-loading")).toBeNull();
      expect(screen.getByTestId("completed-courses-trophy")).toBeTruthy();
      expect(screen.getByText("Completed courses")).toBeTruthy();
      expect(screen.getByText("Courses you complete will appear here.")).toBeTruthy();
    });
  });
});
