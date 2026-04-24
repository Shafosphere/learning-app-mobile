import React from "react";
import { act, render } from "@testing-library/react-native";

import Flashcards from "@/src/screens/flashcards/FlashcardsScreen";
import { useSettings } from "@/src/contexts/SettingsContext";
import {
  getCourseCompletionSummary,
  getCustomFlashcards,
  getCustomReviewedFlashcardIds,
} from "@/src/db/sqlite/db";
import {
  getCourseCompletionRunStartedAt,
} from "@/src/screens/flashcards/courseCompletionRun";
import { triggerCourseFinishedPreview } from "@/src/services/courseFinishedPreview";
import { useFlashcardsInteraction } from "@/src/hooks/useFlashcardsInteraction";
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
    Promise.resolve({ id: 7, name: "Ang A2", reviewsEnabled: false, slug: "eng_to_pl_a2" }),
  ),
  getCourseCompletionSummary: jest.fn(() =>
    Promise.resolve({
      totalAnswers: 10,
      correctCount: 8,
      wrongCount: 2,
      timeMs: 12 * 60 * 1000,
    }),
  ),
  getCustomFlashcards: jest.fn(() => Promise.resolve([])),
  getCustomReviewedFlashcardIds: jest.fn(() => Promise.resolve([])),
  getGlobalDailyStreakDays: jest.fn(() => Promise.resolve(0)),
  scheduleCustomReview: jest.fn(() => Promise.resolve(undefined)),
  updateCustomFlashcardHints: jest.fn(() => Promise.resolve(undefined)),
}));

jest.mock("@/src/screens/flashcards/courseCompletionRun", () => ({
  ensureCourseCompletionRunStarted: jest.fn(() => Promise.resolve(0)),
  getCourseCompletionRunStartedAt: jest.fn(() => Promise.resolve(null)),
}));

function createEmptyBoxes(): BoxesState {
  return {
    boxZero: [],
    boxOne: [],
    boxTwo: [],
    boxThree: [],
    boxFour: [],
    boxFive: [],
  };
}

let mockCurrentBoxes: BoxesState = createEmptyBoxes();
let mockCurrentUsedWordIds: number[] = [];

function mockCloneBoxes(boxes: BoxesState): BoxesState {
  return {
    boxZero: [...boxes.boxZero],
    boxOne: [...boxes.boxOne],
    boxTwo: [...boxes.boxTwo],
    boxThree: [...boxes.boxThree],
    boxFour: [...boxes.boxFour],
    boxFive: [...boxes.boxFive],
  };
}

