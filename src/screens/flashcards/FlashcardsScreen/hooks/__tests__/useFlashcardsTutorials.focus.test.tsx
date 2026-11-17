import React from "react";
import { NavigationContext } from "@react-navigation/native";
import { act, renderHook } from "@testing-library/react-native";
import { FLASHCARDS_COACHMARK_STEPS } from "@/src/constants/coachmarkFlows";
import { useFlashcardsTutorials } from "../useFlashcardsTutorials";

const mockNext = jest.fn();
const mockStart = jest.fn();
let mockCoachmarkState = {
  isActive: true,
  activeTour: { key: "flashcards-guided" },
  index: 8,
};

jest.mock("@edwardloopez/react-native-coachmark", () => ({
  createTour: jest.fn(),
  useCoachmarkContext: () => ({
    state: mockCoachmarkState,
    start: mockStart,
    next: mockNext,
    back: jest.fn(),
    stop: jest.fn(),
  }),
}));
jest.mock("@/src/contexts/TutorialOrientationContext", () => ({
  useTutorialPortrait: () => true,
}));
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockCoachmarkState = {
    isActive: true,
    activeTour: { key: "flashcards-guided" },
    index: FLASHCARDS_COACHMARK_STEPS.findIndex((step) => step.id === "flashcards-step-9"),
  };
});

afterEach(() => jest.useRealTimers());

it.each(["flashcards-step-10", "flashcards-step-11"])(
  "preserves completion and resumes advancement after blurring at %s",
  async (stepId) => {
    let focused = true;
    const listeners = new Map<string, () => void>();
    const navigation = {
      isFocused: () => focused,
      addListener: (event: string, listener: () => void) => {
        listeners.set(event, listener);
        return () => listeners.delete(event);
      },
    };
    const wrapper = ({ children }: React.PropsWithChildren) => (
      <NavigationContext.Provider value={navigation as unknown as React.ContextType<typeof NavigationContext>}>
        {children}
      </NavigationContext.Provider>
    );
    const params: Parameters<typeof useFlashcardsTutorials>[0] = {
      isFocused: true,
      isUiReady: true,
      shouldShowBoxes: true,
      shouldRenderLoadingOverlay: false,
      boxZeroEnabled: false,
      selectedItem: { id: 1, text: "cat", translations: ["kot"], type: "text" } as Parameters<typeof useFlashcardsTutorials>[0]["selectedItem"],
      selectedItemId: 1,
      answer: "wrong",
      reversed: false,
      checkSpelling: (input, expected) => input === expected,
      confirm: jest.fn(),
      setAnswer: jest.fn(),
      setShouldCelebrate: jest.fn(),
      requestHintEdit: jest.fn(),
      shouldHideHintsForActiveBox: false,
      isCoachmarkActiveRef: { current: false },
      pendingHintTutorialCardIdRef: { current: null },
      hintTutorialSeenRef: { current: false },
      requestHintTutorialRef: { current: null },
    };
    const { result, rerender } = renderHook(() => useFlashcardsTutorials(params), { wrapper });
    await act(async () => {});
    act(() => result.current.confirmWithTutorial());
    mockCoachmarkState.index = FLASHCARDS_COACHMARK_STEPS.findIndex((step) => step.id === stepId);
    rerender({});
    expect(result.current.coachmark.canGoNext).toBe(true);

    act(() => {
      focused = false;
      params.isFocused = false;
      listeners.get("blur")?.();
    });
    expect(result.current.coachmark.isActive).toBe(false);
    expect(result.current.coachmark.isPaused).toBe(true);
    expect(result.current.coachmark.currentStep).toBeNull();
    act(() => jest.advanceTimersByTime(2000));
    expect(mockNext).not.toHaveBeenCalled();

    await act(async () => {
      focused = true;
      params.isFocused = true;
      listeners.get("focus")?.();
    });
    expect(result.current.coachmark.currentStep?.id).toBe(stepId);
    expect(result.current.coachmark.isPaused).toBe(false);
    expect(result.current.coachmark.canGoNext).toBe(true);
    expect(result.current.tutorialSuccessVariant).toBe("assisted");
    if (stepId === "flashcards-step-10") {
      expect(result.current.guidedFlashcardsCoachmarkStep?.descriptionKey).toBe(
        "onboarding.flashcards.step10.descriptionAssisted",
      );
    }
    act(() => jest.advanceTimersByTime(1400));
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockStart).not.toHaveBeenCalled();
    await act(async () => result.current.coachmark.goNext());
    expect(mockNext).toHaveBeenCalledTimes(2);

    // Actually stopping the tour must still clear progress for a fresh run.
    mockCoachmarkState.isActive = false;
    rerender({});
    expect(result.current.tutorialSuccessVariant).toBe("normal");
    mockCoachmarkState.isActive = true;
    rerender({});
    expect(result.current.coachmark.canGoNext).toBe(false);
  },
);
