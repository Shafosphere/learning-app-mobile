import React from "react";
import { act, render, waitFor } from "@testing-library/react-native";

import Card from "@/src/components/card/card";
import { useCardFocusController } from "@/src/components/card/useCardFocusController";
import { useFocusExecutor } from "@/src/components/card/useFocusExecutor";
import { useSettings } from "@/src/contexts/SettingsContext";
import type { CardProps } from "@/src/components/card/card-types";
import type { WordWithTranslations } from "@/src/types/boxes";

let mockTextInputFocus = jest.fn();
let mockTextInputBlur = jest.fn();

jest.mock("@/src/contexts/SettingsContext", () => ({
  useSettings: jest.fn(),
}));

jest.mock("react-native", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  const RN = jest.requireActual("react-native");

  const TextInput = React.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) => {
    React.useImperativeHandle(ref, () => ({
      focus: () => mockTextInputFocus(),
      blur: () => mockTextInputBlur(),
    }));

    return React.createElement(RN.View, props);
  });
  TextInput.displayName = "TextInput";

  return new Proxy(RN, {
    get(target: Record<string, unknown>, prop: string | symbol) {
      if (prop === "TextInput") return TextInput;
      return target[prop as keyof typeof target];
    },
  });
});

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

let latestCardHintProps: Record<string, unknown> | null = null;
let latestNudgeModalProps: Record<string, unknown> | null = null;

jest.mock("@/src/components/card/subcomponents/CardHint", () => ({
  CardHint: (props: Record<string, unknown>) => {
    latestCardHintProps = props;
    return null;
  },
}));

jest.mock("@/src/components/nudge/NudgeModal", () => ({
  NudgeModal: (props: Record<string, unknown>) => {
    latestNudgeModalProps = props;
    return null;
  },
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
  useCardFocusController: jest.fn(),
}));

jest.mock("@/src/components/card/useFocusExecutor", () => ({
  useFocusExecutor: jest.fn(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "app.actions.cancel": "Anuluj",
        "flashcards.card.hint.bothSides": "Obie strony fiszki",
        "flashcards.card.hint.save": "Zapisz",
        "flashcards.card.hint.targetDialogMessage":
          "Może być widoczna tylko przy tej stronie fiszki albo przy obu stronach.",
        "flashcards.card.hint.targetDialogTitle": "Gdzie zapisać podpowiedź?",
        "flashcards.card.hint.thisSideOnly": "Tylko ta strona",
      };
      return translations[key] ?? key;
    },
  }),
}));

let latestResolverProps: Record<string, unknown> | null = null;

jest.mock("@/src/components/card/subcomponents/CardContentResolver", () => ({
  CardContentResolver: (props: Record<string, unknown>) => {
    latestResolverProps = props;
    return null;
  },
}));

const mockedUseSettings = useSettings as jest.Mock;
const mockedUseCardFocusController = useCardFocusController as jest.Mock;
const mockedUseFocusExecutor = useFocusExecutor as jest.Mock;

let mockRequestFocus: jest.Mock;

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

function renderCard(
  props: CardProps,
  options: { textInputFocus?: jest.Mock; textInputBlur?: jest.Mock } = {},
) {
  mockTextInputFocus = options.textInputFocus ?? jest.fn();
  mockTextInputBlur = options.textInputBlur ?? jest.fn();

  return render(<Card {...props} />, {
    createNodeMock: () => ({
      focus: options.textInputFocus ?? jest.fn(),
      blur: options.textInputBlur ?? jest.fn(),
      scrollTo: jest.fn(),
    }),
  });
}

