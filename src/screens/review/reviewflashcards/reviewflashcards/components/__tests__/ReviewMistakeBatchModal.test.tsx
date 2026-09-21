import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import { ReviewMistakeBatchModal } from "../ReviewMistakeBatchModal";
import type { ReviewMistakeNudgeCandidate } from "../../model/reviewFlashcards.types";

let mockWindowDimensions = {
  fontScale: 1,
  height: 1024,
  scale: 1,
  width: 768,
};

jest.mock("react-native", () => {
  const RN = jest.requireActual("react-native");
  return new Proxy(RN, {
    get(target: Record<string, unknown>, prop: string | symbol) {
      if (prop === "useWindowDimensions") return () => mockWindowDimensions;
      return target[prop as keyof typeof target];
    },
  });
});

const mockColors = {
  background: "#ffffff",
  secondBackground: "#f8fafc",
  border: "#dbe3ee",
  headline: "#102a43",
  paragraph: "#486581",
  lightbg: "#ffffff",
  my_red: "#ef476f",
  my_green: "#06d6a0",
};

jest.mock("@/src/contexts/SettingsContext", () => ({
  useSettings: () => ({ colors: mockColors, highContrastEnabled: false }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, values?: { count?: number }) =>
      values?.count == null ? key : `${key}:${values.count}`,
  }),
}));

jest.mock("expo-image", () => ({
  Image: ({ source }: { source: { uri: string } }) => {
    const { View: MockView } = jest.requireActual("react-native");
    const MockReact = jest.requireActual("react");
    return MockReact.createElement(MockView, { testID: `image-${source.uri}` });
  },
}));

jest.mock("@/src/components/card/subcomponents/PromptImage", () => ({
  PromptImage: ({ uri }: { uri: string }) => {
    const { View: MockView } = jest.requireActual("react-native");
    const MockReact = jest.requireActual("react");
    return MockReact.createElement(MockView, { testID: `image-${uri}` });
  },
}));

jest.mock("@expo/vector-icons/Ionicons", () => ({
  __esModule: true,
  default: () => {
    const { View: MockView } = jest.requireActual("react-native");
    const MockReact = jest.requireActual("react");
    return MockReact.createElement(MockView);
  },
}));

jest.mock("@/src/components/card/subcomponents/CardMathText", () => {
  const { Text: MockText } = jest.requireActual("react-native");
  const MockReact = jest.requireActual("react");
  return {
    CardMathText: ({ text }: { text: string }) =>
      MockReact.createElement(MockText, { testID: "math-card-text" }, text),
    hasMathSegments: (text: string) => text.includes("$"),
  };
});

jest.mock("@/src/components/button/button", () => ({
  __esModule: true,
  default: ({ text, onPress }: { text: string; onPress: () => void }) => {
    const { Pressable: MockPressable, Text: MockText } = jest.requireActual("react-native");
    const MockReact = jest.requireActual("react");
    return MockReact.createElement(
      MockPressable,
      { testID: "batch-confirm", onPress },
      MockReact.createElement(MockText, null, text)
    );
  },
}));

const makeCandidate = (id: number, imageFront?: string): ReviewMistakeNudgeCandidate => ({
  card: {
    id,
    text: `Long front text for card ${id} that must not expand its row indefinitely`,
    translations: [`Long back text for card ${id} that must not expand its row indefinitely`],
    stage: 1,
    flipped: false,
    imageFront,
  },
  box: "boxOne",
  wrongStreak: 3,
});

describe("ReviewMistakeBatchModal", () => {
  afterEach(() => {
    mockWindowDimensions = {
      fontScale: 1,
      height: 1024,
      scale: 1,
      width: 768,
    };
  });

  it("caps the dialog to the available height in a short window", () => {
    mockWindowDimensions = {
      fontScale: 1,
      height: 300,
      scale: 1,
      width: 640,
    };

    const screen = render(
      <ReviewMistakeBatchModal
        cards={Array.from({ length: 8 }, (_, index) => makeCandidate(index + 1))}
        confirming={false}
        error={false}
        onConfirm={jest.fn()}
        onKeepReviewing={jest.fn()}
        visible
      />
    );

    expect(screen.getByTestId("review-mistake-batch-modal").props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ maxHeight: 252 })])
    );
  });

  it("renders an unbounded scroll list with image and placeholder cards", () => {
    const cards = Array.from({ length: 8 }, (_, index) =>
      makeCandidate(index + 1, index % 2 === 0 ? `https://example.com/${index}.png` : undefined)
    );
    cards[1].card.text = "$\\frac{3}{4} + \\frac{1}{8}$";
    const screen = render(
      <ReviewMistakeBatchModal
        cards={cards}
        confirming={false}
        error={false}
        onConfirm={jest.fn()}
        onKeepReviewing={jest.fn()}
        visible
      />
    );

    expect(screen.getByTestId("review-mistake-batch-list")).toBeTruthy();
    expect(screen.getByTestId("review-mistake-batch-card-8")).toBeTruthy();
    expect(screen.getByTestId("image-https://example.com/0.png")).toBeTruthy();
    expect(screen.getByTestId("math-card-text")).toBeTruthy();
    expect(screen.getByText("flashcards.card.reviewMistakeNudge.confirm")).toBeTruthy();
  });

  it("keeps both batch actions available", () => {
    const onConfirm = jest.fn();
    const onKeepReviewing = jest.fn();
    const screen = render(
      <ReviewMistakeBatchModal
        cards={[makeCandidate(1)]}
        confirming={false}
        error={false}
        onConfirm={onConfirm}
        onKeepReviewing={onKeepReviewing}
        visible
      />
    );

    fireEvent.press(screen.getByTestId("batch-confirm"));
    fireEvent.press(screen.getByText("flashcards.card.reviewMistakeNudge.keep"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onKeepReviewing).toHaveBeenCalledTimes(1);
  });

  it("moves only checked flashcards and updates the CTA count", () => {
    const onConfirm = jest.fn();
    const screen = render(
      <ReviewMistakeBatchModal
        cards={[makeCandidate(1), makeCandidate(2)]}
        confirming={false}
        error={false}
        onConfirm={onConfirm}
        onKeepReviewing={jest.fn()}
        visible
      />
    );

    fireEvent.press(screen.getAllByRole("checkbox")[0]);
    expect(
      screen.getByText("flashcards.card.reviewMistakeNudge.confirmSelected:1")
    ).toBeTruthy();

    fireEvent.press(screen.getByTestId("batch-confirm"));
    expect(onConfirm).toHaveBeenCalledWith([2]);
  });
});
