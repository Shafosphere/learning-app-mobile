import React from "react";
import {
  act,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";
import { TextInput } from "react-native";

import ReviewFlashcardsPlaceholder from "@/src/screens/review/reviewflashcards/reviewflashcards";
import {
  advanceCustomReview,
  getDueCustomReviewFlashcards,
  logCustomLearningEvent,
  scheduleCustomReview,
} from "@/src/db/sqlite/db";
import { useSettings } from "@/src/contexts/SettingsContext";

jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(() => ({ courseId: "77" })),
}));

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (effect: () => void | (() => void)) => {
    const React = require("react");
    React.useEffect(effect, [effect]);
  },
}));

jest.mock("@/src/contexts/SettingsContext", () => ({
  useSettings: jest.fn(),
}));

jest.mock("@/src/db/sqlite/db", () => ({
  advanceCustomReview: jest.fn(() =>
    Promise.resolve({ stage: 2, nextReview: Date.now() })
  ),
  getDueCustomReviewFlashcards: jest.fn(() => Promise.resolve([])),
  logCustomLearningEvent: jest.fn(() => Promise.resolve()),
  scheduleCustomReview: jest.fn(() =>
    Promise.resolve({ stage: 1, nextReview: Date.now() })
  ),
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

jest.mock("@/src/components/Box/Peek/FlashcardsPeek", () => {
  return function FlashcardsPeekMock() {
    return null;
  };
});

jest.mock("@/src/components/Box/Carousel/BoxCarousel", () => {
  return function BoxCarouselMock() {
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
  }: {
    boxes: Record<string, Array<{ id: number }>>;
    handleSelectBox: (box: any) => void;
  }) {
    const React = require("react");
    const { Pressable, Text, View } = require("react-native");
    return (
      <View>
        {Object.entries(boxes).map(([boxName, cards]) => (
          <View key={boxName}>
            <Pressable
              testID={`box-button-${boxName}`}
              onPress={() => handleSelectBox(boxName)}
            >
              <Text>{`${boxName}:${cards.length}`}</Text>
            </Pressable>
          </View>
        ))}
      </View>
    );
  };
});

jest.mock("@/src/screens/flashcards/FlashcardsScreen-styles", () => ({
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

jest.mock("@expo/vector-icons/Octicons", () => {
  return function OcticonsMock() {
    return null;
  };
});

jest.mock("@edwardloopez/react-native-coachmark", () => ({
  CoachmarkAnchor: ({ children }: { children: React.ReactNode }) => children,
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
const mockedGetDueCustomReviewFlashcards =
  getDueCustomReviewFlashcards as jest.Mock;
const mockedLogCustomLearningEvent = logCustomLearningEvent as jest.Mock;
const mockedAdvanceCustomReview = advanceCustomReview as jest.Mock;
const mockedScheduleCustomReview = scheduleCustomReview as jest.Mock;

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

async function renderAndForceCorrectionSwitch(
  cards: ReviewCardRow[],
  switchedBox: "boxOne" | "boxTwo" | "boxThree" | "boxFour" | "boxFive"
) {
  mockedGetDueCustomReviewFlashcards.mockResolvedValueOnce(cards);
  const screen = render(<ReviewFlashcardsPlaceholder />);

  await waitFor(() => {
    expect(screen.UNSAFE_getAllByType(TextInput).length).toBeGreaterThan(0);
  });

  const inputs = screen.UNSAFE_getAllByType(TextInput);
  await act(async () => {
    fireEvent.changeText(inputs[0], "__wrong_answer__");
  });

  fireEvent.press(screen.getByTestId("confirm-button"));
  fireEvent.press(screen.getByTestId(`box-button-${switchedBox}`));

  return screen;
}

describe("reviewflashcards correction desync regression", () => {
  beforeEach(() => {
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

    await waitFor(() => {
      expect(screen.UNSAFE_getAllByType(TextInput).length).toBeGreaterThan(0);
    });

    await act(async () => {
      fireEvent.changeText(screen.UNSAFE_getAllByType(TextInput)[0], "__wrong_answer__");
    });

    fireEvent.press(screen.getByTestId("confirm-button"));

    await waitFor(() => {
      expect(screen.queryByText("cat")).not.toBeNull();
      expect(screen.queryByText("kot")).not.toBeNull();
    });
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

    await waitFor(() => {
      expect(screen.UNSAFE_getAllByType(TextInput).length).toBeGreaterThan(0);
    });

    await act(async () => {
      fireEvent.changeText(screen.UNSAFE_getAllByType(TextInput)[0], "kot");
    });

    fireEvent.press(screen.getByTestId("confirm-button"));

    await act(async () => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(screen.getByText("Brak fiszek w tej sesji")).not.toBeNull();
    });

    expect(mockedAdvanceCustomReview).toHaveBeenCalledWith(301, 77);
    expect(screen.getByText("boxFour:0")).not.toBeNull();
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

    await waitFor(() => {
      expect(screen.UNSAFE_getAllByType(TextInput).length).toBeGreaterThan(0);
    });

    await act(async () => {
      fireEvent.changeText(screen.UNSAFE_getAllByType(TextInput)[0], "__wrong_answer__");
    });

    fireEvent.press(screen.getByTestId("confirm-button"));

    await waitFor(() => {
      expect(screen.queryByText("cat")).not.toBeNull();
      expect(screen.queryByText("kot")).not.toBeNull();
    });

    const correctionInputs = screen.UNSAFE_getAllByType(TextInput);
    await act(async () => {
      fireEvent.changeText(correctionInputs[0], "kot");
    });

    await waitFor(() => {
      expect(mockedScheduleCustomReview).toHaveBeenCalledWith(401, 77, 0);
      expect(screen.getByText("Brak fiszek w tej sesji")).not.toBeNull();
    });

    expect(screen.getByText("boxZero:0")).not.toBeNull();
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

    await waitFor(() => {
      expect(screen.UNSAFE_getAllByType(TextInput).length).toBeGreaterThan(0);
    });

    await act(async () => {
      fireEvent.changeText(screen.UNSAFE_getAllByType(TextInput)[0], "planeta");
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

    await waitFor(() => {
      expect(screen.UNSAFE_getAllByType(TextInput).length).toBeGreaterThan(0);
    });

    await act(async () => {
      jest.setSystemTime(new Date("2026-04-21T10:00:04.000Z"));
      fireEvent.changeText(screen.UNSAFE_getAllByType(TextInput)[0], "kot");
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

    await waitFor(() => {
      expect(screen.UNSAFE_getAllByType(TextInput).length).toBeGreaterThan(0);
    });

    await act(async () => {
      jest.setSystemTime(new Date("2026-04-21T10:00:03.500Z"));
      fireEvent.changeText(screen.UNSAFE_getAllByType(TextInput)[0], "__wrong_answer__");
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

    const correctionInputs = screen.UNSAFE_getAllByType(TextInput);
    await act(async () => {
      fireEvent.changeText(correctionInputs[0], "kot");
    });

    await waitFor(() => {
      expect(mockedScheduleCustomReview).toHaveBeenCalledWith(701, 77, 0);
    });
    expect(mockedLogCustomLearningEvent).toHaveBeenCalledTimes(1);
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

    await waitFor(() => {
      expect(screen.getByTestId("true-answer-button")).not.toBeNull();
    });

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