describe("Card logic props", () => {
  beforeEach(() => {
    latestResolverProps = null;
    latestCardHintProps = null;
    latestNudgeModalProps = null;
    mockRequestFocus = jest.fn();
    mockedUseCardFocusController.mockReturnValue({
      focusTarget: "none",
      focusRequestId: 0,
      requestFocus: mockRequestFocus,
      onCorrection1Completed: jest.fn(),
      onHintEditStarted: jest.fn(),
    });
    mockedUseFocusExecutor.mockImplementation(() => undefined);
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

  it("requests main focus when leaving correction mode", async () => {
    const screen = renderCard(
      createProps({
        result: false,
        correction: {
          cardId: 16,
          awers: "cat",
          rewers: "kot",
          input1: "",
          input2: "",
          mode: "demote",
          promptText: "cat",
          reversed: false,
        },
        selectedItem: makeCard({
          id: 16,
          text: "cat",
          translations: ["kot"],
        }),
      }),
    );

    await waitFor(() => {
      expect(mockRequestFocus).toHaveBeenCalledWith("correction2");
    });

    mockRequestFocus.mockClear();

    screen.rerender(
      <Card
        {...createProps({
          result: null,
          correction: null,
          selectedItem: makeCard({
            id: 16,
            text: "cat",
            translations: ["kot"],
          }),
        })}
      />,
    );

    await waitFor(() => {
      expect(mockRequestFocus).toHaveBeenCalledWith("main");
    });
    expect(mockRequestFocus).not.toHaveBeenCalledWith("none");
  });

  it("primes the keyboard bridge before confirming an answer that enters correction", async () => {
    const confirm = jest.fn();
    const textInputFocus = jest.fn();

    renderCard(
      createProps({
        answer: "pies",
        confirm,
        selectedItem: makeCard({
          id: 17,
          text: "cat",
          translations: ["kot"],
        }),
      }),
      { textInputFocus },
    );

    await waitFor(() => {
      expect(latestResolverProps?.handleConfirm).toEqual(expect.any(Function));
    });

    act(() => {
      (latestResolverProps?.handleConfirm as () => void)();
    });

    expect(textInputFocus).toHaveBeenCalledTimes(1);
    expect(confirm).toHaveBeenCalledWith("kot");
    expect(textInputFocus.mock.invocationCallOrder[0]).toBeLessThan(
      confirm.mock.invocationCallOrder[0],
    );
  });

  it("primes the keyboard bridge before completing correction input changes", async () => {
    const wrongInputChange = jest.fn();
    const textInputFocus = jest.fn();

    renderCard(
      createProps({
        result: false,
        correction: {
          cardId: 18,
          awers: "cat",
          rewers: "kot",
          input1: "",
          input2: "",
          mode: "demote",
          promptText: "cat",
          reversed: false,
        },
        wrongInputChange,
        selectedItem: makeCard({
          id: 18,
          text: "cat",
          translations: ["kot"],
        }),
      }),
      { textInputFocus },
    );

    await waitFor(() => {
      expect(latestResolverProps?.wrongInputChange).toEqual(expect.any(Function));
    });

    act(() => {
      (latestResolverProps?.wrongInputChange as (
        which: 1 | 2,
        value: string,
      ) => void)(2, "kot");
    });

    expect(textInputFocus).toHaveBeenCalledTimes(1);
    expect(wrongInputChange).toHaveBeenCalledWith(2, "kot");
    expect(textInputFocus.mock.invocationCallOrder[0]).toBeLessThan(
      wrongInputChange.mock.invocationCallOrder[0],
    );
  });

  it("saves hints directly on cards that cannot be reversed", async () => {
    const onHintUpdate = jest.fn();

    renderCard(
      createProps({
        onHintUpdate,
        selectedItem: makeCard({
          id: 19,
          text: "Is this true?",
          translations: ["true"],
          type: "true_false",
        }),
      }),
    );

    act(() => {
      (latestCardHintProps?.setHintDraft as (value: string) => void)("hint");
    });

    await waitFor(() => {
      expect(latestCardHintProps?.hintDraft).toBe("hint");
    });

    act(() => {
      (latestCardHintProps?.finishHintEditing as () => void)();
    });

    await waitFor(() => {
      expect(onHintUpdate).toHaveBeenCalledWith(19, "hint", null);
    });

    expect(latestNudgeModalProps?.visible).toBe(false);
  });

  it("passes hint tutorial controls to the hint component", () => {
    const shouldStartHintEditing = jest.fn(() => false);

    renderCard(
      createProps({
        hintCoachmarkId: "flashcards-hint-section",
        shouldStartHintEditing,
      }),
    );

    expect(latestCardHintProps).toMatchObject({
      hintCoachmarkId: "flashcards-hint-section",
      shouldStartHintEditing,
    });
  });

  it("does not render the hint slot when hints are hidden", () => {
    renderCard(createProps({ hideHints: true }));

    expect(latestCardHintProps).toBeNull();
  });

  it("opens hint editing when the external hint edit token changes", async () => {
    const screen = renderCard(
      createProps({
        hintEditRequestToken: 0,
      }),
    );

    expect(latestCardHintProps?.isEditingHint).toBe(false);

    screen.rerender(
      <Card
        {...createProps({
          hintEditRequestToken: 1,
        })}
      />,
    );

    await waitFor(() => {
      expect(latestCardHintProps?.isEditingHint).toBe(true);
    });
  });

  it("uses a side-choice hint modal for normal cards that can be reversed", async () => {
    const onHintUpdate = jest.fn();

    renderCard(
      createProps({
        onHintUpdate,
        selectedItem: makeCard({
          id: 20,
          text: "cat",
          translations: ["kot"],
        }),
      }),
    );

    act(() => {
      (latestCardHintProps?.setHintDraft as (value: string) => void)("hint");
    });

    await waitFor(() => {
      expect(latestCardHintProps?.hintDraft).toBe("hint");
    });

    act(() => {
      (latestCardHintProps?.finishHintEditing as () => void)();
    });

    await waitFor(() => {
      expect(latestNudgeModalProps?.visible).toBe(true);
    });
    expect(latestNudgeModalProps?.title).toBe("Gdzie zapisać podpowiedź?");
    expect(latestNudgeModalProps?.description).toBe(
      "Może być widoczna tylko przy tej stronie fiszki albo przy obu stronach.",
    );
    expect(latestNudgeModalProps?.confirmLabel).toBe("Obie strony fiszki");
    expect(latestNudgeModalProps?.secondaryLabel).toBe("Tylko ta strona");

    act(() => {
      (latestNudgeModalProps?.onSecondaryPress as () => void)();
    });

    expect(onHintUpdate).toHaveBeenCalledWith(20, "hint", null);

    act(() => {
      (latestCardHintProps?.setHintDraft as (value: string) => void)("both");
    });

    await waitFor(() => {
      expect(latestCardHintProps?.hintDraft).toBe("both");
    });

    act(() => {
      (latestCardHintProps?.finishHintEditing as () => void)();
    });

    await waitFor(() => {
      expect(latestNudgeModalProps?.visible).toBe(true);
    });

    act(() => {
      (latestNudgeModalProps?.onConfirm as () => void)();
    });

    expect(onHintUpdate).toHaveBeenCalledWith(20, "both", "both");
  });
});
