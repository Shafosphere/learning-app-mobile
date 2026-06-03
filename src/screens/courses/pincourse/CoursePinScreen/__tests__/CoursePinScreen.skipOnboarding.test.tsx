import type { ReactNode } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import CoursePinScreen from "../CoursePinScreen";
import { useCoachmarkLayerPortal } from "@/src/components/onboarding/CoachmarkLayerPortal";
import { useCoachmarkFlow } from "@/src/hooks/useCoachmarkFlow";
import {
  getOnboardingCheckpoint,
  setOnboardingCheckpoint,
} from "@/src/services/onboardingCheckpoint";

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockPinOfficialCourse = jest.fn(() => Promise.resolve());
const mockUnpinOfficialCourse = jest.fn(() => Promise.resolve());
const mockSkipFlow = jest.fn(() => Promise.resolve());
let mockPinnedOfficialCourseIds: number[] = [];

const mockColors = {
  background: "#ffffff",
  secondBackground: "#f5f5f5",
  border: "#dddddd",
  headline: "#111111",
  paragraph: "#333333",
  font: "#111111",
  lightbg: "#ffffff",
  my_green: "#00aa66",
  my_red: "#ff3355",
  my_yellow: "#ffdd33",
};

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { value?: number }) => {
      const copy: Record<string, string> = {
        "onboarding.skip.label": "Pomiń",
        "onboarding.skip.title": "Pominąć samouczek?",
        "onboarding.skip.description": "Czy na pewno chcesz pominąć samouczek?",
        "onboarding.skip.confirm": "Pomiń",
        "onboarding.skip.cancel": "Zostań",
        "app.actions.next": "Dalej",
        "repeats.format.flashcardsValue": `${options?.value ?? 0} fiszek`,
      };
      return copy[key] ?? key;
    },
  }),
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

jest.mock("@/src/contexts/SettingsContext", () => ({
  useSettings: () => ({
    colors: mockColors,
    highContrastEnabled: false,
    nativeLanguage: "pl",
    pinnedOfficialCourseIds: mockPinnedOfficialCourseIds,
    pinOfficialCourse: mockPinOfficialCourse,
    unpinOfficialCourse: mockUnpinOfficialCourse,
  }),
}));

jest.mock("@/src/db/sqlite/db", () => ({
  getOfficialCustomCoursesWithCardCounts: jest.fn(() =>
    Promise.resolve([
      {
        id: 1,
        name: "Test course",
        iconId: "book",
        iconColor: "#00aa66",
        slug: null,
        cardsCount: 12,
      },
    ]),
  ),
}));

jest.mock("@/src/hooks/useCoachmarkFlow", () => ({
  useCoachmarkFlow: jest.fn(() => ({
    isActive: true,
    isPendingStart: false,
    hasSeen: false,
    isReady: true,
    currentStep: {
      id: "course-pin-step-1",
      targetId: "course-pin-bubble-anchor",
      titleKey: "onboarding.coursePin.step1.title",
      descriptionKey: "onboarding.coursePin.step1.description",
      kind: "info",
      advanceOn: "manual",
    },
    currentIndex: 0,
    totalSteps: 1,
    canGoBack: false,
    canGoNext: true,
    goBack: jest.fn(),
    goNext: jest.fn(),
    advanceByEvent: jest.fn(() => Promise.resolve(true)),
    skipFlow: mockSkipFlow,
  })),
}));

jest.mock("@/src/components/onboarding/CoachmarkLayerPortal", () => ({
  useCoachmarkLayerPortal: jest.fn(),
}));

jest.mock("@edwardloopez/react-native-coachmark", () => ({
  CoachmarkAnchor: ({ children }: { children?: ReactNode }) => {
    const { View } = require("react-native");
    return <View>{children}</View>;
  },
}));

jest.mock("@/src/components/course/CourseListCard", () => ({
  CourseListCard: ({
    title,
    rightAccessory,
  }: {
    title: string;
    rightAccessory?: ReactNode;
  }) => {
    const { Text, View } = require("react-native");
    return (
      <View>
        <Text>{title}</Text>
        {rightAccessory}
      </View>
    );
  },
}));

jest.mock("@/src/services/onboardingCheckpoint", () => ({
  getOnboardingCheckpoint: jest.fn(() => Promise.resolve("pin_required")),
  setOnboardingCheckpoint: jest.fn(() => Promise.resolve()),
}));

const mockedUseCoachmarkFlow = useCoachmarkFlow as jest.Mock;
const mockedUseCoachmarkLayerPortal = useCoachmarkLayerPortal as jest.Mock;
const mockedGetOnboardingCheckpoint = getOnboardingCheckpoint as jest.Mock;
const mockedSetOnboardingCheckpoint = setOnboardingCheckpoint as jest.Mock;

function getLatestCoachmarkLayer() {
  return mockedUseCoachmarkLayerPortal.mock.calls.at(-1)?.[1];
}

