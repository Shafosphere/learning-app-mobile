import React from "react";
import {
  act,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";
import { TextInput } from "react-native";

import ReviewFlashcardsPlaceholder from "@/src/screens/review/reviewflashcards/reviewwflashcards";
import { getDueCustomReviewFlashcards } from "@/src/db/sqlite/db";
import { useSettings } from "@/src/contexts/SettingsContext";

jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(() => ({ courseId: "77" })),
}));

jest.mock("@/src/contexts/SettingsContext", () => ({
  useSettings: jest.fn(),
}));

jest.mock("@/src/db/sqlite/db", () => ({
  advanceCustomReview: jest.fn(() =>
    Promise.resolve({ stage: 2, nextReview: Date.now() })
  ),
  getDueCustomReviewFlashcards: jest.fn(() => Promise.resolve([])),
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
  makeTrueFalseHandler: jest.fn(() => jest.fn()),
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
  }: {
    onCardActionsConfirm: () => void;
    showCardActions: boolean;
  }) => {
    const React = require("react");
    const { Pressable, Text, View } = require("react-native");
    return (
      <View>
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
          <Pressable
            key={boxName}
            testID={`box-button-${boxName}`}
            onPress={() => handleSelectBox(boxName)}
          >
            <Text>{`${boxName}:${cards.length}`}</Text>
          </Pressable>
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
});
