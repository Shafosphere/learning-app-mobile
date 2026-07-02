import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import CourseActivateScreen from "@/src/screens/courses/activatecourse/CourseActivateScreen/CourseActivateScreen";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useCoachmarkFlow } from "@/src/hooks/useCoachmarkFlow";
import {
  getCompletedCustomCoursesWithCardCounts,
  getCustomCoursesWithCardCounts,
  getOfficialCustomCoursesWithCardCounts,
} from "@/src/db/sqlite/db";
import { getOnboardingCheckpoint } from "@/src/services/onboardingCheckpoint";

const EMPTY_TEXT = "Nic tu nie ma :(, czas wybrać kurs!";

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
    const React = jest.requireActual<typeof import("react")>("react");
    React.useEffect(effect, [effect]);
  },
}));

jest.mock("@/src/contexts/PopupContext", () => ({
  usePopup: jest.fn(() => jest.fn()),
}));

jest.mock("@/src/contexts/SettingsContext", () => ({
  useSettings: jest.fn(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "screens.courses.activatecourse.courseActivate.courseActivate.textChild.nicTuNieMaCzas":
          "Nic tu nie ma :(, czas wybrać kurs!",
        "screens.courses.activatecourse.courseActivate.courseActivate.text.dodajKurs":
          "Dodaj kurs",
        "screens.courses.activatecourse.courseActivate.courseActivate.accessibilityLabel.dodajKurs":
          "Dodaj kurs",
        "screens.courses.activatecourse.courseActivate.courseActivate.text.ukonczone":
          "completed",
        "screens.courses.activatecourse.courseActivate.courseActivate.accessibilityLabel.ukonczone":
          "Show completed courses",
      };
      return translations[key] ?? key;
    },
  }),
}));

jest.mock("@/src/db/sqlite/db", () => ({
  getCustomCoursesWithCardCounts: jest.fn(),
  getOfficialCustomCoursesWithCardCounts: jest.fn(),
  getCompletedCustomCoursesWithCardCounts: jest.fn(),
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
  subscribeOnboardingCheckpoint: jest.fn(() => jest.fn()),
}));

jest.mock("@/src/screens/courses/activatecourse/CourseActivateScreen/CourseActivateScreen-styles", () => ({
  useStyles: jest.fn(() => new Proxy({}, { get: () => ({}) })),
}));

jest.mock("@/src/components/button/button", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { Pressable, Text } =
    jest.requireActual<typeof import("react-native")>("react-native");
  function MockButton({
    text,
    onPress,
    disabled = false,
    accessibilityLabel,
  }: {
    text: string;
    onPress?: () => void;
    disabled?: boolean;
    accessibilityLabel?: string;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? text}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
      >
        <Text>{text}</Text>
      </Pressable>
    );
  }
  return MockButton;
});

jest.mock("@/src/components/course/CourseListCard", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { Text } =
    jest.requireActual<typeof import("react-native")>("react-native");
  function MockCourseListCard({ title, onPress }: { title: string; onPress?: () => void }) {
    return <Text onPress={onPress}>{title}</Text>;
  }
  return {
    CourseListCard: MockCourseListCard,
  };
});

const mockedUseSettings = useSettings as jest.Mock;
const mockedUseCoachmarkFlow = useCoachmarkFlow as jest.Mock;
const mockedGetOnboardingCheckpoint = getOnboardingCheckpoint as jest.Mock;
const mockedGetCustomCoursesWithCardCounts =
  getCustomCoursesWithCardCounts as jest.Mock;
const mockedGetOfficialCustomCoursesWithCardCounts =
  getOfficialCustomCoursesWithCardCounts as jest.Mock;
const mockedGetCompletedCustomCoursesWithCardCounts =
  getCompletedCustomCoursesWithCardCounts as jest.Mock;

describe("CourseActivateScreen loading state", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetOnboardingCheckpoint.mockResolvedValue("done");
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
    mockedGetCompletedCustomCoursesWithCardCounts.mockResolvedValue([]);
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

  it("hides completed courses from the activation list", async () => {
    mockedGetCustomCoursesWithCardCounts.mockResolvedValue([
      {
        id: 11,
        name: "Visible course",
        iconId: "book-outline",
        iconColor: "#000",
        cardsCount: 12,
        reviewsEnabled: true,
        isOfficial: false,
      },
      {
        id: 12,
        name: "Completed course",
        iconId: "star",
        iconColor: "#111",
        cardsCount: 8,
        reviewsEnabled: true,
        isOfficial: false,
      },
    ]);
    mockedGetCompletedCustomCoursesWithCardCounts.mockResolvedValue([
      {
        id: 12,
        name: "Completed course",
        iconId: "star",
        iconColor: "#111",
        cardsCount: 8,
        completedCardsCount: 8,
        reviewsEnabled: true,
        isOfficial: false,
      },
    ]);

    const screen = render(<CourseActivateScreen />);

    await waitFor(() => {
      expect(screen.getByText("Visible course")).toBeTruthy();
      expect(screen.queryByText("Completed course")).toBeNull();
      expect(screen.getByText("completed")).toBeTruthy();
    });
  });

  it("opens completed courses from the footer button", async () => {
    mockedGetCompletedCustomCoursesWithCardCounts.mockResolvedValue([
      {
        id: 12,
        name: "Completed course",
        iconId: "star",
        iconColor: "#111",
        cardsCount: 8,
        completedCardsCount: 8,
        reviewsEnabled: true,
        isOfficial: false,
      },
    ]);

    const screen = render(<CourseActivateScreen />);

    await waitFor(() => {
      expect(screen.getByText("completed")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("completed"));

    expect(mockPush).toHaveBeenCalledWith("/completed-courses");
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

  it("shows enabled onboarding next after restart with an active custom course", async () => {
    getOnboardingCheckpoint.mockResolvedValue("activate_required");
    mockedUseSettings.mockReturnValue({
      activeCustomCourseId: 11,
      setActiveCustomCourseId: jest.fn(() => Promise.resolve()),
      colors: {
        paragraph: "#222",
        headline: "#111",
      },
      pinnedOfficialCourseIds: [],
    });

    const screen = render(<CourseActivateScreen />);

    const nextButton = await screen.findByLabelText(
      "screens.courses.activatecourse.courseActivate.courseActivate.accessibilityLabel.przejdzDalej"
    );

    expect(nextButton.props.accessibilityState).toEqual({ disabled: false });
    expect(screen.getByText("app.actions.next")).toBeTruthy();
  });

  it("shows normal footer and no onboarding next after skip", async () => {
    mockedGetOnboardingCheckpoint.mockResolvedValue("done");
    mockedGetCompletedCustomCoursesWithCardCounts.mockResolvedValue([
      {
        id: 12,
        name: "Completed course",
        iconId: "star",
        iconColor: "#111",
        cardsCount: 8,
        completedCardsCount: 8,
        reviewsEnabled: true,
        isOfficial: false,
      },
    ]);

    const screen = render(<CourseActivateScreen />);

    await waitFor(() => {
      expect(screen.getByText("Dodaj kurs")).toBeTruthy();
      expect(screen.getByText("completed")).toBeTruthy();
    });
    expect(screen.queryByText("app.actions.next")).toBeNull();
    expect(mockedUseCoachmarkFlow).toHaveBeenCalledWith(
      expect.objectContaining({ shouldStart: false }),
    );
  });
});
