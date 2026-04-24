import React from "react";
import { act, render } from "@testing-library/react-native";

import Flashcards from "@/src/screens/flashcards/FlashcardsScreen/FlashcardsScreen";
import { useFlashcardsAutoflow } from "@/src/hooks/useFlashcardsAutoflow";
import { useFlashcardsInteraction } from "@/src/hooks/useFlashcardsInteraction";
import { useSettings } from "@/src/contexts/SettingsContext";
import { getCustomFlashcards } from "@/src/db/sqlite/db";
import { useBoxesPersistenceSnapshot } from "@/src/hooks/useBoxesPersistenceSnapshot";

jest.mock("@/src/contexts/SettingsContext", () => ({
  useSettings: jest.fn(),
}));

jest.mock("@/src/contexts/LearningStatsContext", () => ({
  useLearningStats: jest.fn(() => ({
    registerKnownWord: jest.fn(() => ({
      wasNewMastered: false,
      nextKnownWordsCount: 0,
    })),
  })),
}));

jest.mock("@/src/contexts/NavbarStatsContext", () => ({
  useNavbarStats: jest.fn(() => ({
    applyStatBurst: jest.fn(),
    getStatsSnapshot: jest.fn(() => ({ streakDays: 0 })),
  })),
}));

jest.mock("@/src/contexts/QuoteContext", () => ({
  useQuote: jest.fn(() => ({
    triggerQuote: jest.fn(),
  })),
}));

jest.mock("@/src/db/sqlite/db", () => ({
  getCustomCourseById: jest.fn(() =>
    Promise.resolve({ id: 7, reviewsEnabled: false })
  ),
  getCourseCompletionSummary: jest.fn(() =>
    Promise.resolve({
      totalAnswers: 0,
      correctCount: 0,
      wrongCount: 0,
      timeMs: 0,
    }),
  ),
  getCustomFlashcards: jest.fn(() => Promise.resolve([])),
  getCustomReviewedFlashcardIds: jest.fn(() => Promise.resolve([])),
  getGlobalDailyStreakDays: jest.fn(() => Promise.resolve(0)),
  scheduleCustomReview: jest.fn(() => Promise.resolve(undefined)),
  updateCustomFlashcardHints: jest.fn(() => Promise.resolve(undefined)),
}));

jest.mock("@/src/hooks/useBoxesPersistenceSnapshot", () => ({
  useBoxesPersistenceSnapshot: jest.fn(() => ({
    boxes: {
      boxZero: [],
      boxOne: [
        {
          id: 1,
          text: "cat",
          translations: ["kot"],
          flipped: false,
          answerOnly: false,
          hintFront: null,
          hintBack: null,
          imageFront: null,
          imageBack: null,
          explanation: null,
          type: "text",
        },
      ],
      boxTwo: [],
      boxThree: [],
      boxFour: [],
      boxFive: [],
    },
    setBoxes: jest.fn(),
    isReady: true,
    usedWordIds: [],
    addUsedWordIds: jest.fn(),
    removeUsedWordIds: jest.fn(),
    setBatchIndex: jest.fn(),
  })),
}));

jest.mock("@/src/hooks/useAutoResetFlag", () => ({
  useAutoResetFlag: jest.fn(),
}));

jest.mock("@/src/hooks/useFlashcardsAutoflow", () => ({
  useFlashcardsAutoflow: jest.fn(),
}));

jest.mock("@/src/hooks/usePersistedState", () => ({
  usePersistedState: jest.fn(() => [null, jest.fn()]),
  useHydratedPersistedState: jest.fn((_: string, initialValue: unknown) => [
    initialValue,
    jest.fn(),
    true,
  ]),
}));

jest.mock("@/src/hooks/useFlashcardsInteraction", () => ({
  useFlashcardsInteraction: jest.fn(),
}));

jest.mock("@/src/hooks/useKeyboardBottomOffset", () => ({
  useKeyboardBottomOffset: jest.fn(() => ({
    keyboardVisible: false,
    bottomOffset: 0,
  })),
}));

jest.mock("@/src/hooks/useAutoScaleToFit", () => ({
  useAutoScaleToFit: jest.fn(() => ({
    scale: 1,
    scaledHeight: 0,
    scaleOffsetY: 0,
    onViewportLayout: jest.fn(),
    onContentLayout: jest.fn(),
    needsScrollFallback: false,
  })),
}));

