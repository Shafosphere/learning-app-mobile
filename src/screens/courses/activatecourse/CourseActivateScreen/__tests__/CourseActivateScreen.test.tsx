import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import CourseActivateScreen from "@/src/screens/courses/activatecourse/CourseActivateScreen/CourseActivateScreen";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useCoachmarkFlow } from "@/src/hooks/useCoachmarkFlow";
import {
  getCustomCoursesWithCardCounts,
  getOfficialCustomCoursesWithCardCounts,
} from "@/src/db/sqlite/db";

const EMPTY_TEXT = "nic tu nie ma :(, czas wybrać kurs!";

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: jest.fn(() => ({
    push: mockPush,
    replace: mockReplace,
  })),
}));

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (effect: () => void | (() => void)) => {
    const React = require("react");
    React.useEffect(effect, [effect]);
  },
}));

jest.mock("@/src/contexts/PopupContext", () => ({
  usePopup: jest.fn(() => jest.fn()),
}));

jest.mock("@/src/contexts/SettingsContext", () => ({
  useSettings: jest.fn(),
}));

jest.mock("@/src/db/sqlite/db", () => ({
  getCustomCoursesWithCardCounts: jest.fn(),
  getOfficialCustomCoursesWithCardCounts: jest.fn(),
}));

jest.mock("@/src/hooks/useCoachmarkFlow", () => ({
  useCoachmarkFlow: jest.fn(() => ({
    isActive: false,
    currentStep: null,
    currentIndex: 0,
    totalSteps: 2,
    canGoBack: false,
    canGoNext: true,
    hasSeen: true,
    goBack: jest.fn(),
    goNext: jest.fn(),
    advanceByEvent: jest.fn(() => Promise.resolve(true)),
  })),
}));

jest.mock("@/src/components/onboarding/CoachmarkLayerPortal", () => ({
  useCoachmarkLayerPortal: jest.fn(),
}));

jest.mock("@edwardloopez/react-native-coachmark", () => ({
  CoachmarkAnchor: ({ children }: { children?: React.ReactNode }) => children,
}));

jest.mock("@/src/services/onboardingCheckpoint", () => ({
  getOnboardingCheckpoint: jest.fn(() => Promise.resolve("done")),
  setOnboardingCheckpoint: jest.fn(() => Promise.resolve()),
}));

jest.mock("@/src/screens/courses/activatecourse/CourseActivateScreen/CourseActivateScreen-styles", () => ({
  useStyles: jest.fn(() => new Proxy({}, { get: () => ({}) })),
}));

