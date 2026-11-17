import { act, renderHook } from "@testing-library/react-native";
import { Keyboard } from "react-native";
import { FLASHCARDS_COACHMARK_STEPS, HINT_COACHMARK_STEPS, type CoachmarkFlowStep } from "@/src/constants/coachmarkFlows";
import { useFlashcardsTutorials } from "../useFlashcardsTutorials";
import { useCoachmarkFlow } from "@/src/hooks/useCoachmarkFlow";

let mockStep: CoachmarkFlowStep | null;
const mockHintStep = HINT_COACHMARK_STEPS[0];
jest.mock("@/src/hooks/useCoachmarkFlow", () => ({
  useCoachmarkFlow: jest.fn(({ flowKey }: { flowKey: string }) => ({
    currentStep: flowKey === "flashcards-guided" ? mockStep : mockHintStep,
    currentIndex: 0,
    isActive: flowKey === "flashcards-guided",
    isReady: true,
    hasSeen: false,
    isPendingStart: false,
  })),
}));

function setup(answer = "wrong", boxZeroEnabled = false) {
  const params: Parameters<typeof useFlashcardsTutorials>[0] = {
    isFocused: true,
    isUiReady: true,
    shouldShowBoxes: true,
    shouldRenderLoadingOverlay: false,
    boxZeroEnabled,
    selectedItem: { id: 1, text: "cat", translations: ["kot"], type: "text" } as Parameters<typeof useFlashcardsTutorials>[0]["selectedItem"],
    selectedItemId: 1,
    answer,
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
  return { ...renderHook(() => useFlashcardsTutorials(params)), params };
}

beforeEach(() => {
  mockStep = FLASHCARDS_COACHMARK_STEPS.find((step) => step.id === "flashcards-step-9")!;
  jest.spyOn(Keyboard, "dismiss").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

it("starts the main tutorial with box zero enabled", () => {
  setup("", true);
  expect(useCoachmarkFlow).toHaveBeenCalledWith(expect.objectContaining({
    flowKey: "flashcards-guided",
    shouldStart: true,
    steps: expect.arrayContaining([expect.objectContaining({
      descriptionKey: "onboarding.flashcards.boxZero.firstBox",
    })]),
  }));
});

it.each([
  ["wrong", "assisted", "blink", "tilt"],
  ["kot", "normal", "sparkle", "hop"],
])("uses the matching success reaction after answer %s", (answer, variant, face, motion) => {
  const { result, rerender } = setup(answer);
  act(() => result.current.confirmWithTutorial());
  mockStep = FLASHCARDS_COACHMARK_STEPS.find((step) => step.id === "flashcards-step-10")!;
  rerender({});
  expect(result.current.guidedFlashcardsCoachmarkStep).toMatchObject({
    successVariant: variant,
    mascotFace: face,
    mascotMotion: motion,
    descriptionKey: variant === "assisted"
      ? "onboarding.flashcards.step10.descriptionAssisted"
      : "onboarding.flashcards.step10.description",
  });
});

it("uses encouragement for automatic hints and restores the wink for manual hints", () => {
  const { result, params } = setup();
  expect(result.current.guidedHintCoachmarkStep?.mascotFace).toBe("blink");
  act(() => params.requestHintTutorialRef.current!(1, "auto"));
  expect(result.current.guidedHintCoachmarkStep).toMatchObject({
    mascotFace: "encouraging",
    titleKey: "onboarding.hints.autoStep1.title",
  });
  act(() => params.requestHintTutorialRef.current!(1, "manual"));
  expect(result.current.guidedHintCoachmarkStep).toMatchObject({
    mascotFace: "blink",
    titleKey: "onboarding.hints.manualStep1.title",
  });
});