jest.mock("@/src/hooks/useCoachmarkFlow", () => ({
  useCoachmarkFlow: jest.fn(() => ({
    isActive: false,
    hasSeen: true,
    isPendingStart: false,
    currentStep: null,
  })),
}));

jest.mock("@/src/hooks/useSpellchecking", () => ({
  __esModule: true,
  default: jest.fn(
    () => (input: string, expected: string) =>
      input.trim().toLowerCase() === expected.trim().toLowerCase()
  ),
}));

jest.mock("@/src/utils/soundPlayer", () => ({
  playFeedbackSound: jest.fn(),
}));

jest.mock("@/src/components/onboarding/CoachmarkLayerPortal", () => ({
  useCoachmarkLayerPortal: jest.fn(),
}));

jest.mock("@react-navigation/native", () => ({
  useIsFocused: jest.fn(() => true),
}));

jest.mock("expo-router", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

jest.mock("@edwardloopez/react-native-coachmark", () => ({
  CoachmarkAnchor: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("react-i18next", () => ({
  useTranslation: jest.fn(() => ({
    t: (key: string) => key,
  })),
}));

jest.mock("@/src/screens/flashcards/FlashcardsScreen/FlashcardsScreen-styles", () => ({
  useStyles: jest.fn(() => new Proxy({}, { get: () => ({}) })),
}));

jest.mock("@/src/components/card/card", () => {
  return function CardMock() {
    return null;
  };
});

jest.mock("@/src/components/Box/List/BoxList", () => {
  return function BoxesMock() {
    return null;
  };
});

jest.mock("@/src/components/Box/Carousel/BoxCarousel", () => {
  return function BoxCarouselMock() {
    return null;
  };
});

jest.mock("@/src/components/Box/Peek/FlashcardsPeek", () => {
  return function PeekMock() {
    return null;
  };
});

jest.mock("@/src/components/confetti/Confetti", () => {
  return function ConfettiMock() {
    return null;
  };
});

jest.mock("@/src/components/flashcards/FlashcardsButtons", () => ({
  FlashcardsButtons: () => null,
}));

const mockedUseSettings = useSettings as jest.Mock;
const mockedUseFlashcardsInteraction = useFlashcardsInteraction as jest.Mock;
const mockedUseFlashcardsAutoflow = useFlashcardsAutoflow as jest.Mock;
const mockedGetCustomFlashcards = getCustomFlashcards as jest.Mock;
const mockedUseBoxesPersistenceSnapshot =
  useBoxesPersistenceSnapshot as jest.Mock;

describe("FlashcardsScreen autoflow guard", () => {
  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    mockedGetCustomFlashcards.mockResolvedValue([]);
    mockedUseBoxesPersistenceSnapshot.mockReturnValue({
      boxes: {
        boxZero: [],
        boxOne: [
          {
            id: 1,
            text: "cat",
            translations: ["kot"],
            flipped: false,
            answerOnly: false,
            hintFront: null,
            hintBack: null,
            imageFront: null,
            imageBack: null,
            explanation: null,
            type: "text",
          },
        ],
        boxTwo: [],
        boxThree: [],
        boxFour: [],
        boxFive: [],
      },
      setBoxes: jest.fn(),
      isReady: true,
      usedWordIds: [],
      addUsedWordIds: jest.fn(),
      removeUsedWordIds: jest.fn(),
      setBatchIndex: jest.fn(),
    });
    mockedUseSettings.mockReturnValue({
      activeCustomCourseId: 7,
      setActiveCustomCourseId: jest.fn(),
      boxesLayout: "classic",
      flashcardsBatchSize: 20,
      boxZeroEnabled: false,
      autoflowEnabled: true,
      explanationOnlyOnWrong: false,
      showExplanationEnabled: false,
      skipCorrectionEnabled: false,
      actionButtonsPosition: "top",
      setActionButtonsPosition: jest.fn(),
      colors: {
        background: "#fff",
      },
    });

    mockedUseFlashcardsInteraction.mockReturnValue({
      activeBox: "boxOne",
      handleSelectBox: jest.fn(),
      selectedItem: {
        id: 1,
        text: "cat",
        translations: ["kot"],
        flipped: false,
        answerOnly: false,
        hintFront: null,
        hintBack: null,
        imageFront: null,
        imageBack: null,
        explanation: null,
        type: "text",
      },
      answer: "__wrong__",
      setAnswer: jest.fn(),
      result: false,
      setResult: jest.fn(),
      confirm: jest.fn(),
      reversed: false,
      correction: {
        cardId: 1,
        awers: "cat",
        rewers: "kot",
        input1: "",
        input2: "",
        mode: "demote",
      },
      wrongInputChange: jest.fn(),
      setCorrectionRewers: jest.fn(),
      learned: [],
      setLearned: jest.fn(),
      acknowledgeExplanation: jest.fn(),
      resetInteractionState: jest.fn(),
      clearSelection: jest.fn(),
      updateSelectedItem: jest.fn(),
      isBetweenCards: false,
      getQueueForBox: jest.fn(() => []),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it("disables autoflow switching while a wrong-result correction is active", async () => {
    render(<Flashcards />);
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockedUseFlashcardsAutoflow).toHaveBeenCalled();
    const lastCall =
      mockedUseFlashcardsAutoflow.mock.calls[
        mockedUseFlashcardsAutoflow.mock.calls.length - 1
      ]?.[0];

    expect(lastCall).toMatchObject({
      enabled: true,
      canSwitch: false,
      activeBox: "boxOne",
      boxZeroEnabled: false,
      isReady: true,
      incomingBatchSize: 20,
      remainingNewFlashcardsCount: 0,
    });
  });

  it("passes remainingNewFlashcardsCount based on customCards minus trackedIds", async () => {
    mockedGetCustomFlashcards.mockResolvedValue([
      {
        id: 1,
        text: "cat",
        translations: ["kot"],
        hintFront: null,
        hintBack: null,
        imageFront: null,
        imageBack: null,
        explanation: null,
        type: "text",
      },
      {
        id: 2,
        text: "dog",
        translations: ["pies"],
        hintFront: null,
        hintBack: null,
        imageFront: null,
        imageBack: null,
        explanation: null,
        type: "text",
      },
      {
        id: 3,
        text: "bird",
        translations: ["ptak"],
        hintFront: null,
        hintBack: null,
        imageFront: null,
        imageBack: null,
        explanation: null,
        type: "text",
      },
    ]);

    mockedUseBoxesPersistenceSnapshot.mockReturnValue({
      boxes: {
        boxZero: [],
        boxOne: [
          {
            id: 1,
            text: "cat",
            translations: ["kot"],
            flipped: false,
            answerOnly: false,
            hintFront: null,
            hintBack: null,
            imageFront: null,
            imageBack: null,
            explanation: null,
            type: "text",
          },
        ],
        boxTwo: [],
        boxThree: [],
        boxFour: [],
        boxFive: [],
      },
      setBoxes: jest.fn(),
      isReady: true,
      usedWordIds: [],
      addUsedWordIds: jest.fn(),
      removeUsedWordIds: jest.fn(),
      setBatchIndex: jest.fn(),
    });

    render(<Flashcards />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const lastCall =
      mockedUseFlashcardsAutoflow.mock.calls[
        mockedUseFlashcardsAutoflow.mock.calls.length - 1
      ]?.[0];

    expect(lastCall).toMatchObject({
      incomingBatchSize: 20,
      remainingNewFlashcardsCount: 2,
    });
  });

  it("treats persisted usedWordIds as already distributed after app restart", async () => {
    mockedGetCustomFlashcards.mockResolvedValue([
      {
        id: 1,
        text: "cat",
        translations: ["kot"],
        hintFront: null,
        hintBack: null,
        imageFront: null,
        imageBack: null,
        explanation: null,
        type: "text",
      },
      {
        id: 2,
        text: "dog",
        translations: ["pies"],
        hintFront: null,
        hintBack: null,
        imageFront: null,
        imageBack: null,
        explanation: null,
        type: "text",
      },
      {
        id: 3,
        text: "bird",
        translations: ["ptak"],
        hintFront: null,
        hintBack: null,
        imageFront: null,
        imageBack: null,
        explanation: null,
        type: "text",
      },
    ]);

    const addUsedWordIds = jest.fn();
    mockedUseBoxesPersistenceSnapshot.mockReturnValue({
      boxes: {
        boxZero: [],
        boxOne: [],
        boxTwo: [],
        boxThree: [],
        boxFour: [],
        boxFive: [],
      },
      setBoxes: jest.fn(),
      isReady: true,
      usedWordIds: [1, 2, 3],
      addUsedWordIds,
      removeUsedWordIds: jest.fn(),
      setBatchIndex: jest.fn(),
    });

    render(<Flashcards />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const lastCall =
      mockedUseFlashcardsAutoflow.mock.calls[
        mockedUseFlashcardsAutoflow.mock.calls.length - 1
      ]?.[0];

    expect(lastCall).toMatchObject({
      remainingNewFlashcardsCount: 0,
    });
    expect(addUsedWordIds).not.toHaveBeenCalled();
  });

  it("ignores stale persisted usedWordIds that no longer belong to the course", async () => {
    mockedGetCustomFlashcards.mockResolvedValue([
      {
        id: 1,
        text: "cat",
        translations: ["kot"],
        hintFront: null,
        hintBack: null,
        imageFront: null,
        imageBack: null,
        explanation: null,
        type: "text",
      },
      {
        id: 2,
        text: "dog",
        translations: ["pies"],
        hintFront: null,
        hintBack: null,
        imageFront: null,
        imageBack: null,
        explanation: null,
        type: "text",
      },
      {
        id: 3,
        text: "bird",
        translations: ["ptak"],
        hintFront: null,
        hintBack: null,
        imageFront: null,
        imageBack: null,
        explanation: null,
        type: "text",
      },
    ]);

    const setBoxes = jest.fn();
    mockedUseBoxesPersistenceSnapshot.mockReturnValue({
      boxes: {
        boxZero: [],
        boxOne: [],
        boxTwo: [],
        boxThree: [],
        boxFour: [],
        boxFive: [],
      },
      setBoxes,
      isReady: true,
      usedWordIds: [91, 92, 93],
      addUsedWordIds: jest.fn(),
      removeUsedWordIds: jest.fn(),
      setBatchIndex: jest.fn(),
    });

    render(<Flashcards />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const lastCall =
      mockedUseFlashcardsAutoflow.mock.calls[
        mockedUseFlashcardsAutoflow.mock.calls.length - 1
      ]?.[0];

    expect(lastCall).toMatchObject({
      remainingNewFlashcardsCount: 3,
    });
    expect(setBoxes).toHaveBeenCalled();
  });

  it("resets interaction when the active course changes", async () => {
    const resetInteractionState = jest.fn();
    mockedUseFlashcardsInteraction.mockReturnValue({
      activeBox: "boxOne",
      handleSelectBox: jest.fn(),
      selectedItem: {
        id: 1,
        text: "cat",
        translations: ["kot"],
        flipped: false,
        answerOnly: false,
        hintFront: null,
        hintBack: null,
        imageFront: null,
        imageBack: null,
        explanation: null,
        type: "text",
      },
      answer: "kot",
      setAnswer: jest.fn(),
      result: true,
      setResult: jest.fn(),
      confirm: jest.fn(),
      reversed: false,
      correction: null,
      wrongInputChange: jest.fn(),
      setCorrectionRewers: jest.fn(),
      learned: [],
      setLearned: jest.fn(),
      acknowledgeExplanation: jest.fn(),
      resetInteractionState,
      clearSelection: jest.fn(),
      updateSelectedItem: jest.fn(),
      isBetweenCards: false,
      getQueueForBox: jest.fn(() => []),
    });

    const { rerender } = render(<Flashcards />);
    await act(async () => {
      await Promise.resolve();
    });

    expect(resetInteractionState).toHaveBeenCalledTimes(1);

    mockedUseSettings.mockReturnValue({
      activeCustomCourseId: 8,
      setActiveCustomCourseId: jest.fn(),
      boxesLayout: "classic",
      flashcardsBatchSize: 20,
      boxZeroEnabled: false,
      autoflowEnabled: true,
      explanationOnlyOnWrong: false,
      showExplanationEnabled: false,
      skipCorrectionEnabled: false,
      actionButtonsPosition: "top",
      setActionButtonsPosition: jest.fn(),
      colors: {
        background: "#fff",
      },
    });

    rerender(<Flashcards />);
    await act(async () => {
      await Promise.resolve();
    });

    expect(resetInteractionState).toHaveBeenCalledTimes(2);
  });
});