describe("CoursePinScreen skip onboarding", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPinnedOfficialCourseIds = [];
    mockedGetOnboardingCheckpoint.mockResolvedValue("pin_required");
  });

  it("shows skip on the first onboarding step and cancels without completing", async () => {
    render(<CoursePinScreen />);

    let layer: ReturnType<typeof getLatestCoachmarkLayer>;
    await waitFor(() => {
      layer = getLatestCoachmarkLayer();
      expect(layer?.showSkipButton).toBe(true);
      expect(layer?.skipLabel).toBe("Pomiń");
      expect(layer?.onSkipPress).toEqual(expect.any(Function));
    });

    act(() => {
      layer!.onSkipPress();
    });
    await waitFor(() => {
      expect(screen.getByText("Pominąć samouczek?")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Zostań"));

    await waitFor(() => {
      expect(screen.queryByText("Pominąć samouczek?")).toBeNull();
    });
    expect(mockSkipFlow).not.toHaveBeenCalled();
    expect(mockedSetOnboardingCheckpoint).not.toHaveBeenCalledWith("done");
  });

  it("confirms skip, closes the flow, and marks onboarding done", async () => {
    render(<CoursePinScreen />);

    let layer: ReturnType<typeof getLatestCoachmarkLayer>;
    await waitFor(() => {
      layer = getLatestCoachmarkLayer();
      expect(layer?.showSkipButton).toBe(true);
    });

    act(() => {
      layer!.onSkipPress();
    });
    await waitFor(() => {
      expect(screen.getByText("Pominąć samouczek?")).toBeTruthy();
    });
    fireEvent.press(screen.getAllByText("Pomiń").at(-1)!);

    await waitFor(() => {
      expect(mockSkipFlow).toHaveBeenCalledTimes(1);
    });
    expect(mockedSetOnboardingCheckpoint).toHaveBeenCalledWith("done");
  });

  it("does not show skip after the first onboarding step", async () => {
    mockedUseCoachmarkFlow.mockReturnValue({
      isActive: true,
      isPendingStart: false,
      hasSeen: false,
      isReady: true,
      currentStep: {
        id: "course-pin-step-2",
        targetId: "course-pin-bubble-anchor",
        titleKey: "onboarding.coursePin.step2.title",
        descriptionKey: "onboarding.coursePin.step2.description",
        kind: "info",
        advanceOn: "manual",
      },
      currentIndex: 1,
      totalSteps: 2,
      canGoBack: true,
      canGoNext: true,
      goBack: jest.fn(),
      goNext: jest.fn(),
      advanceByEvent: jest.fn(() => Promise.resolve(true)),
      skipFlow: mockSkipFlow,
    });

    render(<CoursePinScreen />);

    await waitFor(() => {
      expect(getLatestCoachmarkLayer()?.showSkipButton).toBe(false);
    });
  });

  it("switches to the knowledge tab after the categories onboarding step", async () => {
    const mockGoNext = jest.fn(() => Promise.resolve());
    mockedUseCoachmarkFlow.mockReturnValue({
      isActive: true,
      isPendingStart: false,
      hasSeen: false,
      isReady: true,
      currentStep: {
        id: "course-pin-step-6",
        targetId: "course-pin-tab-switcher",
        titleKey: "onboarding.coursePin.step6.title",
        descriptionKey: "onboarding.coursePin.step6.description",
        kind: "info",
        advanceOn: "manual",
      },
      currentIndex: 5,
      totalSteps: 9,
      canGoBack: true,
      canGoNext: true,
      goBack: jest.fn(),
      goNext: mockGoNext,
      advanceByEvent: jest.fn(() => Promise.resolve(true)),
      skipFlow: mockSkipFlow,
    });

    render(<CoursePinScreen />);

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Języki" })).toHaveAccessibilityState({
        selected: true,
      });
    });

    const layer = getLatestCoachmarkLayer();
    await act(async () => {
      await layer!.onNext();
    });

    expect(mockGoNext).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Wiedza" })).toHaveAccessibilityState({
        selected: true,
      });
    });
  });

  it("keeps language tab selected for first-card onboarding targets", async () => {
    mockPinnedOfficialCourseIds = [1];
    mockedUseCoachmarkFlow.mockReturnValue({
      isActive: true,
      isPendingStart: false,
      hasSeen: false,
      isReady: true,
      currentStep: {
        id: "course-pin-step-3",
        targetId: "course-pin-first-card",
        titleKey: "onboarding.coursePin.step3.title",
        descriptionKey: "onboarding.coursePin.step3.description",
        kind: "info",
        advanceOn: "manual",
      },
      currentIndex: 2,
      totalSteps: 9,
      canGoBack: true,
      canGoNext: true,
      goBack: jest.fn(),
      goNext: jest.fn(),
      advanceByEvent: jest.fn(() => Promise.resolve(true)),
      skipFlow: mockSkipFlow,
    });

    render(<CoursePinScreen />);
    fireEvent.press(screen.getByText("Wiedza"));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Języki" })).toHaveAccessibilityState({
        selected: true,
      });
    });
  });
});
