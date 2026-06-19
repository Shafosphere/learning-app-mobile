import React from "react";
import { act, render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import Flashcards from "@/src/screens/flashcards/FlashcardsScreen/FlashcardsScreen";
import { useSettings } from "@/src/contexts/SettingsContext";
import {
  getCourseCompletionSummary,
  getCustomCourseMasteryProgress,
  getCustomFlashcards,
  getCustomReviewedFlashcardIds,
} from "@/src/db/sqlite/db";
import {
  getCourseCompletionRunStartedAt,
} from "@/src/features/flashcards/courseCompletionRun";
import { triggerCourseFinishedPreview } from "@/src/services/courseFinishedPreview";
import {
  returnFlashcardToUnknown,
  subscribeFlashcardReturnedToUnknown,
} from "@/src/services/returnFlashcardToUnknown";
import { useCoachmarkFlow } from "@/src/hooks/useCoachmarkFlow";
import { useDeviceLayout } from "@/src/hooks/useDeviceLayout";
import { useAutoScaleToFit } from "@/src/hooks/useAutoScaleToFit";
import { useFlashcardsAutoflow } from "@/src/hooks/useFlashcardsAutoflow";
import { useFlashcardsInteraction } from "@/src/hooks/useFlashcardsInteraction";
import type { CardProps } from "@/src/components/card/card-types";
import type { BoxesState, WordWithTranslations } from "@/src/types/boxes";

jest.mock("@/src/contexts/SettingsContext", () => ({
  useSettings: jest.fn(),
}));

jest.mock("@/src/hooks/useDeviceLayout", () => ({
  useDeviceLayout: jest.fn(),
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
    getStatsSnapshot: jest.fn(() => ({ streakDays: 0, shieldCount: 0 })),
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
  getCustomCourseMasteryProgress: jest.fn(() =>
    Promise.resolve({
      cardsCount: 0,
      completedCardsCount: 0,
    }),
  ),
  getCustomFlashcards: jest.fn(() => Promise.resolve([])),
  getCustomReviewedFlashcardIds: jest.fn(() => Promise.resolve([])),
  scheduleCustomReview: jest.fn(() => Promise.resolve(undefined)),
  updateCustomFlashcardHints: jest.fn(() => Promise.resolve(undefined)),
}));

jest.mock("@/src/services/streakProtection", () => ({
  registerProtectedDailyActivity: jest.fn(() =>
    Promise.resolve({ streakDays: 0, shieldCount: 0 })
  ),
}));

jest.mock("@/src/services/returnFlashcardToUnknown", () => ({
  returnFlashcardToUnknown: jest.fn(() => Promise.resolve()),
  subscribeFlashcardReturnedToUnknown: jest.fn(() => jest.fn()),
}));

jest.mock("@/src/features/flashcards/courseCompletionRun", () => ({
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
let mockCurrentRelearningWordIds: number[] = [];

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
    relearningWordIds: [...mockCurrentRelearningWordIds],
    markWordForRelearning: jest.fn((id: number) => {
      mockCurrentRelearningWordIds = Array.from(
        new Set([...mockCurrentRelearningWordIds, id])
      );
    }),
    clearWordForRelearning: jest.fn((id: number) => {
      mockCurrentRelearningWordIds = mockCurrentRelearningWordIds.filter(
        (value) => value !== id
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
    isReady: true,
    isPendingStart: false,
    currentStep: null,
    currentIndex: -1,
    totalSteps: 0,
    canGoBack: false,
    canGoNext: false,
    goBack: jest.fn(),
    goNext: jest.fn(),
    advanceByEvent: jest.fn(),
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
  useLocalSearchParams: jest.fn(() => ({})),
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

const mockFlashcardsScreenStyles = {
  content: { flex: 1 },
  studyStack: { width: "100%" },
  tabletCenteredStudyStack: {
    flex: 1,
    justifyContent: "center",
    width: "100%",
  },
  cardSectionWrapper: { marginBottom: 10 },
  finishedCardSectionWrapper: { flex: 1, minHeight: 0 },
  topButtonsWrapper: { marginBottom: 10 },
  boxesWrapper: { flex: 1, width: "100%" },
  boxesWrapperWithBottomButtons: { marginTop: 8 },
  tabletCompactBoxesWrapper: { flex: 0 },
  boxesViewport: { flex: 1 },
  tabletCompactBoxesViewport: { flex: 0 },
  boxesScrollViewport: { flex: 1 },
  tabletCompactBoxesScrollViewport: { flex: 0 },
  boxesScaledContent: { width: "100%" },
  bottomButtonsDock: { position: "absolute" },
  bottomButtonsWrapper: { marginTop: 4 },
};

jest.mock("@/src/screens/flashcards/FlashcardsScreen/FlashcardsScreen-styles", () => ({
  useStyles: jest.fn(() =>
    new Proxy(mockFlashcardsScreenStyles, {
      get: (target, prop) =>
        typeof prop === "string"
          ? target[prop as keyof typeof target] ?? {}
          : {},
    }),
  ),
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
  horizontalScroll?: boolean;
  layoutWidth?: number;
} | null = null;
let latestBoxCarouselProps: {
  faces?: Partial<Record<keyof BoxesState, string>>;
  layoutWidth?: number;
} | null = null;
let latestPeekProps: {
  onReturnToUnknown?: (cardId: number) => Promise<void>;
} | null = null;
let latestReturnToUnknownListener:
  | ((event: { courseId: number; flashcardId: number }) => void)
  | null = null;

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
    horizontalScroll?: boolean;
    layoutWidth?: number;
  }) {
    latestBoxListProps = props;
    return null;
  };
});

jest.mock("@/src/components/Box/Carousel/BoxCarousel", () => {
  return function BoxCarouselMock(props: {
    faces?: Partial<Record<keyof BoxesState, string>>;
    layoutWidth?: number;
  }) {
    latestBoxCarouselProps = props;
    return null;
  };
});

jest.mock("@/src/components/Box/Peek/FlashcardsPeek", () => {
  return function PeekMock(props: {
    onReturnToUnknown?: (cardId: number) => Promise<void>;
  }) {
    latestPeekProps = props;
    return null;
  };
});

jest.mock("@/src/components/confetti/Confetti", () => {
  return function ConfettiMock() {
    return null;
  };
});

type CourseFinishedPanelProps = React.ComponentProps<
  typeof import("@/src/components/flashcards/CourseFinishedPanel/CourseFinishedPanel").CourseFinishedPanel
>;

let latestFinishedPanelProps: CourseFinishedPanelProps | null = null;

jest.mock("@/src/components/flashcards/CourseFinishedPanel/CourseFinishedPanel", () => ({
  CourseFinishedPanel: (props: CourseFinishedPanelProps) => {
    const { Text: MockText } = require("react-native");
    latestFinishedPanelProps = props;
    return <MockText testID="course-finished-panel">Course finished</MockText>;
  },
}));

const mockedUseSettings = useSettings as jest.Mock;
const mockedUseCoachmarkFlow = useCoachmarkFlow as jest.Mock;
const mockedUseDeviceLayout = useDeviceLayout as jest.Mock;
const mockedUseAutoScaleToFit = useAutoScaleToFit as jest.Mock;
const mockedUseFlashcardsAutoflow = useFlashcardsAutoflow as jest.Mock;
const mockedUseFlashcardsInteraction = useFlashcardsInteraction as jest.Mock;
const mockedGetCustomFlashcards = getCustomFlashcards as jest.Mock;
const mockedGetCustomReviewedFlashcardIds =
  getCustomReviewedFlashcardIds as jest.Mock;
const mockedGetCourseCompletionSummary =
  getCourseCompletionSummary as jest.Mock;
const mockedGetCustomCourseMasteryProgress =
  getCustomCourseMasteryProgress as jest.Mock;
const mockedGetCourseCompletionRunStartedAt =
  getCourseCompletionRunStartedAt as jest.Mock;
const mockedReturnFlashcardToUnknown = returnFlashcardToUnknown as jest.Mock;
const mockedSubscribeFlashcardReturnedToUnknown =
  subscribeFlashcardReturnedToUnknown as jest.Mock;

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

async function flushScreenStateWithoutTimers() {
  await act(async () => {
    await Promise.resolve();
  });

  await act(async () => {
    await Promise.resolve();
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
    mockCurrentRelearningWordIds = [];
    latestCardProps = null;
    latestButtonsProps = null;
    latestBoxListProps = null;
    latestBoxCarouselProps = null;
    latestPeekProps = null;
    latestReturnToUnknownListener = null;
    latestFinishedPanelProps = null;
    mockedUseCoachmarkFlow.mockImplementation(() => ({
      isActive: false,
      hasSeen: true,
      isReady: true,
      isPendingStart: false,
      currentStep: null,
      currentIndex: -1,
      totalSteps: 0,
      canGoBack: false,
      canGoNext: false,
      goBack: jest.fn(),
      goNext: jest.fn(),
      advanceByEvent: jest.fn(),
    }));
    mockedUseDeviceLayout.mockReturnValue({ isSmallPhoneLayout: false });
    mockedUseFlashcardsAutoflow.mockClear();
    mockedGetCustomReviewedFlashcardIds.mockResolvedValue([]);
    mockedGetCourseCompletionSummary.mockResolvedValue({
      totalAnswers: 10,
      correctCount: 8,
      wrongCount: 2,
      timeMs: 12 * 60 * 1000,
    });
    mockedGetCustomCourseMasteryProgress.mockResolvedValue({
      cardsCount: 0,
      completedCardsCount: 0,
    });
    mockedGetCourseCompletionRunStartedAt.mockResolvedValue(null);
    mockedSubscribeFlashcardReturnedToUnknown.mockImplementation(
      (listener: (event: { courseId: number; flashcardId: number }) => void) => {
        latestReturnToUnknownListener = listener;
        return jest.fn();
      },
    );
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

  it("ignores typed card submit while action cooldown is active", async () => {
    const card = makeCard({
      id: 41,
      text: "cat",
      translations: ["kot"],
      type: "text",
    });
    const confirm = jest.fn();
    renderScreenWithState(
      createInteractionState(card, {
        answer: "kot",
        confirm,
      }),
      [card],
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(latestButtonsProps?.confirmDisabled).toBe(true);

    act(() => {
      latestCardProps?.confirm(undefined, "kot");
      latestButtonsProps?.onCardActionsConfirm?.();
    });

    expect(confirm).not.toHaveBeenCalled();

    act(() => {
      jest.runOnlyPendingTimers();
    });

    act(() => {
      latestCardProps?.confirm(undefined, "kot");
    });

    expect(confirm).toHaveBeenCalledWith(undefined, "kot");
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

  it("keeps the classic boxes layout and hint visibility off the small-phone layout", async () => {
    const card = makeCard({
      id: 51,
      text: "wide",
      translations: ["szeroki"],
    });

    renderScreenWithState(createInteractionState(card), [card]);

    await flushScreenState();

    expect(latestBoxListProps).not.toBeNull();
    expect(latestBoxCarouselProps).toBeNull();
    expect(latestCardProps?.hideHints).toBe(false);
  });

  it("keeps classic boxes horizontally scrollable and hides hints on small-phone layouts", async () => {
    mockedUseDeviceLayout.mockReturnValue({ isSmallPhoneLayout: true });
    const card = makeCard({
      id: 52,
      text: "small",
      translations: ["maly"],
    });

    renderScreenWithState(createInteractionState(card), [card]);

    await flushScreenState();

    expect(latestBoxListProps).not.toBeNull();
    expect(latestBoxListProps?.horizontalScroll).toBe(true);
    expect(latestBoxCarouselProps).toBeNull();
    expect(latestCardProps?.hideHints).toBe(true);
  });

  it("keeps carousel boxes on small-phone layouts when carousel is selected", async () => {
    mockedUseDeviceLayout.mockReturnValue({ isSmallPhoneLayout: true });
    mockedUseSettings.mockReturnValue({
      activeCustomCourseId: 7,
      setActiveCustomCourseId: jest.fn(),
      boxesLayout: "carousel",
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
    const card = makeCard({
      id: 53,
      text: "small carousel",
      translations: ["mala karuzela"],
    });

    renderScreenWithState(createInteractionState(card), [card]);

    await flushScreenState();

    expect(latestBoxListProps).toBeNull();
    expect(latestBoxCarouselProps).not.toBeNull();
    expect(mockedUseAutoScaleToFit).toHaveBeenCalledWith({ minScale: 0.3 });
    expect(latestCardProps?.hideHints).toBe(true);
  });

  it("keeps phone layout direct and reserves bottom button space", async () => {
    mockedUseDeviceLayout.mockReturnValue({
      isSmallPhoneLayout: false,
      isTabletLayout: false,
    });
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
      actionButtonsPosition: "bottom",
      setActionButtonsPosition: jest.fn(),
      colors: {
        background: "#fff",
      },
    });
    const card = makeCard({
      id: 54,
      text: "phone",
      translations: ["phone"],
    });

    const screen = renderScreenWithState(createInteractionState(card), [card]);

    await flushScreenState();

    const contentStyle = StyleSheet.flatten(
      screen.getByTestId("flashcards-content").props.style,
    );
    const boxesWrapperStyle = StyleSheet.flatten(
      screen.getByTestId("flashcards-boxes-wrapper").props.style,
    );

    expect(screen.queryByTestId("flashcards-study-stack")).toBeNull();
    expect(contentStyle.paddingBottom).toBeGreaterThanOrEqual(50);
    expect(boxesWrapperStyle.flex).toBe(1);
    expect(mockedUseAutoScaleToFit).toHaveBeenCalledWith({ minScale: 0.648 });
    expect(latestButtonsProps?.contentWidth).toBeUndefined();
    expect(latestBoxListProps?.layoutWidth).toBeUndefined();
  });

  it("centers tablet top-button study content with compact boxes", async () => {
    mockedUseDeviceLayout.mockReturnValue({
      isSmallPhoneLayout: false,
      isTabletLayout: true,
    });
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
    const card = makeCard({
      id: 55,
      text: "tablet",
      translations: ["tablet"],
    });

    const screen = renderScreenWithState(createInteractionState(card), [card]);

    await flushScreenState();

    const contentStyle = StyleSheet.flatten(
      screen.getByTestId("flashcards-content").props.style,
    );
    const studyStackStyle = StyleSheet.flatten(
      screen.getByTestId("flashcards-study-stack").props.style,
    );
    const boxesWrapperStyle = StyleSheet.flatten(
      screen.getByTestId("flashcards-boxes-wrapper").props.style,
    );

    expect(contentStyle.paddingBottom).toBeUndefined();
    expect(studyStackStyle).toMatchObject({
      flex: 1,
      justifyContent: "center",
    });
    expect(boxesWrapperStyle.flex).toBe(0);
    expect(latestButtonsProps?.contentWidth).toEqual(expect.any(Number));
    expect(latestBoxListProps?.layoutWidth).toEqual(expect.any(Number));
  });

  it("reserves bottom button space on tablets to avoid overlap", async () => {
    mockedUseDeviceLayout.mockReturnValue({
      isSmallPhoneLayout: false,
      isTabletLayout: true,
    });
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
      actionButtonsPosition: "bottom",
      setActionButtonsPosition: jest.fn(),
      colors: {
        background: "#fff",
      },
    });
    const card = makeCard({
      id: 56,
      text: "bottom tablet",
      translations: ["bottom tablet"],
    });

    const screen = renderScreenWithState(createInteractionState(card), [card]);

    await flushScreenState();

    const contentStyle = StyleSheet.flatten(
      screen.getByTestId("flashcards-content").props.style,
    );
    const studyStackStyle = StyleSheet.flatten(
      screen.getByTestId("flashcards-study-stack").props.style,
    );
    const boxesWrapperStyle = StyleSheet.flatten(
      screen.getByTestId("flashcards-boxes-wrapper").props.style,
    );

    expect(contentStyle.paddingBottom).toBeGreaterThanOrEqual(50);
    expect(studyStackStyle).toMatchObject({
      flex: 1,
      justifyContent: "center",
    });
    expect(boxesWrapperStyle.flex).toBe(1);
    expect(mockedUseAutoScaleToFit).toHaveBeenCalledWith({ minScale: 0.54 });
  });

  it("starts the hint tutorial instead of editing on the first manual hint tap", async () => {
    const card = makeCard({
      id: 71,
      text: "lemur",
      translations: ["lemur"],
    });
    mockedUseCoachmarkFlow.mockImplementation((params) => ({
      isActive: false,
      hasSeen: params.flowKey === "flashcards-guided",
      isReady: true,
      isPendingStart: false,
      currentStep: null,
      currentIndex: -1,
      totalSteps: 0,
      canGoBack: false,
      canGoNext: false,
      goBack: jest.fn(),
      goNext: jest.fn(),
      advanceByEvent: jest.fn(),
    }));
    renderScreenWithState(createInteractionState(card), [card]);

    await flushScreenState();
    await flushScreenState();
    await flushScreenState();

    let shouldEdit = true;
    act(() => {
      shouldEdit = latestCardProps?.shouldStartHintEditing?.() ?? true;
    });

    expect(shouldEdit).toBe(false);
    await act(async () => {
      await Promise.resolve();
    });
    const hintFlowParams = mockedUseCoachmarkFlow.mock.calls
      .map(([params]) => params)
      .filter((params) => params.flowKey === "flashcards-hint-guided")
      .at(-1);
    expect(hintFlowParams).toMatchObject({
      shouldStart: true,
      storageKey: "@flashcards_hint_tutorial_seen_v1",
    });
  });

  it("does not block hint editing while the hint tutorial visibility is hydrating", async () => {
    const card = makeCard({
      id: 74,
      text: "early",
      translations: ["wczesnie"],
    });
    mockedUseCoachmarkFlow.mockImplementation((params) => ({
      isActive: false,
      hasSeen: true,
      isReady: params.flowKey !== "flashcards-hint-guided",
      isPendingStart: false,
      currentStep: null,
      currentIndex: -1,
      totalSteps: 0,
      canGoBack: false,
      canGoNext: false,
      goBack: jest.fn(),
      goNext: jest.fn(),
      advanceByEvent: jest.fn(),
    }));
    renderScreenWithState(createInteractionState(card), [card]);

    await flushScreenState();
    await flushScreenState();
    await flushScreenState();

    let shouldEdit = false;
    act(() => {
      shouldEdit = latestCardProps?.shouldStartHintEditing?.() ?? false;
    });

    expect(shouldEdit).toBe(true);

    const hintFlowParams = mockedUseCoachmarkFlow.mock.calls
      .map(([params]) => params)
      .filter((params) => params.flowKey === "flashcards-hint-guided")
      .at(-1);
    expect(hintFlowParams?.shouldStart).toBe(false);
  });

  it("requests the hint tutorial after five wrong answers on the same card", async () => {
    const card = makeCard({
      id: 72,
      text: "capital",
      translations: ["Antananarivo"],
    });
    mockedUseCoachmarkFlow.mockImplementation((params) => ({
      isActive: false,
      hasSeen: params.flowKey === "flashcards-guided",
      isReady: true,
      isPendingStart: false,
      currentStep: null,
      currentIndex: -1,
      totalSteps: 0,
      canGoBack: false,
      canGoNext: false,
      goBack: jest.fn(),
      goNext: jest.fn(),
      advanceByEvent: jest.fn(),
    }));
    const { rerenderWithState } = renderScreenWithState(
      createInteractionState(card),
      [card],
    );

    await flushScreenState();
    await flushScreenState();
    await flushScreenState();

    for (let attempt = 0; attempt < 5; attempt++) {
      await rerenderWithState(
        createInteractionState(card, {
          result: false,
        }),
      );
      await rerenderWithState(createInteractionState(card));
    }

    const hintFlowParams = mockedUseCoachmarkFlow.mock.calls
      .map(([params]) => params)
      .filter((params) => params.flowKey === "flashcards-hint-guided")
      .at(-1);
    expect(hintFlowParams?.shouldStart).toBe(true);
  });

  it("does not request the hint tutorial when hints are hidden in late boxes", async () => {
    const card = makeCard({
      id: 73,
      text: "late",
      translations: ["box"],
    });
    mockedUseCoachmarkFlow.mockImplementation((params) => ({
      isActive: false,
      hasSeen: params.flowKey === "flashcards-guided",
      isReady: true,
      isPendingStart: false,
      currentStep: null,
      currentIndex: -1,
      totalSteps: 0,
      canGoBack: false,
      canGoNext: false,
      goBack: jest.fn(),
      goNext: jest.fn(),
      advanceByEvent: jest.fn(),
    }));
    const { rerenderWithState } = renderScreenWithState(
      createInteractionState(card, { activeBox: "boxFour" }),
      [card],
    );

    await flushScreenState();
    await flushScreenState();
    await flushScreenState();

    for (let attempt = 0; attempt < 5; attempt++) {
      await rerenderWithState(
        createInteractionState(card, {
          activeBox: "boxFour",
          result: false,
        }),
      );
      await rerenderWithState(createInteractionState(card, { activeBox: "boxFour" }));
    }

    const hintFlowParams = mockedUseCoachmarkFlow.mock.calls
      .map(([params]) => params)
      .filter((params) => params.flowKey === "flashcards-hint-guided")
      .at(-1);
    expect(hintFlowParams?.shouldStart).toBe(false);
  });

  it("resets the hint tutorial wrong streak after a correct answer on the same card", async () => {
    const card = makeCard({
      id: 75,
      text: "reset",
      translations: ["streak"],
    });
    mockedUseCoachmarkFlow.mockImplementation((params) => ({
      isActive: false,
      hasSeen: params.flowKey === "flashcards-guided",
      isReady: true,
      isPendingStart: false,
      currentStep: null,
      currentIndex: -1,
      totalSteps: 0,
      canGoBack: false,
      canGoNext: false,
      goBack: jest.fn(),
      goNext: jest.fn(),
      advanceByEvent: jest.fn(),
    }));
    const { rerenderWithState } = renderScreenWithState(
      createInteractionState(card),
      [card],
    );

    await flushScreenState();
    await flushScreenState();
    await flushScreenState();

    for (let attempt = 0; attempt < 4; attempt++) {
      await rerenderWithState(
        createInteractionState(card, {
          result: false,
        }),
      );
      await rerenderWithState(createInteractionState(card));
    }
    await rerenderWithState(
      createInteractionState(card, {
        result: true,
      }),
    );
    await rerenderWithState(createInteractionState(card));
    await rerenderWithState(
      createInteractionState(card, {
        result: false,
      }),
    );
    await rerenderWithState(createInteractionState(card));

    const hintFlowParams = mockedUseCoachmarkFlow.mock.calls
      .map(([params]) => params)
      .filter((params) => params.flowKey === "flashcards-hint-guided")
      .at(-1);
    expect(hintFlowParams?.shouldStart).toBe(false);
  });

  it("disables autoflow while the hint tutorial is active", async () => {
    const card = makeCard({
      id: 74,
      text: "auto",
      translations: ["flow"],
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
    mockedUseCoachmarkFlow.mockImplementation((params) => ({
      isActive: params.flowKey === "flashcards-hint-guided",
      hasSeen: true,
      isReady: true,
      isPendingStart: false,
      currentStep: null,
      currentIndex: -1,
      totalSteps: 0,
      canGoBack: false,
      canGoNext: false,
      goBack: jest.fn(),
      goNext: jest.fn(),
      advanceByEvent: jest.fn(),
    }));

    renderScreenWithState(createInteractionState(card), [card]);
    await flushScreenState();

    const autoflowParams = mockedUseFlashcardsAutoflow.mock.calls.at(-1)?.[0];
    expect(autoflowParams).toMatchObject({
      enabled: false,
    });
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

  it("delegates returning a peek card to the shared reset operation", async () => {
    const card = makeCard({ id: 91 });
    renderScreenWithState(createInteractionState(card), [card]);

    await act(async () => {
      await latestPeekProps?.onReturnToUnknown?.(card.id);
    });

    expect(mockedReturnFlashcardToUnknown).toHaveBeenCalledWith({
      courseId: 7,
      flashcardId: card.id,
    });
  });

  it("drops a returned card from live flashcards state", async () => {
    const card = makeCard({ id: 92 });
    const resetInteractionState = jest.fn();
    mockCurrentBoxes.boxOne = [card];
    mockCurrentUsedWordIds = [card.id];
    renderScreenWithState(
      createInteractionState(card, { resetInteractionState }),
      [card],
    );

    act(() => {
      latestReturnToUnknownListener?.({ courseId: 7, flashcardId: card.id });
    });

    expect(mockCurrentBoxes.boxOne).toEqual([]);
    expect(mockCurrentUsedWordIds).toEqual([]);
    expect(resetInteractionState).toHaveBeenCalled();
  });

  it("prepares the finished panel under the loading overlay before fade-out completes", async () => {
    const cardA = makeCard({
      id: 511,
      text: "kiwi",
      translations: ["kiwi"],
    });
    mockCurrentUsedWordIds = [cardA.id];

    const screen = renderScreenWithState(createInteractionState(null), [cardA]);

    await flushScreenStateWithoutTimers();

    expect(screen.getByTestId("course-finished-panel")).toBeTruthy();
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

  it("shows the finished panel when DB mastery says the course is complete", async () => {
    const cardA = makeCard({
      id: 53,
      text: "orange",
      translations: ["pomarancza"],
    });
    mockedGetCustomCourseMasteryProgress.mockResolvedValueOnce({
      cardsCount: 1,
      completedCardsCount: 1,
    });

    const screen = renderScreenWithState(createInteractionState(cardA), [cardA]);

    await flushScreenState();
    await flushScreenState();
    await flushScreenState();

    expect(screen.getByTestId("course-finished-panel")).toBeTruthy();
    expect(screen.queryByTestId("flashcards-buttons")).toBeNull();
  });

  it("does not hide a manually reset card behind historical mastery", async () => {
    const cardA = makeCard({
      id: 54,
      text: "again",
      translations: ["ponownie"],
    });
    mockCurrentRelearningWordIds = [cardA.id];
    mockedGetCustomCourseMasteryProgress.mockResolvedValueOnce({
      cardsCount: 1,
      completedCardsCount: 1,
    });

    const screen = renderScreenWithState(createInteractionState(null), [cardA]);

    await flushScreenState();
    await flushScreenState();
    await flushScreenState();

    expect(screen.queryByTestId("course-finished-panel")).toBeNull();
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
