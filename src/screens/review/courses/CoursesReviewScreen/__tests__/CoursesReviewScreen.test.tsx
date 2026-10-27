import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import CoursesReviewScreen from "@/src/screens/review/courses/CoursesReviewScreen/CoursesReviewScreen";
import { useCourseSelectionActions, usePinnedOfficialCourseIds } from "@/src/contexts/SettingsContext";
import {
  countDueCustomReviews,
  getCustomCoursesWithCardCounts,
  getOfficialCustomCoursesWithCardCounts,
} from "@/src/db/sqlite/db";
import { useCoachmarkFlow } from "@/src/hooks/useCoachmarkFlow";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: jest.fn(() => ({
    push: mockPush,
  })),
}));

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (effect: () => void | (() => void)) => {
    const React = jest.requireActual<typeof import("react")>("react");
    React.useEffect(effect, [effect]);
  },
}));

jest.mock("@/src/contexts/SettingsContext", () => ({
  useCourseSelectionActions: jest.fn(),
  usePinnedOfficialCourseIds: jest.fn(() => []),
  useSettings: () => ({ showBoxFaces: true }),
  useThemeSettings: () => ({
    colors: jest.requireActual("@/src/theme/theme").themeMap.light,
    accessibilityPreferences: {},
    fontScaleMultiplier: 1,
  }),
}));

jest.mock("@/src/db/sqlite/db", () => ({
  countDueCustomReviews: jest.fn(),
  getCustomCoursesWithCardCounts: jest.fn(),
  getOfficialCustomCoursesWithCardCounts: jest.fn(),
}));

jest.mock("@/src/hooks/useCoachmarkFlow", () => ({
  useCoachmarkFlow: jest.fn(() => ({
    isActive: false,
    isPendingStart: false,
    hasSeen: false,
    isReady: true,
    currentStep: null,
    currentIndex: 0,
    totalSteps: 6,
    canGoBack: false,
    canGoNext: true,
    goBack: jest.fn(),
    goNext: jest.fn(),
    advanceByEvent: jest.fn(() => Promise.resolve(true)),
  })),
}));

jest.mock("@/src/components/onboarding/CoachmarkLayerPortal", () => ({
  useCoachmarkLayerPortal: jest.fn(),
}));

jest.mock("@edwardloopez/react-native-coachmark", () => ({
  CoachmarkAnchor: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@/src/screens/review/courses/CoursesReviewScreen/CoursesScreen-styles", () => ({
  useStyles: jest.fn(() => new Proxy({}, { get: () => ({}) })),
}));

jest.mock("@/src/components/course/CourseTitleMarquee", () => ({
  CourseTitleMarquee: ({ text }: { text: string }) => {
    const React = jest.requireActual<typeof import("react")>("react");
    const { Text } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return <Text>{text}</Text>;
  },
}));

jest.mock("@/src/components/review/DueCountBadge", () => ({
  DueCountBadge: ({ count }: { count: number }) => `due:${count}`,
}));

const mockedUseCourseSelectionActions = useCourseSelectionActions as jest.Mock;
const mockedUsePinnedOfficialCourseIds = usePinnedOfficialCourseIds as jest.Mock;
const mockedCountDueCustomReviews = countDueCustomReviews as jest.Mock;
const mockedGetCustomCoursesWithCardCounts = getCustomCoursesWithCardCounts as jest.Mock;
const mockedGetOfficialCustomCoursesWithCardCounts =
  getOfficialCustomCoursesWithCardCounts as jest.Mock;
const mockedUseCoachmarkFlow = useCoachmarkFlow as jest.Mock;

