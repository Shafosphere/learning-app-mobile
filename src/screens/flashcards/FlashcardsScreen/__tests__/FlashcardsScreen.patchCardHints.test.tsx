import React from "react";
import { act, render } from "@testing-library/react-native";

import Flashcards from "@/src/screens/flashcards/FlashcardsScreen/FlashcardsScreen";
import { useSettings } from "@/src/contexts/SettingsContext";
import {
  getCustomFlashcards,
  updateCustomFlashcardHints,
} from "@/src/db/sqlite/db";
import { useFlashcardsInteraction } from "@/src/hooks/useFlashcardsInteraction";
import { playFeedbackSound } from "@/src/utils/soundPlayer";
import type { CardProps } from "@/src/components/card/card-types";
import type { BoxesState, WordWithTranslations } from "@/src/types/boxes";

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
    Promise.resolve({ id: 7, reviewsEnabled: false }),
  ),
  getCourseCompletionSummary: jest.fn(() =>
    Promise.resolve({
      totalAnswers: 0,
      correctCount: 0,
      wrongCount: 0,
      timeMs: 0,
    }),
  ),
  getCustomFlashcards: jest.fn(),
  getCustomReviewedFlashcardIds: jest.fn(() => Promise.resolve([])),
  getGlobalDailyStreakDays: jest.fn(() => Promise.resolve(0)),
  scheduleCustomReview: jest.fn(() => Promise.resolve(undefined)),
  updateCustomFlashcardHints: jest.fn(() => Promise.resolve(undefined)),
}));

let mockCurrentBoxes: BoxesState;
let mockCurrentUsedWordIds: number[];
let mockCurrentSelectedItem: WordWithTranslations | null;
let mockCurrentLearned: WordWithTranslations[];
let mockCurrentResult: boolean | null;
const mockSetBoxes = jest.fn();
const mockAddUsedWordIds = jest.fn();
const mockRemoveUsedWordIds = jest.fn();
const mockSetBatchIndex = jest.fn();
const mockSetLearned = jest.fn();
const mockUpdateSelectedItem = jest.fn();