jest.mock("@/src/components/button/button", () => {
  const React = require("react");
  const { Text } = require("react-native");
  function MockButton({ text }: { text: string }) {
    return <Text>{text}</Text>;
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

const mockedUseSettings = useSettings as jest.Mock;
const mockedUseCoachmarkFlow = useCoachmarkFlow as jest.Mock;
const { getOnboardingCheckpoint } = require("@/src/services/onboardingCheckpoint");
const mockedGetCustomCoursesWithCardCounts =
  getCustomCoursesWithCardCounts as jest.Mock;
const mockedGetOfficialCustomCoursesWithCardCounts =
  getOfficialCustomCoursesWithCardCounts as jest.Mock;

describe("CourseActivateScreen loading state", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getOnboardingCheckpoint.mockResolvedValue("done");
    mockedUseCoachmarkFlow.mockReturnValue({
      isActive: false,
      currentStep: null,
      currentIndex: 0,
      totalSteps: 2,
      canGoBack: false,
      canGoNext: true,
      hasSeen: true,
      goBack: jest.fn(),
      goNext: jest.fn(),
      advanceByEvent: jest.fn(() => Promise.resolve(true)),
    });
    mockedUseSettings.mockReturnValue({
      activeCustomCourseId: null,
      setActiveCustomCourseId: jest.fn(() => Promise.resolve()),
      colors: {
        paragraph: "#222",
        headline: "#111",
      },
      pinnedOfficialCourseIds: [],
    });
    mockedGetCustomCoursesWithCardCounts.mockResolvedValue([]);
    mockedGetOfficialCustomCoursesWithCardCounts.mockResolvedValue([]);
  });

  it("shows loading instead of empty state while course data is pending", () => {
    mockedGetCustomCoursesWithCardCounts.mockReturnValue(new Promise(() => {}));
    mockedGetOfficialCustomCoursesWithCardCounts.mockReturnValue(
      new Promise(() => {})
    );

    const screen = render(<CourseActivateScreen />);

    expect(screen.getByTestId("course-activate-loading")).toBeTruthy();
    expect(screen.queryByText(EMPTY_TEXT)).toBeNull();
  });

  it("hides loading and shows courses when data resolves with courses", async () => {
    mockedGetCustomCoursesWithCardCounts.mockResolvedValue([
      {
        id: 11,
        name: "Custom course",
        iconId: "book-outline",
        iconColor: "#000",
        cardsCount: 12,
        reviewsEnabled: true,
        isOfficial: false,
      },
    ]);

    const screen = render(<CourseActivateScreen />);

    await waitFor(() => {
      expect(screen.queryByTestId("course-activate-loading")).toBeNull();
      expect(screen.getByText("Custom course")).toBeTruthy();
    });
    expect(screen.queryByText(EMPTY_TEXT)).toBeNull();
  });

  it("shows empty state only after data resolves empty", async () => {
    const screen = render(<CourseActivateScreen />);

    await waitFor(() => {
      expect(screen.queryByTestId("course-activate-loading")).toBeNull();
      expect(screen.getByText(EMPTY_TEXT)).toBeTruthy();
    });
  });

  it("keeps custom courses visible when official courses fail to load", async () => {
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mockedGetCustomCoursesWithCardCounts.mockResolvedValue([
      {
        id: 11,
        name: "Custom course",
        iconId: "book-outline",
        iconColor: "#000",
        cardsCount: 12,
        reviewsEnabled: true,
        isOfficial: false,
      },
    ]);
    mockedGetOfficialCustomCoursesWithCardCounts.mockRejectedValue(
      new Error("official load failed")
    );

    const screen = render(<CourseActivateScreen />);

    await waitFor(() => {
      expect(screen.queryByTestId("course-activate-loading")).toBeNull();
      expect(screen.getByText("Custom course")).toBeTruthy();
    });
    expect(screen.queryByText(EMPTY_TEXT)).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to load official courses",
      expect.any(Error)
    );
    consoleErrorSpy.mockRestore();
  });

  it("blocks course activation during onboarding before the activation step is visible", async () => {
    const setActiveCustomCourseId = jest.fn(() => Promise.resolve());
    const advanceByEvent = jest.fn(() => Promise.resolve(true));
    getOnboardingCheckpoint.mockResolvedValue("activate_required");
    mockedUseSettings.mockReturnValue({
      activeCustomCourseId: null,
      setActiveCustomCourseId,
      colors: {
        paragraph: "#222",
        headline: "#111",
      },
      pinnedOfficialCourseIds: [],
    });
    mockedUseCoachmarkFlow.mockReturnValue({
      isActive: false,
      currentStep: null,
      currentIndex: 0,
      totalSteps: 5,
      canGoBack: false,
      canGoNext: false,
      hasSeen: false,
      goBack: jest.fn(),
      goNext: jest.fn(),
      advanceByEvent,
    });
    mockedGetCustomCoursesWithCardCounts.mockResolvedValue([
      {
        id: 11,
        name: "Custom course",
        iconId: "book-outline",
        iconColor: "#000",
        cardsCount: 12,
        reviewsEnabled: true,
        isOfficial: false,
      },
    ]);

    const screen = render(<CourseActivateScreen />);

    await waitFor(() => {
      expect(screen.getByText("Custom course")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Custom course"));

    expect(setActiveCustomCourseId).not.toHaveBeenCalled();
    expect(advanceByEvent).not.toHaveBeenCalled();
  });

  it("allows course activation on the onboarding activation step", async () => {
    const setActiveCustomCourseId = jest.fn(() => Promise.resolve());
    const advanceByEvent = jest.fn(() => Promise.resolve(true));
    getOnboardingCheckpoint.mockResolvedValue("activate_required");
    mockedUseSettings.mockReturnValue({
      activeCustomCourseId: null,
      setActiveCustomCourseId,
      colors: {
        paragraph: "#222",
        headline: "#111",
      },
      pinnedOfficialCourseIds: [],
    });
    mockedUseCoachmarkFlow.mockReturnValue({
      isActive: true,
      currentStep: {
        id: "course-activate-step-4",
        targetId: "course-activate-bubble-anchor",
        titleKey: "onboarding.courseActivate.step4.title",
        descriptionKey: "onboarding.courseActivate.step4.description",
        kind: "action",
        advanceOn: "activate_course",
      },
      currentIndex: 3,
      totalSteps: 5,
      canGoBack: true,
      canGoNext: false,
      hasSeen: false,
      goBack: jest.fn(),
      goNext: jest.fn(),
      advanceByEvent,
    });
    mockedGetCustomCoursesWithCardCounts.mockResolvedValue([
      {
        id: 11,
        name: "Custom course",
        iconId: "book-outline",
        iconColor: "#000",
        cardsCount: 12,
        reviewsEnabled: true,
        isOfficial: false,
      },
    ]);

    const screen = render(<CourseActivateScreen />);

    await waitFor(() => {
      expect(screen.getByText("Custom course")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Custom course"));

    await waitFor(() => {
      expect(setActiveCustomCourseId).toHaveBeenCalledWith(11);
    });
    expect(advanceByEvent).toHaveBeenCalledWith("activate_course");
  });
});
