import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  act,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";
import { TextInput } from "react-native";

import ReviewFlashcardsPlaceholder from "@/src/screens/review/reviewflashcards/reviewflashcards/reviewflashcards";
import {
  advanceCustomReview,
  getCustomFlashcardConsecutiveWrongCount,
  getDueCustomReviewFlashcards,
  logCustomLearningEvent,
  scheduleCustomReview,
} from "@/src/db/sqlite/db";
import { registerProtectedDailyActivity } from "@/src/services/streakProtection";
import { returnFlashcardToUnknown } from "@/src/services/returnFlashcardToUnknown";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useNavbarStats } from "@/src/contexts/NavbarStatsContext";
import { useCoachmarkFlow } from "@/src/hooks/useCoachmarkFlow";
import { useDeviceLayout } from "@/src/hooks/useDeviceLayout";
import useSpellchecking from "@/src/hooks/useSpellchecking";
import { TRUE_FALSE_POST_OK_COOLDOWN_MS } from "@/src/screens/flashcards/FlashcardsScreen/model/FlashcardsScreen.constants";

type ReviewFlashcardsRouteParams = {
  courseId?: string;
  onboarding?: string;
};

const mockedUseLocalSearchParams = jest.fn<ReviewFlashcardsRouteParams, []>(() => ({
  courseId: "77",
}));
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockedUseLocalSearchParams(),
}));

jest.mock("@react-navigation/native", () => ({
  useIsFocused: () => true,
  useFocusEffect: (effect: () => void | (() => void)) => {
    const React = require("react");
    React.useEffect(effect, [effect]);
  },
}));

jest.mock("@/src/contexts/SettingsContext", () => ({
  useSettings: jest.fn(),
}));

jest.mock("@/src/contexts/NavbarStatsContext", () => ({
  useNavbarStats: jest.fn(() => ({
    applyStatBurst: jest.fn(),
    getStatsSnapshot: jest.fn(() => ({ streakDays: 0, shieldCount: 0 })),
  })),
}));

jest.mock("@/src/hooks/useCoachmarkFlow", () => ({
  useCoachmarkFlow: jest.fn(() => ({
    isActive: false,
    isPendingStart: false,
    hasSeen: false,
    isReady: true,
    currentStep: null,
    currentIndex: 0,
    totalSteps: 10,
    canGoBack: false,
    canGoNext: true,
    goBack: jest.fn(),
    goNext: jest.fn(),
    advanceByEvent: jest.fn(() => Promise.resolve(true)),
  })),
}));

jest.mock("@/src/hooks/useDeviceLayout", () => ({
  useDeviceLayout: jest.fn(),
}));

jest.mock("@/src/components/onboarding/CoachmarkLayerPortal", () => ({
  useCoachmarkLayerPortal: jest.fn(),
}));

let latestNudgeModalProps: Record<string, any> | null = null;

jest.mock("@/src/components/nudge/NudgeModal", () => ({
  NudgeModal: (props: Record<string, any>) => {
    latestNudgeModalProps = props;
    if (!props.visible) return null;
    const React = require("react");
    const { View } = require("react-native");
    return <View testID="review-mistake-nudge">{props.children}</View>;
  },
}));

jest.mock("@/src/db/sqlite/db", () => ({
  advanceCustomReview: jest.fn(() =>
    Promise.resolve({ stage: 2, nextReview: Date.now() })
  ),
  getCustomFlashcardConsecutiveWrongCount: jest.fn(() => Promise.resolve(0)),
  getDueCustomReviewFlashcards: jest.fn(() => Promise.resolve([])),
  logCustomLearningEvent: jest.fn(() => Promise.resolve()),
  scheduleCustomReview: jest.fn(() =>
    Promise.resolve({ stage: 1, nextReview: Date.now() })
  ),
}));

jest.mock("@/src/services/streakProtection", () => ({
  registerProtectedDailyActivity: jest.fn(() =>
    Promise.resolve({ streakDays: 0, shieldCount: 0 })
  ),
}));

