import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import Card from "@/src/components/card/card";
import { useSettings } from "@/src/contexts/SettingsContext";
import type { CardProps } from "@/src/components/card/card-types";
import type { WordWithTranslations } from "@/src/types/boxes";

jest.mock("@/src/contexts/SettingsContext", () => ({
  useSettings: jest.fn(),
}));

jest.mock("@/src/components/card/card-styles", () => ({
  useStyles: jest.fn(() =>
    new Proxy(
      {},
      {
        get: () => ({}),
      },
    ),
  ),
}));

jest.mock("@/src/components/card/subcomponents/CardHint", () => ({
  CardHint: () => null,
}));

jest.mock("@/src/components/card/subcomponents/CardFrame", () => {
  return function CardFrameMock({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return children;
  };
});

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

let latestResolverProps: Record<string, unknown> | null = null;

jest.mock("@/src/components/card/subcomponents/CardContentResolver", () => ({
  CardContentResolver: (props: Record<string, unknown>) => {
    latestResolverProps = props;
    return null;
  },
}));

const mockedUseSettings = useSettings as jest.Mock;

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

function createProps(overrides: Partial<CardProps> = {}): CardProps {
  return {
    selectedItem: makeCard({ id: 1 }),
    reversed: false,
    answer: "",
    setAnswer: jest.fn(),
    setResult: jest.fn(),
    result: null,
    correction: null,
    wrongInputChange: jest.fn(),
    confirm: jest.fn(),
    setCorrectionRewers: jest.fn(),
    onHintUpdate: jest.fn(),
    isFocused: true,
    introMode: false,
    isBetweenCards: false,
    disableLayoutAnimation: true,
    focusRequestToken: 0,
    showExplanationEnabled: false,
    explanationOnlyOnWrong: false,
    ...overrides,
  };
}

describe("Card logic props", () => {
  beforeEach(() => {
    latestResolverProps = null;
    mockedUseSettings.mockReturnValue({
      explanationOnlyOnWrong: false,
      showExplanationEnabled: false,
      ignoreDiacriticsInSpellcheck: false,
      flashcardsSuggestionsEnabled: false,
      flashcardsCardSize: "normal",
      flashcardsImageSize: "dynamic",
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it("forces answerOnly semantics for image-only cards", async () => {
    render(
      <Card
        {...createProps({
          reversed: true,
          selectedItem: makeCard({
            id: 10,
            text: "",
            translations: ["kot"],
            imageFront: "front://cat",
            imageBack: "back://cat",
          }),
        })}
      />,
    );

    await waitFor(() => {
      expect(latestResolverProps?.displayMode).toBe("question");
    });

    expect(latestResolverProps).toMatchObject({
      promptImageUri: "front://cat",
      promptText: "",
      answerOnly: true,
      shouldCorrectAwers: false,
      shouldCorrectRewers: true,
    });
  });

  it("keeps prompt on awers for explicit answerOnly cards even when reversed is requested", async () => {
    render(
      <Card
        {...createProps({
          reversed: true,
          selectedItem: makeCard({
            id: 11,
            text: "cat",
            translations: ["kot"],
            answerOnly: true,
          }),
        })}
      />,
    );

    await waitFor(() => {
      expect(latestResolverProps?.promptText).toBe("cat");
    });

    expect(latestResolverProps).toMatchObject({
      answerOnly: true,
      promptText: "cat",
      shouldCorrectAwers: false,
      shouldCorrectRewers: true,
    });
  });

  it("uses the reversed translation as prompt for normal reversed cards", async () => {
    render(
      <Card
        {...createProps({
          reversed: true,
          selectedItem: makeCard({
            id: 12,
            text: "cat",
            translations: ["kot", "kotek"],
          }),
        })}
      />,
    );

    await waitFor(() => {
      expect(latestResolverProps?.promptText).toBe("kot");
    });

    expect(latestResolverProps).toMatchObject({
      answerOnly: false,
      promptText: "kot",
      shouldCorrectAwers: true,
      shouldCorrectRewers: false,
    });
  });

  it("switches correction prompt source to correction payload", async () => {
    render(
      <Card
        {...createProps({
          result: false,
          correction: {
            cardId: 13,
            awers: "cat",
            rewers: "kot",
            input1: "",
            input2: "",
            mode: "demote",
            promptText: "prompt from correction",
            promptImageUri: "correction://image",
            reversed: false,
          },
          selectedItem: makeCard({
            id: 13,
            text: "cat",
            translations: ["kot"],
            imageFront: "front://image",
          }),
        })}
      />,
    );

    await waitFor(() => {
      expect(latestResolverProps?.displayMode).toBe("correction");
    });

    expect(latestResolverProps).toMatchObject({
      promptText: "prompt from correction",
      promptImageUri: "correction://image",
      correctionAwers: "cat",
      correctionRewers: "kot",
      shouldCorrectAwers: false,
      shouldCorrectRewers: true,
    });
  });

  it("shows both correction sides when correction answerOnly forces front-only mode", async () => {
    render(
      <Card
        {...createProps({
          result: false,
          correction: {
            cardId: 14,
            awers: "cat",
            rewers: "kot",
            input1: "",
            input2: "",
            mode: "demote",
            promptText: "cat",
            reversed: true,
            answerOnly: true,
          },
          selectedItem: makeCard({
            id: 14,
            text: "cat",
            translations: ["kot"],
          }),
        })}
      />,
    );

    await waitFor(() => {
      expect(latestResolverProps?.displayMode).toBe("correction");
    });

    expect(latestResolverProps).toMatchObject({
      promptText: "cat",
      shouldCorrectAwers: true,
      shouldCorrectRewers: true,
    });
  });

  it("uses the active translation as correctionRewers in intro mode", async () => {
    const setCorrectionRewers = jest.fn();

    render(
      <Card
        {...createProps({
          introMode: true,
          correction: {
            cardId: 15,
            awers: "cat",
            rewers: "stale-value",
            input1: "",
            input2: "",
            mode: "intro",
            promptText: "cat",
            reversed: false,
          },
          selectedItem: makeCard({
            id: 15,
            text: "cat",
            translations: ["kot", "kotek"],
          }),
          setCorrectionRewers,
        })}
      />,
    );

    await waitFor(() => {
      expect(latestResolverProps?.displayMode).toBe("correction");
    });

    expect(latestResolverProps).toMatchObject({
      correctionRewers: "kot",
      shouldCorrectAwers: false,
      shouldCorrectRewers: true,
    });
    expect(setCorrectionRewers).toHaveBeenCalledWith("kot");
  });
});