jest.mock("@/src/hooks/useBoxesPersistenceSnapshot", () => ({
  useBoxesPersistenceSnapshot: jest.fn(() => ({
    boxes: mockCurrentBoxes,
    setBoxes: (updater: React.SetStateAction<BoxesState>) => {
      mockSetBoxes(updater);
      mockCurrentBoxes =
        typeof updater === "function"
          ? updater(mockCurrentBoxes)
          : updater;
    },
    isReady: true,
    usedWordIds: mockCurrentUsedWordIds,
    addUsedWordIds: mockAddUsedWordIds,
    removeUsedWordIds: mockRemoveUsedWordIds,
    setBatchIndex: mockSetBatchIndex,
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
  useFlashcardsInteraction: jest.fn(() => ({
    activeBox: "boxOne",
    handleSelectBox: jest.fn(),
    selectedItem: mockCurrentSelectedItem,
    answer: "",
    setAnswer: jest.fn(),
    result: mockCurrentResult,
    setResult: jest.fn(),
    confirm: jest.fn(),
    reversed: false,
    correction: null,
    wrongInputChange: jest.fn(),
    setCorrectionRewers: jest.fn(),
    learned: mockCurrentLearned,
    setLearned: (updater: React.SetStateAction<WordWithTranslations[]>) => {
      mockSetLearned(updater);
      mockCurrentLearned =
        typeof updater === "function"
          ? updater(mockCurrentLearned)
          : updater;
    },
    acknowledgeExplanation: jest.fn(),
    resetInteractionState: jest.fn(),
    clearSelection: jest.fn(),
    updateSelectedItem: (
      updater: (current: WordWithTranslations | null) => WordWithTranslations | null,
    ) => {
      mockUpdateSelectedItem(updater);
      mockCurrentSelectedItem = updater(mockCurrentSelectedItem);
    },
    isBetweenCards: false,
    getQueueForBox: jest.fn(() => []),
  })),
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
      input.trim().toLowerCase() === expected.trim().toLowerCase(),
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

let latestCardProps: CardProps | null = null;
type ButtonsProps = React.ComponentProps<
  typeof import("@/src/components/flashcards/FlashcardsButtons").FlashcardsButtons
>;
let latestButtonsProps: ButtonsProps | null = null;

jest.mock("@/src/components/card/card", () => {
  return function CardMock(props: CardProps) {
    latestCardProps = props;
    return null;
  };
});

jest.mock("@/src/components/flashcards/FlashcardsButtons", () => ({
  FlashcardsButtons: (props: ButtonsProps) => {
    latestButtonsProps = props;
    return null;
  },
}));

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

const mockedUseSettings = useSettings as jest.Mock;
const mockedGetCustomFlashcards = getCustomFlashcards as jest.Mock;
const mockedUpdateCustomFlashcardHints = updateCustomFlashcardHints as jest.Mock;
const mockedUseFlashcardsInteraction = useFlashcardsInteraction as jest.Mock;
const mockedPlayFeedbackSound = playFeedbackSound as jest.Mock;

function makeCard(
  overrides: Partial<WordWithTranslations> & Pick<WordWithTranslations, "id">,
): WordWithTranslations {
  return {
    id: overrides.id,
    text: overrides.text ?? `word-${overrides.id}`,
    translations: overrides.translations ?? [`translation-${overrides.id}`],
    flipped: overrides.flipped ?? false,
    answerOnly: overrides.answerOnly ?? false,
    hintFront: overrides.hintFront ?? null,
    hintBack: overrides.hintBack ?? null,
    imageFront: overrides.imageFront ?? null,
    imageBack: overrides.imageBack ?? null,
    explanation: overrides.explanation ?? null,
    type: overrides.type ?? "text",
  };
}

describe("FlashcardsScreen patchCardHints integration", () => {
  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    latestCardProps = null;
    latestButtonsProps = null;
    mockSetBoxes.mockClear();
    mockSetLearned.mockClear();
    mockUpdateSelectedItem.mockClear();
    mockAddUsedWordIds.mockClear();
    mockRemoveUsedWordIds.mockClear();
    mockSetBatchIndex.mockClear();
    mockCurrentUsedWordIds = [];
    mockCurrentResult = null;

    mockedUseSettings.mockReturnValue({
      activeCustomCourseId: 7,
      setActiveCustomCourseId: jest.fn(),
      boxesLayout: "classic",
      flashcardsBatchSize: 20,
      boxZeroEnabled: false,
      autoflowEnabled: false,
      explanationOnlyOnWrong: false,
      showExplanationEnabled: false,
      skipCorrectionEnabled: false,
      actionButtonsPosition: "top",
      setActionButtonsPosition: jest.fn(),
      colors: {
        background: "#fff",
      },
    });
    mockedUseFlashcardsInteraction.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it("keeps hint data synchronized across boxes, learned, selected item and future downloads", async () => {
    const targetCard = makeCard({
      id: 1,
      text: "cat",
      translations: ["kot"],
      hintFront: "old front",
      hintBack: "old back",
    });
    const untouchedCard = makeCard({
      id: 2,
      text: "dog",
      translations: ["pies"],
      hintFront: "keep front",
      hintBack: "keep back",
    });

    mockCurrentBoxes = {
      boxZero: [],
      boxOne: [targetCard, untouchedCard],
      boxTwo: [],
      boxThree: [],
      boxFour: [],
      boxFive: [],
    };
    mockCurrentLearned = [targetCard, untouchedCard];
    mockCurrentSelectedItem = targetCard;
    mockedGetCustomFlashcards.mockResolvedValue([targetCard, untouchedCard]);

    const screen = render(<Flashcards />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(latestCardProps?.selectedItem?.id).toBe(targetCard.id);

    await act(async () => {
      await latestCardProps?.onHintUpdate?.(targetCard.id, "new front", "new back");
    });

    expect(mockCurrentBoxes.boxOne.find((card) => card.id === targetCard.id)).toMatchObject({
      hintFront: "new front",
      hintBack: "new back",
    });
    expect(mockCurrentLearned.find((card) => card.id === targetCard.id)).toMatchObject({
      hintFront: "new front",
      hintBack: "new back",
    });
    expect(mockCurrentSelectedItem).toMatchObject({
      id: targetCard.id,
      hintFront: "new front",
      hintBack: "new back",
    });
    expect(mockCurrentBoxes.boxOne.find((card) => card.id === untouchedCard.id)).toMatchObject({
      hintFront: untouchedCard.hintFront,
      hintBack: untouchedCard.hintBack,
    });
    expect(mockCurrentLearned.find((card) => card.id === untouchedCard.id)).toMatchObject({
      hintFront: untouchedCard.hintFront,
      hintBack: untouchedCard.hintBack,
    });
    expect(mockedUpdateCustomFlashcardHints).toHaveBeenCalledWith(targetCard.id, {
      hintFront: "new front",
      hintBack: "new back",
    });

    mockCurrentBoxes = {
      boxZero: [],
      boxOne: [],
      boxTwo: [],
      boxThree: [],
      boxFour: [],
      boxFive: [],
    };
    mockCurrentLearned = [];
    mockCurrentSelectedItem = null;
    screen.rerender(<Flashcards />);

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await latestButtonsProps?.onDownload?.();
    });

    expect(mockCurrentBoxes.boxOne.find((card) => card.id === targetCard.id)).toMatchObject({
      hintFront: "new front",
      hintBack: "new back",
    });
    expect(mockCurrentBoxes.boxOne.find((card) => card.id === untouchedCard.id)).toMatchObject({
      hintFront: untouchedCard.hintFront,
      hintBack: untouchedCard.hintBack,
    });
  });

  it("does not replay wrong feedback when a hint update refreshes the selected card", async () => {
    const targetCard = makeCard({
      id: 11,
      text: "cat",
      translations: ["kot"],
      hintFront: "old front",
      hintBack: "old back",
    });

    mockCurrentBoxes = {
      boxZero: [],
      boxOne: [targetCard],
      boxTwo: [],
      boxThree: [],
      boxFour: [],
      boxFive: [],
    };
    mockCurrentLearned = [];
    mockCurrentSelectedItem = targetCard;
    mockCurrentResult = false;
    mockedGetCustomFlashcards.mockResolvedValue([targetCard]);

    render(<Flashcards />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockedPlayFeedbackSound).toHaveBeenCalledTimes(1);
    expect(mockedPlayFeedbackSound).toHaveBeenCalledWith(false);

    await act(async () => {
      await latestCardProps?.onHintUpdate?.(targetCard.id, "new front", "new back");
      await Promise.resolve();
    });

    expect(mockedPlayFeedbackSound).toHaveBeenCalledTimes(1);
  });
});