jest.mock("@/src/services/returnFlashcardToUnknown", () => ({
  returnFlashcardToUnknown: jest.fn(() => Promise.resolve()),
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

jest.mock("@/src/hooks/useAutoResetFlag", () => ({
  useAutoResetFlag: jest.fn(),
}));

jest.mock("@/src/hooks/useKeyboardBottomOffset", () => ({
  useKeyboardBottomOffset: jest.fn(() => ({
    keyboardVisible: false,
    bottomOffset: 0,
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

jest.mock("@/src/utils/trueFalseAnswer", () => ({
  makeTrueFalseHandler: jest.fn(
    ({
      setAnswer,
      confirm,
    }: {
      setAnswer: (value: string) => void;
      confirm: (_selectedTranslation?: string, answerOverride?: string) => void;
    }) =>
      (value: boolean) => {
        const nextAnswer = value ? "true" : "false";
        setAnswer(nextAnswer);
        confirm(undefined, nextAnswer);
      }
  ),
}));

jest.mock("@/src/components/confetti/Confetti", () => {
  return function ConfettiMock() {
    return null;
  };
});

let latestPeekProps: {
  visible?: boolean;
  onReturnToUnknown?: (cardId: number) => Promise<void>;
} | null = null;
let latestBoxCarouselProps: Record<string, unknown> | null = null;
let latestBoxListProps: Record<string, unknown> | null = null;
let latestCardHintProps: Record<string, unknown> | null = null;

jest.mock("@/src/components/Box/Peek/FlashcardsPeek", () => {
  return function FlashcardsPeekMock(props: {
    visible?: boolean;
    onReturnToUnknown?: (cardId: number) => Promise<void>;
  }) {
    latestPeekProps = props;
    return null;
  };
});

jest.mock("@/src/components/Box/Carousel/BoxCarousel", () => {
  return function BoxCarouselMock(props: Record<string, unknown>) {
    latestBoxCarouselProps = props;
    return null;
  };
});

jest.mock("@/src/components/flashcards/FlashcardsButtons", () => ({
  FlashcardsButtons: ({
    onCardActionsConfirm,
    showCardActions,
    onDownload,
    downloadDisabled,
    showTrueFalseActions,
    onTrueFalseAnswer,
    onTrueFalseOk,
    trueFalseActionsMode,
  }: {
    onCardActionsConfirm: () => void;
    showCardActions: boolean;
    onDownload?: () => Promise<void>;
    downloadDisabled?: boolean;
    showTrueFalseActions?: boolean;
    onTrueFalseAnswer?: (value: boolean) => void;
    onTrueFalseOk?: () => void;
    trueFalseActionsMode?: "answer" | "ok";
  }) => {
    const React = require("react");
    const { Pressable, Text, View } = require("react-native");
    return (
      <View>
        {showTrueFalseActions ? (
          <>
            {trueFalseActionsMode === "ok" ? (
              <Pressable testID="true-false-ok-button" onPress={onTrueFalseOk}>
                <Text>TrueFalse OK</Text>
              </Pressable>
            ) : (
              <>
                <Pressable
                  testID="true-answer-button"
                  onPress={() => onTrueFalseAnswer?.(true)}
                >
                  <Text>True</Text>
                </Pressable>
                <Pressable
                  testID="false-answer-button"
                  onPress={() => onTrueFalseAnswer?.(false)}
                >
                  <Text>False</Text>
                </Pressable>
              </>
            )}
          </>
        ) : null}
        {showCardActions ? (
          <Pressable
            testID="download-button"
            onPress={() => onDownload?.()}
            disabled={downloadDisabled}
          >
            <Text>{downloadDisabled ? "Download disabled" : "Download enabled"}</Text>
          </Pressable>
        ) : null}
        {showCardActions ? (
          <Pressable testID="confirm-button" onPress={onCardActionsConfirm}>
            <Text>Confirm</Text>
          </Pressable>
        ) : null}
      </View>
    );
  },
}));

jest.mock("@/src/components/Box/List/BoxList", () => {
  return function BoxListMock({
    boxes,
    handleSelectBox,
    onBoxLongPress,
    horizontalScroll,
  }: {
    boxes: Record<string, Array<{ id: number }>>;
    handleSelectBox: (box: any) => void;
    onBoxLongPress?: (box: any) => void;
    horizontalScroll?: boolean;
  }) {
    latestBoxListProps = { boxes, handleSelectBox, onBoxLongPress, horizontalScroll };
    const React = require("react");
    const { Pressable, Text, View } = require("react-native");
    return (
      <View>
        {Object.entries(boxes).map(([boxName, cards]) => (
          <View key={boxName}>
            <Pressable
              testID={`box-button-${boxName}`}
              onPress={() => handleSelectBox(boxName)}
              onLongPress={() => onBoxLongPress?.(boxName)}
            >
              <Text>{`${boxName}:${cards.length}`}</Text>
            </Pressable>
          </View>
        ))}
      </View>
    );
  };
});

jest.mock("@/src/screens/flashcards/FlashcardsScreen/FlashcardsScreen-styles", () => ({
  useStyles: jest.fn(() => new Proxy({}, { get: () => ({}) })),
}));

jest.mock("@/src/components/card/card-styles", () => ({
  PROMPT_IMAGE_MAX_HEIGHT: 240,
  useStyles: jest.fn(() => new Proxy({}, { get: () => ({}) })),
}));

jest.mock("@/src/components/card/useCardFocusController", () => ({
  useCardFocusController: jest.fn(() => ({
    focusTarget: "none",
    focusRequestId: 0,
    requestFocus: jest.fn(),
    onCorrection1Completed: jest.fn(),
    onHintEditStarted: jest.fn(),
  })),
}));

jest.mock("@/src/components/card/useFocusExecutor", () => ({
  useFocusExecutor: jest.fn(),
}));

jest.mock("@/src/components/card/subcomponents/CardHint", () => ({
  CardHint: (props: Record<string, unknown>) => {
    latestCardHintProps = props;
    const React = require("react");
    const { View } = require("react-native");
    return <View testID="card-hint-section" />;
  },
}));

jest.mock("@expo/vector-icons/Octicons", () => {
  return function OcticonsMock() {
    return null;
  };
});

jest.mock("@edwardloopez/react-native-coachmark", () => ({
  CoachmarkAnchor: ({
    children,
    id,
  }: {
    children: React.ReactNode;
    id?: string;
  }) => {
    const React = require("react");
    const { View } = require("react-native");
    return <View testID={id}>{children}</View>;
  },
}));

jest.mock("react-native-text-ticker", () => {
  return function TextTickerMock({
    children,
  }: {
    children: React.ReactNode;
  }) {
    const React = require("react");
    const { Text } = require("react-native");
    return <Text>{children}</Text>;
  };
});

jest.mock("@/src/components/card/subcomponents/CardMathText", () => ({
  CardMathText: ({
    text,
    textStyle,
  }: {
    text: string;
    textStyle?: any;
  }) => {
    const React = require("react");
    const { Text } = require("react-native");
    return <Text style={textStyle}>{text}</Text>;
  },
  hasMathSegments: jest.fn(() => false),
}));

jest.mock("@/src/components/card/subcomponents/CardTrueFalse", () => ({
  CardTrueFalse: () => null,
}));

jest.mock("@/src/components/card/subcomponents/CardSceneTrueFalse", () => ({
  CardSceneTrueFalse: () => null,
}));

jest.mock("@/src/components/card/subcomponents/PromptImage", () => ({
  PromptImage: ({ uri }: { uri: string }) => {
    const React = require("react");
    const { View } = require("react-native");
    return <View testID={`prompt-image-${uri}`} />;
  },
}));

type ReviewCardRow = {
  id: number;
  frontText: string;
  backText: string;
  answers: string[];
  flipped?: boolean;
  answerOnly?: boolean;
  hintFront?: string | null;
  hintBack?: string | null;
  imageFront?: string | null;
  imageBack?: string | null;
  explanation?: string | null;
  type?: "text" | "true_false" | "know_dont_know";
  stage: number;
  nextReview: number;
};

const mockedUseSettings = useSettings as jest.Mock;
const mockedUseNavbarStats = useNavbarStats as jest.Mock;
const mockedUseCoachmarkFlow = useCoachmarkFlow as jest.Mock;
const mockedUseDeviceLayout = useDeviceLayout as jest.Mock;
const mockedUseSpellchecking = useSpellchecking as jest.Mock;
const mockedGetDueCustomReviewFlashcards =
  getDueCustomReviewFlashcards as jest.Mock;
const mockedGetCustomFlashcardConsecutiveWrongCount =
  getCustomFlashcardConsecutiveWrongCount as jest.Mock;
const mockedRegisterProtectedDailyActivity =
  registerProtectedDailyActivity as jest.Mock;
const mockedLogCustomLearningEvent = logCustomLearningEvent as jest.Mock;
const mockedAdvanceCustomReview = advanceCustomReview as jest.Mock;
const mockedScheduleCustomReview = scheduleCustomReview as jest.Mock;
const mockedReturnFlashcardToUnknown = returnFlashcardToUnknown as jest.Mock;
const CHOOSE_BOX_TEXT = "flashcards.card.emptyScene.chooseBox";

function makeReviewCard(
  overrides: Partial<ReviewCardRow> & Pick<ReviewCardRow, "id" | "frontText">
): ReviewCardRow {
  return {
    id: overrides.id,
    frontText: overrides.frontText,
    backText: overrides.backText ?? `${overrides.frontText}-back`,
    answers: overrides.answers ?? [overrides.backText ?? `${overrides.frontText}-back`],
    flipped: overrides.flipped ?? false,
    answerOnly: overrides.answerOnly ?? false,
    hintFront: overrides.hintFront ?? null,
    hintBack: overrides.hintBack ?? null,
    imageFront: overrides.imageFront ?? null,
    imageBack: overrides.imageBack ?? null,
    explanation: overrides.explanation ?? null,
    type: overrides.type ?? "text",
    stage: overrides.stage ?? 1,
    nextReview: overrides.nextReview ?? Date.now(),
  };
}

function stageToBoxName(stage: number) {
  if (stage <= 0) return "boxZero";
  if (stage === 1) return "boxOne";
  if (stage === 2) return "boxTwo";
  if (stage === 3) return "boxThree";
  if (stage === 4) return "boxFour";
  return "boxFive";
}

function getVisibleTextInputs(screen: ReturnType<typeof render>) {
  return screen
    .UNSAFE_queryAllByType(TextInput)
    .filter((input) => input.props.caretHidden !== true);
}

function isUsingFakeTimers() {
  return (
    jest.isMockFunction(setTimeout) ||
    Object.prototype.hasOwnProperty.call(setTimeout, "clock")
  );
}

async function startReviewFromStage(
  screen: ReturnType<typeof render>,
  stage: number
) {
  const boxName = stageToBoxName(stage);

  await waitFor(() => {
    expect(screen.getByText(new RegExp(`^${boxName}:[1-9]\\d*$`))).not.toBeNull();
  });

  const startedWithFakeTimers = isUsingFakeTimers();
  if (!startedWithFakeTimers) {
    jest.useFakeTimers();
  }

  fireEvent.press(screen.getByTestId(`box-button-${boxName}`));

  await waitFor(() => {
    expect(
      getVisibleTextInputs(screen).length > 0 ||
        screen.queryByTestId("true-answer-button") != null
    ).toBe(true);
  });

  await act(async () => {
    jest.advanceTimersByTime(TRUE_FALSE_POST_OK_COOLDOWN_MS);
    await Promise.resolve();
  });

  if (!startedWithFakeTimers) {
    jest.useRealTimers();
  }
}

async function renderAndForceCorrectionSwitch(
  cards: ReviewCardRow[],
  switchedBox: "boxOne" | "boxTwo" | "boxThree" | "boxFour" | "boxFive"
) {
  mockedGetDueCustomReviewFlashcards.mockResolvedValueOnce(cards);
  const screen = render(<ReviewFlashcardsPlaceholder />);

  await startReviewFromStage(screen, cards[0]?.stage ?? 1);

  const inputs = getVisibleTextInputs(screen);
  await act(async () => {
    fireEvent.changeText(inputs[0], "__wrong_answer__");
  });

  fireEvent.press(screen.getByTestId("confirm-button"));
  fireEvent.press(screen.getByTestId(`box-button-${switchedBox}`));

  return screen;
}

describe("reviewflashcards correction desync regression", () => {
  let applyStatBurstMock: jest.Mock;
  let getStatsSnapshotMock: jest.Mock;

  beforeEach(() => {
    latestPeekProps = null;
    latestNudgeModalProps = null;
    latestBoxCarouselProps = null;
    latestBoxListProps = null;
    latestCardHintProps = null;
    applyStatBurstMock = jest.fn();
    getStatsSnapshotMock = jest.fn(() => ({
      masteredCount: 0,
      streakDays: 0,
      shieldCount: 0,
      promotionsCount: 0,
    }));
    mockedUseNavbarStats.mockReturnValue({
      applyStatBurst: applyStatBurstMock,
      getStatsSnapshot: getStatsSnapshotMock,
    });
    mockedRegisterProtectedDailyActivity.mockResolvedValue({
      streakDays: 0,
      shieldCount: 0,
    });
    mockedUseLocalSearchParams.mockReturnValue({ courseId: "77" });
    mockedUseDeviceLayout.mockReturnValue({ isSmallPhoneLayout: false });
    mockedUseSpellchecking.mockReturnValue((input: string, expected: string) =>
      input.trim().toLowerCase() === expected.trim().toLowerCase()
    );
    mockedUseSettings.mockReturnValue({
      actionButtonsPosition: "top",
      getCustomCourseShowExplanationEnabled: jest.fn(() => false),
      getCustomCourseExplanationOnlyOnWrong: jest.fn(() => false),
      explanationOnlyOnWrong: false,
      showExplanationEnabled: false,
      ignoreDiacriticsInSpellcheck: false,
      flashcardsSuggestionsEnabled: false,
      flashcardsCardSize: "normal",
      flashcardsImageSize: "dynamic",
    });
    mockedUseCoachmarkFlow.mockReturnValue({
      isActive: false,
      isPendingStart: false,
      hasSeen: false,
      isReady: true,
      currentStep: null,
      currentIndex: 0,
      totalSteps: 10,
      canGoBack: false,
      canGoNext: true,
      goBack: jest.fn(),
      goNext: jest.fn(),
      advanceByEvent: jest.fn(() => Promise.resolve(true)),
    });
    mockedGetCustomFlashcardConsecutiveWrongCount.mockResolvedValue(0);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("shows both prompt at the top and correction target at the bottom for a normal card in correction mode", async () => {
    const sourceCard = makeReviewCard({
      id: 31,
      frontText: "cat",
      backText: "kot",
      answers: ["kot"],
      stage: 1,
      flipped: false,
    });

    mockedGetDueCustomReviewFlashcards.mockResolvedValueOnce([sourceCard]);
    const screen = render(<ReviewFlashcardsPlaceholder />);

    await startReviewFromStage(screen, sourceCard.stage);

    await act(async () => {
      fireEvent.changeText(getVisibleTextInputs(screen)[0], "__wrong_answer__");
    });

    fireEvent.press(screen.getByTestId("confirm-button"));

    await waitFor(() => {
      expect(screen.queryByText("cat")).not.toBeNull();
      expect(screen.queryByText("kot")).not.toBeNull();
    });
  });

  it("does not write flashcards box snapshots while answering review cards", async () => {
    mockedGetDueCustomReviewFlashcards.mockResolvedValueOnce([
      makeReviewCard({
        id: 901,
        frontText: "cat",
        backText: "kot",
        answers: ["kot"],
        stage: 1,
      }),
    ]);

    const screen = render(<ReviewFlashcardsPlaceholder />);

    await startReviewFromStage(screen, 1);

    await act(async () => {
      fireEvent.changeText(getVisibleTextInputs(screen)[0], "kot");
    });
    fireEvent.press(screen.getByTestId("confirm-button"));

    await waitFor(() => {
      expect(mockedAdvanceCustomReview).toHaveBeenCalledWith(901, 77);
    });

    const snapshotWrites = (AsyncStorage.setItem as jest.Mock).mock.calls.filter(
      ([key]) =>
        typeof key === "string" &&
        (key.startsWith("boxes:") || key.startsWith("customBoxes:"))
    );
    expect(snapshotWrites).toHaveLength(0);
    expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
  });

  it("keeps normal correction bound to the original translation after switching to a reversed foreign card", async () => {
    const sourceCard = makeReviewCard({
      id: 1,
      frontText: "cat",
      backText: "kot",
      answers: ["kot"],
      stage: 1,
      flipped: false,
    });
    const foreignCard = makeReviewCard({
      id: 2,
      frontText: "dog",
      backText: "pies",
      answers: ["pies"],
      stage: 2,
      flipped: true,
    });

    const screen = await renderAndForceCorrectionSwitch(
      [sourceCard, foreignCard],
      "boxTwo"
    );

    await waitFor(() => {
      expect(screen.queryByText("kot")).not.toBeNull();
      expect(screen.queryByText("cat")).not.toBeNull();
      expect(screen.queryByText("pies")).toBeNull();
    });
  });

  it("keeps reversed correction bound to the original awers after switching to a normal foreign card", async () => {
    const sourceCard = makeReviewCard({
      id: 11,
      frontText: "cat",
      backText: "kot",
      answers: ["kot"],
      stage: 1,
      flipped: true,
    });
    const foreignCard = makeReviewCard({
      id: 12,
      frontText: "dog",
      backText: "pies",
      answers: ["pies"],
      stage: 2,
      flipped: false,
    });

    const screen = await renderAndForceCorrectionSwitch(
      [sourceCard, foreignCard],
      "boxTwo"
    );

    await waitFor(() => {
      expect(screen.queryByText("cat")).not.toBeNull();
      expect(screen.queryByText("kot")).not.toBeNull();
      expect(screen.queryByText("pies")).toBeNull();
    });
  });

  it("keeps answer-only and multi-answer correction tied to the source card after switching boxes", async () => {
    const sourceCard = makeReviewCard({
      id: 21,
      frontText: "cat",
      backText: "kot",
      answers: ["kot", "kotek"],
      stage: 1,
      answerOnly: true,
    });
    const foreignCard = makeReviewCard({
      id: 22,
      frontText: "dog",
      backText: "pies",
      answers: ["pies"],
      stage: 2,
      flipped: true,
    });

    const screen = await renderAndForceCorrectionSwitch(
      [sourceCard, foreignCard],
      "boxTwo"
    );

    await waitFor(() => {
      expect(screen.queryByText("kot")).not.toBeNull();
      expect(screen.queryByText("cat")).not.toBeNull();
      expect(screen.queryByText("kotek")).toBeNull();
      expect(screen.queryByText("pies")).toBeNull();
    });
  });

  it("loads the full due pool and exposes stage zero in the first visible box", async () => {
    const cards = Array.from({ length: 30 }, (_, index) =>
      makeReviewCard({
        id: index + 1,
        frontText: `card-${index + 1}`,
        backText: `answer-${index + 1}`,
        answers: [`answer-${index + 1}`],
        stage: 0,
      })
    );

    mockedGetDueCustomReviewFlashcards.mockResolvedValueOnce(cards);
    const screen = render(<ReviewFlashcardsPlaceholder />);

    await waitFor(() => {
      expect(screen.getByText("boxZero:30")).not.toBeNull();
    });

    expect(mockedGetDueCustomReviewFlashcards).toHaveBeenCalledWith(77);
    expect(screen.getByText("boxOne:0")).not.toBeNull();
  });

  it("distributes due review cards into exact boxes by review stage", async () => {
    mockedGetDueCustomReviewFlashcards.mockResolvedValueOnce([
      makeReviewCard({
        id: 810,
        frontText: "stage-zero",
        stage: 0,
      }),
      makeReviewCard({
        id: 811,
        frontText: "stage-one",
        stage: 1,
      }),
      makeReviewCard({
        id: 812,
        frontText: "stage-two",
        stage: 2,
      }),
      makeReviewCard({
        id: 815,
        frontText: "stage-five",
        stage: 5,
      }),
      makeReviewCard({
        id: 819,
        frontText: "stage-overflow",
        stage: 9,
      }),
    ]);

    const screen = render(<ReviewFlashcardsPlaceholder />);

    await waitFor(() => {
      expect(screen.getByText("boxZero:1")).not.toBeNull();
      expect(screen.getByText("boxOne:1")).not.toBeNull();
      expect(screen.getByText("boxTwo:1")).not.toBeNull();
      expect(screen.getByText("boxThree:0")).not.toBeNull();
      expect(screen.getByText("boxFour:0")).not.toBeNull();
      expect(screen.getByText("boxFive:2")).not.toBeNull();
    });
  });

  it("keeps classic boxes horizontally scrollable on small-phone layouts", async () => {
    mockedUseDeviceLayout.mockReturnValue({ isSmallPhoneLayout: true });
    mockedGetDueCustomReviewFlashcards.mockResolvedValueOnce([
      makeReviewCard({
        id: 605,
        frontText: "cat",
        backText: "kot",
        answers: ["kot"],
        stage: 1,
      }),
    ]);

    render(<ReviewFlashcardsPlaceholder />);

    await waitFor(() => {
      expect(latestBoxListProps).not.toBeNull();
    });

    expect(latestBoxListProps?.horizontalScroll).toBe(true);
    expect(latestBoxCarouselProps).toBeNull();
  });

  it("shows the hint section on normal-phone review layouts", async () => {
    mockedUseDeviceLayout.mockReturnValue({ isSmallPhoneLayout: false });
    mockedGetDueCustomReviewFlashcards.mockResolvedValueOnce([
      makeReviewCard({
        id: 606,
        frontText: "dog",
        backText: "pies",
        answers: ["pies"],
        stage: 1,
      }),
    ]);

    render(<ReviewFlashcardsPlaceholder />);

    await waitFor(() => {
      expect(latestCardHintProps).not.toBeNull();
    });
    expect(latestCardHintProps?.onHintUpdate).toBeUndefined();
  });

  it("hides the hint section on small-phone review layouts", async () => {
    mockedUseDeviceLayout.mockReturnValue({ isSmallPhoneLayout: true });
    mockedGetDueCustomReviewFlashcards.mockResolvedValueOnce([
      makeReviewCard({
        id: 607,
        frontText: "bird",
        backText: "ptak",
        answers: ["ptak"],
        stage: 1,
      }),
    ]);

    render(<ReviewFlashcardsPlaceholder />);

    await waitFor(() => {
      expect(latestBoxListProps).not.toBeNull();
    });
    expect(latestCardHintProps).toBeNull();
  });

  it("returns a peeked card to unknown without scheduling it at stage zero", async () => {
    mockedGetDueCustomReviewFlashcards.mockResolvedValueOnce([
      makeReviewCard({
        id: 603,
        frontText: "cat",
        backText: "kot",
        answers: ["kot"],
        stage: 1,
      }),
    ]);
    const screen = render(<ReviewFlashcardsPlaceholder />);

    await waitFor(() => {
      expect(screen.getByText("boxOne:1")).toBeTruthy();
    });
    fireEvent(screen.getByTestId("box-button-boxOne"), "longPress");

    await act(async () => {
      await latestPeekProps?.onReturnToUnknown?.(603);
    });

    expect(mockedReturnFlashcardToUnknown).toHaveBeenCalledWith({
      courseId: 77,
      flashcardId: 603,
    });
    expect(mockedScheduleCustomReview).not.toHaveBeenCalled();
    expect(screen.getByText("boxOne:0")).toBeTruthy();
    expect(latestPeekProps?.visible).toBe(false);
  });

  it("waits for a pending review advancement before returning a peeked card to unknown", async () => {
    let resolveAdvance!: (value: { stage: number; nextReview: number }) => void;
    mockedAdvanceCustomReview.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveAdvance = resolve;
        }),
    );
    mockedGetDueCustomReviewFlashcards.mockResolvedValueOnce([
      makeReviewCard({
        id: 604,
        frontText: "cat",
        backText: "kot",
        answers: ["kot"],
        stage: 1,
      }),
    ]);
    const screen = render(<ReviewFlashcardsPlaceholder />);

    await startReviewFromStage(screen, 1);
    await act(async () => {
      fireEvent.changeText(getVisibleTextInputs(screen)[0], "kot");
    });
    fireEvent.press(screen.getByTestId("confirm-button"));

    await waitFor(() => {
      expect(mockedAdvanceCustomReview).toHaveBeenCalledWith(604, 77);
    });
    fireEvent(screen.getByTestId("box-button-boxOne"), "longPress");

    let resetPromise: Promise<void> | undefined;
    act(() => {
      resetPromise = latestPeekProps?.onReturnToUnknown?.(604);
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockedReturnFlashcardToUnknown).not.toHaveBeenCalled();

    await act(async () => {
      resolveAdvance({ stage: 2, nextReview: Date.now() });
      await resetPromise;
    });

    expect(mockedReturnFlashcardToUnknown).toHaveBeenCalledWith({
      courseId: 77,
      flashcardId: 604,
    });
    expect(mockedAdvanceCustomReview.mock.invocationCallOrder[0]).toBeLessThan(
      mockedReturnFlashcardToUnknown.mock.invocationCallOrder[0],
    );
  });

  it("starts the review onboarding only when opened from review courses and cards are available", async () => {
    mockedUseLocalSearchParams.mockReturnValue({
      courseId: "77",
      onboarding: "review-flashcards",
    });
    mockedGetDueCustomReviewFlashcards.mockResolvedValueOnce([
      makeReviewCard({
        id: 101,
        frontText: "cat",
        backText: "kot",
        answers: ["kot"],
        stage: 1,
      }),
    ]);

    render(<ReviewFlashcardsPlaceholder />);

    await waitFor(() => {
      expect(mockedUseCoachmarkFlow).toHaveBeenCalled();
    });

    const lastCall = mockedUseCoachmarkFlow.mock.calls.at(-1)?.[0];
    expect(lastCall?.shouldStart).toBe(true);
    expect(lastCall?.storageKey).toBe("@review_flashcards_intro_seen_v1");
  });

  it("does not start the review onboarding without the handoff param or when there are no due cards", async () => {
    mockedGetDueCustomReviewFlashcards.mockResolvedValueOnce([]);

    render(<ReviewFlashcardsPlaceholder />);

    await waitFor(() => {
      expect(mockedUseCoachmarkFlow).toHaveBeenCalled();
    });

    const withoutParam = mockedUseCoachmarkFlow.mock.calls.at(-1)?.[0];
    expect(withoutParam?.shouldStart).toBe(false);

    jest.clearAllMocks();
    mockedUseLocalSearchParams.mockReturnValue({
      courseId: "77",
      onboarding: "review-flashcards",
    });
    mockedUseSettings.mockReturnValue({
      actionButtonsPosition: "top",
      getCustomCourseShowExplanationEnabled: jest.fn(() => false),
      getCustomCourseExplanationOnlyOnWrong: jest.fn(() => false),
      explanationOnlyOnWrong: false,
      showExplanationEnabled: false,
      ignoreDiacriticsInSpellcheck: false,
      flashcardsSuggestionsEnabled: false,
      flashcardsCardSize: "normal",
      flashcardsImageSize: "dynamic",
    });
    mockedUseCoachmarkFlow.mockReturnValue({
      isActive: false,
      isPendingStart: false,
      hasSeen: false,
      isReady: true,
      currentStep: null,
      currentIndex: 0,
      totalSteps: 10,
      canGoBack: false,
      canGoNext: true,
      goBack: jest.fn(),
      goNext: jest.fn(),
      advanceByEvent: jest.fn(() => Promise.resolve(true)),
    });
    mockedGetDueCustomReviewFlashcards.mockResolvedValueOnce([]);

    render(<ReviewFlashcardsPlaceholder />);

    await waitFor(() => {
      expect(mockedUseCoachmarkFlow).toHaveBeenCalled();
    });

    const withoutCards = mockedUseCoachmarkFlow.mock.calls.at(-1)?.[0];
    expect(withoutCards?.shouldStart).toBe(false);
  });

  it("renders dedicated review coachmark anchors for card, buttons and boxes", async () => {
    mockedGetDueCustomReviewFlashcards.mockResolvedValueOnce([
      makeReviewCard({
        id: 102,
        frontText: "cat",
        backText: "kot",
        answers: ["kot"],
        stage: 1,
      }),
    ]);

    const screen = render(<ReviewFlashcardsPlaceholder />);

    await waitFor(() => {
      expect(screen.getByTestId("review-flashcards-bubble-anchor")).toBeTruthy();
      expect(screen.getByTestId("review-flashcards-card-section")).toBeTruthy();
      expect(screen.getByTestId("review-flashcards-buttons-section")).toBeTruthy();
      expect(screen.getByTestId("review-flashcards-boxes-wrapper")).toBeTruthy();
      expect(screen.getByTestId("review-flashcards-boxes-section")).toBeTruthy();
    });
  });

  it("shows only the answer input during correction for flipped image prompt cards", async () => {
    mockedGetDueCustomReviewFlashcards.mockResolvedValueOnce([
      makeReviewCard({
        id: 103,
        frontText: "",
        backText: "Andora",
        answers: ["Andora"],
        imageFront: "ad.svg",
        flipped: true,
        stage: 2,
      }),
    ]);

    const screen = render(<ReviewFlashcardsPlaceholder />);

    await startReviewFromStage(screen, 2);

    await act(async () => {
      fireEvent.changeText(getVisibleTextInputs(screen)[0], "__wrong_answer__");
    });
    fireEvent.press(screen.getByTestId("confirm-button"));

    await waitFor(() => {
      const correctionInputs = getVisibleTextInputs(screen);
      expect(correctionInputs).toHaveLength(1);
      expect(correctionInputs[0].props.value).toBe("");
      expect(screen.queryByText("Andora")).not.toBeNull();
    });
  });

  it("does not auto-activate a review box after loading the session", async () => {
    mockedGetDueCustomReviewFlashcards.mockResolvedValueOnce([
      makeReviewCard({
        id: 111,
        frontText: "cat",
        backText: "kot",
        answers: ["kot"],
        stage: 1,
      }),
    ]);

    const screen = render(<ReviewFlashcardsPlaceholder />);

    await waitFor(() => {
      expect(screen.getByText(CHOOSE_BOX_TEXT)).not.toBeNull();
    });

    expect(getVisibleTextInputs(screen)).toHaveLength(0);
  });

  it("keeps the add flashcards button disabled on the review screen", async () => {
    mockedGetDueCustomReviewFlashcards.mockResolvedValueOnce([
      makeReviewCard({
        id: 101,
        frontText: "cat",
        backText: "kot",
        answers: ["kot"],
        stage: 0,
      }),
    ]);

    const screen = render(<ReviewFlashcardsPlaceholder />);

    await waitFor(() => {
      expect(screen.getByTestId("download-button")).not.toBeNull();
    });

    expect(screen.getByText("Download disabled")).not.toBeNull();
  });

  it("removes a correctly answered card from the session and shows the empty state", async () => {
    jest.useFakeTimers();
    mockedAdvanceCustomReview.mockResolvedValueOnce({
      stage: 5,
      nextReview: Date.now() + 60 * 24 * 60 * 60 * 1000,
    });
    mockedGetDueCustomReviewFlashcards.mockResolvedValueOnce([
      makeReviewCard({
        id: 301,
        frontText: "cat",
        backText: "kot",
        answers: ["kot"],
        stage: 4,
      }),
    ]);

    const screen = render(<ReviewFlashcardsPlaceholder />);

    await startReviewFromStage(screen, 4);

    await act(async () => {
      fireEvent.changeText(getVisibleTextInputs(screen)[0], "kot");
    });

    fireEvent.press(screen.getByTestId("confirm-button"));

    await act(async () => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(screen.getByText(CHOOSE_BOX_TEXT)).not.toBeNull();
    });

    expect(mockedAdvanceCustomReview).toHaveBeenCalledWith(301, 77);
    expect(screen.getByText("boxFour:0")).not.toBeNull();
    expect(screen.getByText("boxFive:0")).not.toBeNull();
    jest.useRealTimers();
  });

  it("demotes a corrected wrong answer in DB and does not requeue it into the current session", async () => {
    mockedScheduleCustomReview.mockResolvedValueOnce({
      stage: 0,
      nextReview: Date.now() + 2 * 24 * 60 * 60 * 1000,
    });
    mockedGetDueCustomReviewFlashcards.mockResolvedValueOnce([
      makeReviewCard({
        id: 401,
        frontText: "cat",
        backText: "kot",
        answers: ["kot"],
        stage: 1,
      }),
    ]);

    const screen = render(<ReviewFlashcardsPlaceholder />);

    await startReviewFromStage(screen, 1);

    await act(async () => {
      fireEvent.changeText(getVisibleTextInputs(screen)[0], "__wrong_answer__");
    });

    fireEvent.press(screen.getByTestId("confirm-button"));

    await waitFor(() => {
      expect(screen.queryByText("cat")).not.toBeNull();
      expect(screen.queryByText("kot")).not.toBeNull();
    });

    const correctionInputs = getVisibleTextInputs(screen);
    await act(async () => {
      fireEvent.changeText(correctionInputs[0], "kot");
    });

    await waitFor(() => {
      expect(mockedScheduleCustomReview).toHaveBeenCalledWith(401, 77, 0);
      expect(screen.getByText(CHOOSE_BOX_TEXT)).not.toBeNull();
    });

    expect(screen.getByText("boxOne:0")).not.toBeNull();
    expect(screen.getByText("boxZero:0")).not.toBeNull();
  });

  it("keeps correction open for a fuzzy second-to-last-letter match", async () => {
    mockedUseSpellchecking.mockReturnValue((input: string, expected: string) => {
      const normalizedInput = input.trim().toLowerCase();
      const normalizedExpected = expected.trim().toLowerCase();
      if (normalizedInput === normalizedExpected) return true;
      return (
        normalizedExpected.startsWith(normalizedInput) &&
        normalizedExpected.length - normalizedInput.length === 1
      );
    });
    mockedGetDueCustomReviewFlashcards.mockResolvedValueOnce([
      makeReviewCard({
        id: 402,
        frontText: "cat",
        backText: "kot",
        answers: ["kot"],
        stage: 1,
      }),
    ]);

    const screen = render(<ReviewFlashcardsPlaceholder />);

    await startReviewFromStage(screen, 1);

    await act(async () => {
      fireEvent.changeText(getVisibleTextInputs(screen)[0], "__wrong_answer__");
    });
    fireEvent.press(screen.getByTestId("confirm-button"));

    await waitFor(() => {
      expect(screen.queryByText("cat")).not.toBeNull();
      expect(screen.queryByText("kot")).not.toBeNull();
    });

    await act(async () => {
      fireEvent.changeText(getVisibleTextInputs(screen)[0], "ko");
    });

    expect(mockedScheduleCustomReview).not.toHaveBeenCalled();
    expect(getVisibleTextInputs(screen)[0].props.value).toBe("ko");
    expect(screen.queryByText("cat")).not.toBeNull();
    expect(screen.queryByText(CHOOSE_BOX_TEXT)).toBeNull();

    await act(async () => {
      fireEvent.changeText(getVisibleTextInputs(screen)[0], "kot");
    });

    await waitFor(() => {
      expect(mockedScheduleCustomReview).toHaveBeenCalledWith(402, 77, 0);
    });
  });

  it("shows the mistake nudge only after typed correction is completed and can return the card to unknown", async () => {
    mockedGetCustomFlashcardConsecutiveWrongCount.mockResolvedValueOnce(3);
    mockedGetDueCustomReviewFlashcards.mockResolvedValueOnce([
      makeReviewCard({
        id: 721,
        frontText: "cat",
        backText: "kot",
        answers: ["kot"],
        stage: 1,
      }),
    ]);

    const screen = render(<ReviewFlashcardsPlaceholder />);

    await startReviewFromStage(screen, 1);

    await act(async () => {
      fireEvent.changeText(getVisibleTextInputs(screen)[0], "__wrong_answer__");
    });
    fireEvent.press(screen.getByTestId("confirm-button"));

    await waitFor(() => {
      expect(screen.queryByText("cat")).not.toBeNull();
      expect(screen.queryByText("kot")).not.toBeNull();
    });
    expect(latestNudgeModalProps?.visible).not.toBe(true);

    await act(async () => {
      fireEvent.changeText(getVisibleTextInputs(screen)[0], "kot");
    });

    await waitFor(() => {
      expect(latestNudgeModalProps?.visible).toBe(true);
      expect(screen.getByTestId("review-mistake-nudge")).toBeTruthy();
      expect(screen.queryAllByText("cat").length).toBeGreaterThan(0);
      expect(screen.queryAllByText("kot").length).toBeGreaterThan(0);
    });

    await act(async () => {
      await latestNudgeModalProps?.onConfirm?.();
    });

    await waitFor(() => {
      expect(mockedReturnFlashcardToUnknown).toHaveBeenCalledWith({
        courseId: 77,
        flashcardId: 721,
      });
    });
    expect(mockedScheduleCustomReview).not.toHaveBeenCalled();
    expect(screen.getByText("boxOne:0")).not.toBeNull();
  });

  it("keeps reviewing from the mistake nudge by scheduling the normal stage-zero demotion", async () => {
    mockedGetCustomFlashcardConsecutiveWrongCount.mockResolvedValueOnce(3);
    mockedGetDueCustomReviewFlashcards.mockResolvedValueOnce([
      makeReviewCard({
        id: 722,
        frontText: "dog",
        backText: "pies",
        answers: ["pies"],
        stage: 1,
      }),
    ]);

    const screen = render(<ReviewFlashcardsPlaceholder />);

    await startReviewFromStage(screen, 1);

    await act(async () => {
      fireEvent.changeText(getVisibleTextInputs(screen)[0], "__wrong_answer__");
    });
    fireEvent.press(screen.getByTestId("confirm-button"));

    await act(async () => {
      fireEvent.changeText(getVisibleTextInputs(screen)[0], "pies");
    });

    await waitFor(() => {
      expect(latestNudgeModalProps?.visible).toBe(true);
    });

    act(() => {
      latestNudgeModalProps?.onSecondaryPress?.();
    });

    await waitFor(() => {
      expect(mockedScheduleCustomReview).toHaveBeenCalledWith(722, 77, 0);
    });
    expect(mockedReturnFlashcardToUnknown).not.toHaveBeenCalled();
    expect(screen.getByText("boxOne:0")).not.toBeNull();
    expect(screen.getByText("boxZero:0")).not.toBeNull();
  });

  it("does not show the mistake nudge on the second consecutive wrong answer", async () => {
    mockedGetCustomFlashcardConsecutiveWrongCount.mockResolvedValueOnce(2);
    mockedGetDueCustomReviewFlashcards.mockResolvedValueOnce([
      makeReviewCard({
        id: 723,
        frontText: "bird",
        backText: "ptak",
        answers: ["ptak"],
        stage: 1,
      }),
    ]);

    const screen = render(<ReviewFlashcardsPlaceholder />);

    await startReviewFromStage(screen, 1);

    await act(async () => {
      fireEvent.changeText(getVisibleTextInputs(screen)[0], "__wrong_answer__");
    });
    fireEvent.press(screen.getByTestId("confirm-button"));

    await act(async () => {
      fireEvent.changeText(getVisibleTextInputs(screen)[0], "ptak");
    });

    await waitFor(() => {
      expect(mockedScheduleCustomReview).toHaveBeenCalledWith(723, 77, 0);
    });
    expect(latestNudgeModalProps?.visible).not.toBe(true);
  });

  it("shows the mistake nudge again on the sixth consecutive wrong answer", async () => {
    mockedGetCustomFlashcardConsecutiveWrongCount.mockResolvedValueOnce(6);
    mockedGetDueCustomReviewFlashcards.mockResolvedValueOnce([
      makeReviewCard({
        id: 724,
        frontText: "fish",
        backText: "ryba",
        answers: ["ryba"],
        stage: 1,
      }),
    ]);

    const screen = render(<ReviewFlashcardsPlaceholder />);

    await startReviewFromStage(screen, 1);

    await act(async () => {
      fireEvent.changeText(getVisibleTextInputs(screen)[0], "__wrong_answer__");
    });
    fireEvent.press(screen.getByTestId("confirm-button"));

    await act(async () => {
      fireEvent.changeText(getVisibleTextInputs(screen)[0], "ryba");
    });

    await waitFor(() => {
      expect(latestNudgeModalProps?.visible).toBe(true);
    });
  });

  it("shows the mistake nudge for true-false cards only after the feedback delay", async () => {
    jest.useFakeTimers();
    mockedGetCustomFlashcardConsecutiveWrongCount.mockResolvedValueOnce(3);
    mockedGetDueCustomReviewFlashcards.mockResolvedValueOnce([
      makeReviewCard({
        id: 725,
        frontText: "Sun rises in the east",
        backText: "true",
        answers: ["true"],
        type: "true_false",
        stage: 1,
      }),
    ]);

    const screen = render(<ReviewFlashcardsPlaceholder />);

    await startReviewFromStage(screen, 1);

    fireEvent.press(screen.getByTestId("false-answer-button"));
    expect(latestNudgeModalProps?.visible).not.toBe(true);
    expect(getVisibleTextInputs(screen)).toHaveLength(0);

    await act(async () => {
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(latestNudgeModalProps?.visible).toBe(true);
    });
    expect(mockedScheduleCustomReview).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it("never schedules a long timeout for a far-future review interval", async () => {
    jest.useFakeTimers();
    const timeoutSpy = jest.spyOn(global, "setTimeout");
    mockedAdvanceCustomReview.mockResolvedValueOnce({
      stage: 5,
      nextReview: Date.now() + 80 * 24 * 60 * 60 * 1000,
    });
    mockedGetDueCustomReviewFlashcards.mockResolvedValueOnce([
      makeReviewCard({
        id: 501,
        frontText: "planet",
        backText: "planeta",
        answers: ["planeta"],
        stage: 4,
      }),
    ]);

    const screen = render(<ReviewFlashcardsPlaceholder />);

    await startReviewFromStage(screen, 4);

    await act(async () => {
      fireEvent.changeText(getVisibleTextInputs(screen)[0], "planeta");
    });

    fireEvent.press(screen.getByTestId("confirm-button"));

    const longTimeoutCalls = timeoutSpy.mock.calls.filter(([, delay]) => {
      return typeof delay === "number" && delay > 2_147_483_647;
    });

    expect(longTimeoutCalls).toHaveLength(0);

    timeoutSpy.mockRestore();
    jest.useRealTimers();
  });

  it("logs a single ok event with duration and current box for a correct answer", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-04-21T10:00:00.000Z"));
    mockedGetDueCustomReviewFlashcards.mockResolvedValueOnce([
      makeReviewCard({
        id: 601,
        frontText: "cat",
        backText: "kot",
        answers: ["kot"],
        stage: 4,
      }),
    ]);

    const screen = render(<ReviewFlashcardsPlaceholder />);

    await startReviewFromStage(screen, 4);

    await act(async () => {
      jest.setSystemTime(new Date("2026-04-21T10:00:04.000Z"));
      fireEvent.changeText(getVisibleTextInputs(screen)[0], "kot");
    });

    fireEvent.press(screen.getByTestId("confirm-button"));

    await waitFor(() => {
      expect(mockedLogCustomLearningEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          flashcardId: 601,
          courseId: 77,
          box: "boxFour",
          result: "ok",
        })
      );
    });
    const loggedEvent = mockedLogCustomLearningEvent.mock.calls[0]?.[0];
    expect(loggedEvent).toEqual(
      expect.objectContaining({
        flashcardId: 601,
        courseId: 77,
        box: "boxFour",
        result: "ok",
      })
    );
    expect(loggedEvent?.durationMs).toBeGreaterThanOrEqual(3000);
    expect(loggedEvent?.durationMs).toBeLessThanOrEqual(4000);
    expect(mockedLogCustomLearningEvent).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it("applies promotion and streak burst after a correct promotion answer", async () => {
    mockedRegisterProtectedDailyActivity.mockResolvedValueOnce({
      streakDays: 1,
      shieldCount: 1,
    });
    mockedGetDueCustomReviewFlashcards.mockResolvedValueOnce([
      makeReviewCard({
        id: 611,
        frontText: "cat",
        backText: "kot",
        answers: ["kot"],
        stage: 4,
      }),
    ]);

    const screen = render(<ReviewFlashcardsPlaceholder />);

    await startReviewFromStage(screen, 4);

    await act(async () => {
      fireEvent.changeText(getVisibleTextInputs(screen)[0], "kot");
    });

    fireEvent.press(screen.getByTestId("confirm-button"));

    await waitFor(() => {
      expect(applyStatBurstMock).toHaveBeenCalledWith({
        masteredDelta: 0,
        promotionsDelta: 1,
        streakDelta: 1,
        streakDaysOverride: 1,
        shieldCountOverride: 1,
      });
    });
    expect(mockedRegisterProtectedDailyActivity).toHaveBeenCalledTimes(1);
  });

  it("does not apply a promotion burst for a correct box five answer without streak growth", async () => {
    mockedGetDueCustomReviewFlashcards.mockResolvedValueOnce([
      makeReviewCard({
        id: 612,
        frontText: "cat",
        backText: "kot",
        answers: ["kot"],
        stage: 5,
      }),
    ]);

    const screen = render(<ReviewFlashcardsPlaceholder />);

    await startReviewFromStage(screen, 5);

    await act(async () => {
      fireEvent.changeText(getVisibleTextInputs(screen)[0], "kot");
    });

    fireEvent.press(screen.getByTestId("confirm-button"));

    await waitFor(() => {
      expect(mockedLogCustomLearningEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          flashcardId: 612,
          box: "boxFive",
          result: "ok",
        })
      );
    });
    expect(mockedRegisterProtectedDailyActivity).toHaveBeenCalledTimes(1);
    expect(applyStatBurstMock).not.toHaveBeenCalled();
  });

  it("logs a single wrong event with duration and does not duplicate it after correction", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-04-21T10:00:00.000Z"));
    mockedGetDueCustomReviewFlashcards.mockResolvedValueOnce([
      makeReviewCard({
        id: 701,
        frontText: "cat",
        backText: "kot",
        answers: ["kot"],
        stage: 1,
      }),
    ]);

    const screen = render(<ReviewFlashcardsPlaceholder />);

    await startReviewFromStage(screen, 1);

    await act(async () => {
      jest.setSystemTime(new Date("2026-04-21T10:00:03.500Z"));
      fireEvent.changeText(getVisibleTextInputs(screen)[0], "__wrong_answer__");
    });

    fireEvent.press(screen.getByTestId("confirm-button"));

    await waitFor(() => {
      expect(mockedLogCustomLearningEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          flashcardId: 701,
          courseId: 77,
          box: "boxOne",
          result: "wrong",
        })
      );
    });
    const loggedEvent = mockedLogCustomLearningEvent.mock.calls[0]?.[0];
    expect(loggedEvent).toEqual(
      expect.objectContaining({
        flashcardId: 701,
        courseId: 77,
        box: "boxOne",
        result: "wrong",
      })
    );
    expect(loggedEvent?.durationMs).toBeGreaterThanOrEqual(2500);
    expect(loggedEvent?.durationMs).toBeLessThanOrEqual(3500);

    const correctionInputs = getVisibleTextInputs(screen);
    await act(async () => {
      fireEvent.changeText(correctionInputs[0], "kot");
    });

    await waitFor(() => {
      expect(mockedScheduleCustomReview).toHaveBeenCalledWith(701, 77, 0);
    });
    expect(mockedLogCustomLearningEvent).toHaveBeenCalledTimes(1);
    expect(applyStatBurstMock).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it("logs know-dont-know attempts with the current review box", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-04-21T10:00:00.000Z"));
    mockedGetDueCustomReviewFlashcards.mockResolvedValueOnce([
      makeReviewCard({
        id: 801,
        frontText: "Sun rises in the east",
        backText: "true",
        answers: ["true"],
        type: "know_dont_know",
        stage: 2,
      }),
    ]);

    const screen = render(<ReviewFlashcardsPlaceholder />);

    await startReviewFromStage(screen, 2);

    await act(async () => {
      jest.setSystemTime(new Date("2026-04-21T10:00:02.250Z"));
    });

    fireEvent.press(screen.getByTestId("true-answer-button"));

    await waitFor(() => {
      expect(mockedLogCustomLearningEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          flashcardId: 801,
          courseId: 77,
          box: "boxTwo",
          result: "ok",
        })
      );
    });
    const loggedEvent = mockedLogCustomLearningEvent.mock.calls[0]?.[0];
    expect(loggedEvent).toEqual(
      expect.objectContaining({
        flashcardId: 801,
        courseId: 77,
        box: "boxTwo",
        result: "ok",
      })
    );
    expect(loggedEvent?.durationMs).toBeGreaterThanOrEqual(1500);
    expect(loggedEvent?.durationMs).toBeLessThanOrEqual(2250);
    expect(mockedLogCustomLearningEvent).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});