jest.mock("@/src/hooks/useBoxesPersistenceSnapshot", () => ({
  useBoxesPersistenceSnapshot: jest.fn(() => ({
    boxes: mockCloneBoxes(mockCurrentBoxes),
    setBoxes: jest.fn((update: BoxesState | ((prev: BoxesState) => BoxesState)) => {
      const next =
        typeof update === "function" ? update(mockCloneBoxes(mockCurrentBoxes)) : update;
      mockCurrentBoxes = mockCloneBoxes(next);
    }),
    isReady: true,
    usedWordIds: [...mockCurrentUsedWordIds],
    addUsedWordIds: jest.fn((ids: number[] | number) => {
      const nextIds = Array.isArray(ids) ? ids : [ids];
      mockCurrentUsedWordIds = Array.from(
        new Set([...mockCurrentUsedWordIds, ...nextIds])
      );
    }),
    removeUsedWordIds: jest.fn((ids: number[] | number) => {
      const idsToRemove = new Set(Array.isArray(ids) ? ids : [ids]);
      mockCurrentUsedWordIds = mockCurrentUsedWordIds.filter(
        (id) => !idsToRemove.has(id)
      );
    }),
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

jest.mock("@/src/screens/flashcards/FlashcardsScreen-styles", () => ({
  useStyles: jest.fn(() => new Proxy({}, { get: () => ({}) })),
}));

let latestCardProps: CardProps | null = null;

jest.mock("@/src/components/card/card", () => {
  return function CardMock(props: CardProps) {
    latestCardProps = props;
    return null;
  };
});

type ButtonsProps = React.ComponentProps<
  typeof import("@/src/components/flashcards/FlashcardsButtons").FlashcardsButtons
>;

let latestButtonsProps: ButtonsProps | null = null;
let latestBoxListProps: {
  faces?: Partial<Record<keyof BoxesState, string>>;
} | null = null;

jest.mock("@/src/components/flashcards/FlashcardsButtons", () => ({
  FlashcardsButtons: (props: ButtonsProps) => {
    const { Text: MockText } = require("react-native");
    latestButtonsProps = props;
    return <MockText testID="flashcards-buttons">Flashcards buttons</MockText>;
  },
}));

jest.mock("@/src/components/Box/List/BoxList", () => {
  return function BoxesMock(props: {
    faces?: Partial<Record<keyof BoxesState, string>>;
  }) {
    latestBoxListProps = props;
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

type CourseFinishedPanelProps = React.ComponentProps<
  typeof import("@/src/screens/flashcards/components/CourseFinishedPanel").CourseFinishedPanel
>;

let latestFinishedPanelProps: CourseFinishedPanelProps | null = null;

jest.mock("@/src/screens/flashcards/components/CourseFinishedPanel", () => ({
  CourseFinishedPanel: (props: CourseFinishedPanelProps) => {
    const { Text: MockText } = require("react-native");
    latestFinishedPanelProps = props;
    return <MockText testID="course-finished-panel">Course finished</MockText>;
  },
}));

const mockedUseSettings = useSettings as jest.Mock;
const mockedUseFlashcardsInteraction = useFlashcardsInteraction as jest.Mock;
const mockedGetCustomFlashcards = getCustomFlashcards as jest.Mock;
const mockedGetCustomReviewedFlashcardIds =
  getCustomReviewedFlashcardIds as jest.Mock;
const mockedGetCourseCompletionSummary =
  getCourseCompletionSummary as jest.Mock;
const mockedGetCourseCompletionRunStartedAt =
  getCourseCompletionRunStartedAt as jest.Mock;

type InteractionState = ReturnType<typeof createInteractionState>;

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

function createInteractionState(
  selectedItem: WordWithTranslations | null,
  overrides: Record<string, unknown> = {},
) {
  return {
    activeBox: "boxOne",
    handleSelectBox: jest.fn(),
    selectedItem,
    answer: "",
    setAnswer: jest.fn(),
    result: null,
    setResult: jest.fn(),
    confirm: jest.fn(),
    reversed: false,
    correction: null,
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
    ...overrides,
  };
}

function renderScreenWithState(
  initialState: InteractionState,
  cards?: WordWithTranslations[],
) {
  let state = initialState;
  if (cards) {
    mockedGetCustomFlashcards.mockResolvedValue(cards);
  }
  mockedUseFlashcardsInteraction.mockImplementation(() => state);
  const screen = render(<Flashcards />);

  const rerenderWithState = async (nextState: InteractionState) => {
    state = nextState;
    screen.rerender(<Flashcards />);
    await act(async () => {
      await Promise.resolve();
    });
  };

  return { ...screen, rerenderWithState };
}

async function flushScreenState() {
  await act(async () => {
    await Promise.resolve();
  });

  act(() => {
    jest.advanceTimersByTime(600);
  });

  await act(async () => {
    await Promise.resolve();
  });
}

describe("FlashcardsScreen UI state regressions", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, "log").mockImplementation(() => {});
    mockCurrentBoxes = createEmptyBoxes();
    mockCurrentUsedWordIds = [];
    latestCardProps = null;
    latestButtonsProps = null;
    latestBoxListProps = null;
    latestFinishedPanelProps = null;
    mockedGetCustomReviewedFlashcardIds.mockResolvedValue([]);
    mockedGetCourseCompletionSummary.mockResolvedValue({
      totalAnswers: 10,
      correctCount: 8,
      wrongCount: 2,
      timeMs: 12 * 60 * 1000,
    });
    mockedGetCourseCompletionRunStartedAt.mockResolvedValue(null);
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
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it("clears selected true false answer after switching to another true_false card", async () => {
    const cardA = makeCard({
      id: 1,
      text: "Sky is blue",
      translations: ["true"],
      type: "true_false",
    });
    const cardB = makeCard({
      id: 2,
      text: "Grass is red",
      translations: ["false"],
      type: "true_false",
    });
    const { rerenderWithState } = renderScreenWithState(
      createInteractionState(cardA),
      [cardA, cardB],
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(latestButtonsProps?.selectedTrueFalseAnswer).toBeNull();

    act(() => {
      latestButtonsProps?.onTrueFalseAnswer(true);
    });

    expect(latestButtonsProps?.selectedTrueFalseAnswer).toBe(true);
    expect(latestButtonsProps?.trueFalseButtonsVariant).toBe("true_false");

    await rerenderWithState(createInteractionState(cardB));

    expect(latestCardProps?.selectedItem?.id).toBe(cardB.id);
    expect(latestButtonsProps?.selectedTrueFalseAnswer).toBeNull();
    expect(latestButtonsProps?.trueFalseButtonsVariant).toBe("true_false");
  });

  it("does not leak display result to the next true_false card", async () => {
    const cardA = makeCard({
      id: 11,
      text: "Earth is round",
      translations: ["true"],
      type: "true_false",
    });
    const cardB = makeCard({
      id: 12,
      text: "Moon is made of cheese",
      translations: ["false"],
      type: "true_false",
    });
    const { rerenderWithState } = renderScreenWithState(
      createInteractionState(cardA),
      [cardA, cardB],
    );

    await act(async () => {
      await Promise.resolve();
    });

    await rerenderWithState(
      createInteractionState(cardA, {
        result: true,
      }),
    );

    expect(latestCardProps?.selectedItem?.id).toBe(cardA.id);
    expect(latestCardProps?.result).toBe(true);

    await rerenderWithState(createInteractionState(cardB));

    expect(latestCardProps?.selectedItem?.id).toBe(cardB.id);
    expect(latestCardProps?.result).toBeNull();
  });

  it("applies a fresh cooldown to a new true_false card without leaving buttons stuck", async () => {
    const cardA = makeCard({
      id: 21,
      text: "Fire is cold",
      translations: ["false"],
      type: "true_false",
    });
    const cardB = makeCard({
      id: 22,
      text: "Water is wet",
      translations: ["true"],
      type: "true_false",
    });
    const { rerenderWithState } = renderScreenWithState(
      createInteractionState(cardA),
      [cardA, cardB],
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(latestButtonsProps?.trueFalseActionsDisabled).toBe(true);

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(latestButtonsProps?.trueFalseActionsDisabled).toBe(false);

    await rerenderWithState(createInteractionState(cardB));

    expect(latestCardProps?.selectedItem?.id).toBe(cardB.id);
    expect(latestButtonsProps?.trueFalseActionsDisabled).toBe(true);

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(latestButtonsProps?.trueFalseActionsDisabled).toBe(false);
  });

  it("resets selected answer and keeps the know_dont_know variant after switching cards", async () => {
    const cardA = makeCard({
      id: 31,
      text: "river",
      translations: ["rzeka"],
      type: "know_dont_know",
    });
    const cardB = makeCard({
      id: 32,
      text: "mountain",
      translations: ["gora"],
      type: "know_dont_know",
    });
    const { rerenderWithState } = renderScreenWithState(
      createInteractionState(cardA),
      [cardA, cardB],
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(latestButtonsProps?.trueFalseButtonsVariant).toBe("know_dont_know");

    act(() => {
      latestButtonsProps?.onTrueFalseAnswer(false);
    });

    expect(latestButtonsProps?.selectedTrueFalseAnswer).toBe(false);

    await rerenderWithState(
      createInteractionState(cardA, {
        result: false,
      }),
    );

    expect(latestCardProps?.result).toBe(false);

    await rerenderWithState(createInteractionState(cardB));

    expect(latestCardProps?.selectedItem?.id).toBe(cardB.id);
    expect(latestCardProps?.result).toBeNull();
    expect(latestButtonsProps?.selectedTrueFalseAnswer).toBeNull();
    expect(latestButtonsProps?.trueFalseButtonsVariant).toBe("know_dont_know");
  });

  it("passes computed box faces down to the box renderer", async () => {
    const cardA = makeCard({
      id: 41,
      text: "sun",
      translations: ["slonce"],
    });

    renderScreenWithState(createInteractionState(cardA), [cardA]);

    await act(async () => {
      await Promise.resolve();
    });

    expect(latestBoxListProps?.faces?.boxOne).toBeDefined();
  });

  it("shows the finished panel when the active course has an exhausted pool", async () => {
    const cardA = makeCard({
      id: 51,
      text: "apple",
      translations: ["jablko"],
    });
    mockCurrentUsedWordIds = [cardA.id];

    const screen = renderScreenWithState(createInteractionState(null), [cardA]);

    await flushScreenState();
    await flushScreenState();
    await flushScreenState();

    expect(screen.getByTestId("course-finished-panel")).toBeTruthy();
    expect(latestFinishedPanelProps?.courseName).toBe("Ang A2");
    expect(latestFinishedPanelProps?.cardsCountLabel).toBe("1");
    expect(latestFinishedPanelProps?.accuracyLabel).toBe("80%");
    expect(latestFinishedPanelProps?.learningTimeLabel).toBe("12 min");
    expect(screen.queryByTestId("flashcards-buttons")).toBeNull();
  });

  it("shows lifetime completion stats on finished panel even when run start exists", async () => {
    const cardA = makeCard({
      id: 52,
      text: "banana",
      translations: ["banan"],
    });
    mockCurrentUsedWordIds = [cardA.id];
    mockedGetCourseCompletionRunStartedAt.mockResolvedValue(999);
    mockedGetCourseCompletionSummary.mockResolvedValueOnce({
      totalAnswers: 10,
      correctCount: 8,
      wrongCount: 2,
      timeMs: 12 * 60 * 1000,
    });

    const screen = renderScreenWithState(createInteractionState(null), [cardA]);

    await flushScreenState();
    await flushScreenState();
    await flushScreenState();

    expect(screen.getByTestId("course-finished-panel")).toBeTruthy();
    expect(latestFinishedPanelProps?.accuracyLabel).toBe("80%");
    expect(latestFinishedPanelProps?.learningTimeLabel).toBe("12 min");
    expect(mockedGetCourseCompletionSummary).toHaveBeenNthCalledWith(1, 7);
    expect(mockedGetCourseCompletionSummary).toHaveBeenCalledTimes(1);
  });

  it("does not show the finished panel when there are still new flashcards to distribute", async () => {
    const cardA = makeCard({
      id: 61,
      text: "pear",
      translations: ["gruszka"],
    });

    const screen = renderScreenWithState(createInteractionState(null), [cardA]);

    await flushScreenState();

    expect(screen.queryByTestId("course-finished-panel")).toBeNull();
  });

  it("can force the finished panel through the debug simulation", async () => {
    const cardA = makeCard({
      id: 62,
      text: "peach",
      translations: ["brzoskwinia"],
    });

    triggerCourseFinishedPreview();
    const screen = renderScreenWithState(createInteractionState(null), [cardA]);

    await flushScreenState();
    await flushScreenState();
    await flushScreenState();

    expect(screen.getByTestId("course-finished-panel")).toBeTruthy();
    expect(screen.queryByTestId("flashcards-buttons")).toBeNull();
    expect(mockCurrentUsedWordIds).toContain(cardA.id);
    expect(mockCurrentBoxes).toEqual(createEmptyBoxes());
  });

  it("debug simulation finishes the active course even when a card is selected", async () => {
    const cardA = makeCard({
      id: 63,
      text: "grape",
      translations: ["winogrono"],
    });
    mockCurrentBoxes = {
      ...createEmptyBoxes(),
      boxOne: [cardA],
    };

    triggerCourseFinishedPreview();
    const screen = renderScreenWithState(createInteractionState(cardA), [cardA]);

    await flushScreenState();
    await flushScreenState();
    await flushScreenState();

    expect(screen.getByTestId("course-finished-panel")).toBeTruthy();
    expect(screen.queryByTestId("flashcards-buttons")).toBeNull();
    expect(mockCurrentUsedWordIds).toContain(cardA.id);
    expect(mockCurrentBoxes).toEqual(createEmptyBoxes());
  });

  it("does not show the finished panel when any box still has cards", async () => {
    const cardA = makeCard({
      id: 71,
      text: "plum",
      translations: ["sliwka"],
    });
    mockCurrentUsedWordIds = [cardA.id];
    mockCurrentBoxes = {
      ...createEmptyBoxes(),
      boxOne: [cardA],
    };

    const screen = renderScreenWithState(createInteractionState(cardA), [cardA]);

    await flushScreenState();

    expect(screen.queryByTestId("course-finished-panel")).toBeNull();
  });

  it("does not show the finished panel while course data is still loading", () => {
    mockedGetCustomFlashcards.mockImplementationOnce(
      () => new Promise(() => undefined),
    );

    const screen = renderScreenWithState(createInteractionState(null));

    expect(screen.queryByTestId("course-finished-panel")).toBeNull();
  });
});