describe("CoursesReviewScreen onboarding", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUsePinnedOfficialCourseIds.mockReturnValue([]);
    mockedUseCoachmarkFlow.mockReturnValue({
      isActive: false,
      isPendingStart: false,
      hasSeen: false,
      isReady: true,
      currentStep: null,
      currentIndex: 0,
      totalSteps: 6,
      canGoBack: false,
      canGoNext: true,
      goBack: jest.fn(),
      goNext: jest.fn(),
      advanceByEvent: jest.fn(() => Promise.resolve(true)),
    });
    mockedUseCourseSelectionActions.mockReturnValue({
      setActiveCustomCourseId: jest.fn(() => Promise.resolve()),
    });
    mockedGetCustomCoursesWithCardCounts.mockResolvedValue([
      {
        id: 11,
        name: "Custom review",
        iconId: "book-outline",
        iconColor: "#000",
        reviewsEnabled: true,
        isOfficial: false,
      },
    ]);
    mockedGetOfficialCustomCoursesWithCardCounts.mockResolvedValue([]);
    mockedCountDueCustomReviews.mockResolvedValue(3);
  });

  it.each([0, 3])("hides section headings while due counts are loading (due: %i)", async (dueCount) => {
    let finishCount!: (count: number) => void;
    mockedCountDueCustomReviews.mockReturnValue(new Promise<number>((resolve) => {
      finishCount = resolve;
    }));

    const screen = render(<CoursesReviewScreen />);
    expect(screen.UNSAFE_queryAllByType(Text)).toHaveLength(0);
    expect(screen.queryByTestId("review-empty-state")).toBeNull();

    await waitFor(() => expect(mockedCountDueCustomReviews).toHaveBeenCalled());
    expect(screen.UNSAFE_queryAllByType(Text)).toHaveLength(0);
    expect(screen.queryByTestId("review-empty-state")).toBeNull();

    await act(async () => finishCount(dueCount));

    if (dueCount === 0) {
      expect(screen.getByTestId("review-empty-state")).toBeTruthy();
      expect(screen.queryByText("Custom review")).toBeNull();
    } else {
      expect(screen.getByText("Custom review")).toBeTruthy();
      expect(screen.queryByTestId("review-empty-state")).toBeNull();
    }
  });

  it("starts onboarding only when at least one due review exists", async () => {
    render(<CoursesReviewScreen />);

    await waitFor(() => {
      expect(mockedUseCoachmarkFlow).toHaveBeenCalled();
    });

    const lastCall = mockedUseCoachmarkFlow.mock.calls.at(-1)?.[0];
    expect(lastCall?.shouldStart).toBe(true);
  });

  it("does not start onboarding when all visible review counts are zero", async () => {
    mockedCountDueCustomReviews.mockResolvedValue(0);

    render(<CoursesReviewScreen />);

    await waitFor(() => {
      expect(mockedUseCoachmarkFlow).toHaveBeenCalled();
    });

    const lastCall = mockedUseCoachmarkFlow.mock.calls.at(-1)?.[0];
    expect(lastCall?.shouldStart).toBe(false);
  });

  it("advances the last step only after clicking the first due course", async () => {
    const setActiveCustomCourseId = jest.fn(() => Promise.resolve());
    const advanceByEvent = jest.fn(() => Promise.resolve(true));
    mockedUseCourseSelectionActions.mockReturnValue({
      setActiveCustomCourseId,
    });
    mockedUseCoachmarkFlow.mockReturnValue({
      isActive: true,
      isPendingStart: false,
      hasSeen: false,
      isReady: true,
      currentStep: {
        id: "review-courses-step-6",
        targetId: "review-courses-first-card",
        titleKey: "onboarding.reviewCourses.step6.title",
        descriptionKey: "onboarding.reviewCourses.step6.description",
        kind: "action",
        advanceOn: "open_review_course",
      },
      currentIndex: 5,
      totalSteps: 6,
      canGoBack: true,
      canGoNext: false,
      goBack: jest.fn(),
      goNext: jest.fn(),
      advanceByEvent,
    });

    const screen = render(<CoursesReviewScreen />);

    await waitFor(() => {
      expect(screen.getByText("Custom review")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByText("Custom review"));
    });

    expect(advanceByEvent).toHaveBeenCalledWith("open_review_course");
    expect(setActiveCustomCourseId).toHaveBeenCalledWith(11);
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/review/reviewflashcards",
      params: { courseId: 11, onboarding: "review-flashcards" },
    });
  });

  it("continues onboarding when the first visible due course is official", async () => {
    mockedUsePinnedOfficialCourseIds.mockReturnValue([21]);
    const setActiveCustomCourseId = jest.fn(() => Promise.resolve());
    const advanceByEvent = jest.fn(() => Promise.resolve(true));
    mockedUseCourseSelectionActions.mockReturnValue({
      setActiveCustomCourseId,
    });
    mockedGetCustomCoursesWithCardCounts.mockResolvedValue([
      {
        id: 11,
        name: "Custom review",
        iconId: "book-outline",
        iconColor: "#000",
        reviewsEnabled: true,
        isOfficial: false,
      },
    ]);
    mockedGetOfficialCustomCoursesWithCardCounts.mockResolvedValue([
      {
        id: 21,
        slug: "official-review",
        name: "Official review",
        iconId: "book-outline",
        iconColor: "#000",
        reviewsEnabled: true,
      },
    ]);
    mockedCountDueCustomReviews.mockImplementation(async (courseId: number) =>
      courseId === 21 ? 5 : 3
    );
    mockedUseCoachmarkFlow.mockReturnValue({
      isActive: true,
      isPendingStart: false,
      hasSeen: false,
      isReady: true,
      currentStep: {
        id: "review-courses-step-6",
        targetId: "review-courses-first-card",
        titleKey: "onboarding.reviewCourses.step6.title",
        descriptionKey: "onboarding.reviewCourses.step6.description",
        kind: "action",
        advanceOn: "open_review_course",
      },
      currentIndex: 5,
      totalSteps: 6,
      canGoBack: true,
      canGoNext: false,
      goBack: jest.fn(),
      goNext: jest.fn(),
      advanceByEvent,
    });

    const screen = render(<CoursesReviewScreen />);

    await waitFor(() => {
      expect(screen.getByText("Official review")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByText("Official review"));
    });

    expect(advanceByEvent).toHaveBeenCalledWith("open_review_course");
    expect(setActiveCustomCourseId).toHaveBeenCalledWith(21);
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/review/reviewflashcards",
      params: { courseId: 21, onboarding: "review-flashcards" },
    });
  });

  it("uses the latest selection action and waits for activation before navigating", async () => {
    const previousAction = jest.fn(() => Promise.resolve());
    mockedUseCourseSelectionActions.mockReturnValue({
      setActiveCustomCourseId: previousAction,
    });
    const screen = render(<CoursesReviewScreen />);
    await waitFor(() => expect(screen.getByText("Custom review")).toBeTruthy());

    let finishActivation!: () => void;
    const latestAction = jest.fn(() => new Promise<void>((resolve) => {
      finishActivation = resolve;
    }));
    mockedUseCourseSelectionActions.mockReturnValue({
      setActiveCustomCourseId: latestAction,
    });
    screen.rerender(<CoursesReviewScreen />);

    await act(async () => {
      fireEvent.press(screen.getByText("Custom review"));
    });
    expect(previousAction).not.toHaveBeenCalled();
    expect(latestAction).toHaveBeenCalledWith(11);
    expect(mockPush).not.toHaveBeenCalled();

    await act(async () => finishActivation());
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/review/reviewflashcards",
      params: { courseId: 11 },
    });
  });
});
