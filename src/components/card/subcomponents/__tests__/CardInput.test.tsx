import React from "react";
import { act, render } from "@testing-library/react-native";
import { TextInput } from "react-native";

import { useSettings } from "@/src/contexts/SettingsContext";
import { getResponsiveFlashcardMetrics } from "@/src/components/card/responsiveCardWidth";
import { CardInput } from "@/src/components/card/subcomponents/CardInput";

jest.mock("@/src/contexts/SettingsContext", () => ({
  useSettings: jest.fn(),
}));
const mockStyles = {};
jest.mock("@/src/components/card/card-styles", () => ({
  useStyles: () => mockStyles,
}));
let mockTranslate = (key: string) => key;
let mockT = (key: string) => mockTranslate(key);

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: mockT }),
}));

const mockedUseSettings = useSettings as jest.Mock;
const cardMetrics = getResponsiveFlashcardMetrics(390);

function renderInput(emptyAnswerSubmitWarning: boolean) {
  return render(renderCardInput(emptyAnswerSubmitWarning));
}

const stableInputProps = {
  promptText: "question",
  allowMultilinePrompt: false,
  promptImageUri: null,
  answer: "",
  setAnswer: jest.fn(),
  mainInputRef: React.createRef<TextInput>(),
  suggestionProps: {},
  handleConfirm: jest.fn(),
  isMainAnswerNumeric: false,
  isMainAnswerDate: false,
  focusTarget: "main" as const,
  requestFocus: jest.fn(),
  canToggleTranslations: false,
  next: jest.fn(),
  typoDiff: null,
  imageSizeMode: "dynamic" as const,
  cardMetrics,
};

function renderCardInput(emptyAnswerSubmitWarning: boolean) {
  return (
    <CardInput
      emptyAnswerSubmitWarning={emptyAnswerSubmitWarning}
      {...stableInputProps}
    />
  );
}

describe("CardInput empty submit warning", () => {
  beforeEach(() => {
    mockedUseSettings.mockReturnValue({ colors: { my_yellow: "#fde24f" } });
    mockTranslate = (key) => key;
    mockT = (key) => mockTranslate(key);
  });

  it("renders my_yellow border when warning is active", () => {
    const screen = renderInput(true);
    const input = screen.UNSAFE_getByType(TextInput);

    expect(input.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ borderColor: "#fde24f" }),
      ]),
    );
    expect(input.props.accessibilityLabel).toBe(
      "flashcards.card.input.answerLabel",
    );
    expect(input.props.accessibilityHint).toBe(
      "flashcards.card.input.emptyAnswerHint",
    );
    expect(screen.getByTestId("card-answer-error").props.children).toBe(
      "flashcards.card.input.emptyAnswerError",
    );
  });

  it("does not render warning border when warning is cleared", () => {
    const screen = renderInput(false);
    const input = screen.UNSAFE_getByType(TextInput);

    act(() => input.props.onChangeText("answer"));
    expect(input.props.style).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ borderColor: "#fde24f" }),
      ]),
    );
    expect(input.props.accessibilityHint).toBe(
      "flashcards.card.input.answerHint",
    );
    expect(screen.queryByTestId("card-answer-error")).toBeNull();
  });

  it("updates the input label and hint after a language change", () => {
    mockTranslate = (key) => `pl:${key}`;
    const screen = renderInput(false);
    const input = screen.UNSAFE_getByType(TextInput);
    expect(input.props.accessibilityLabel).toBe(
      "pl:flashcards.card.input.answerLabel",
    );

    mockTranslate = (key) => `en:${key}`;
    mockT = (key) => mockTranslate(key);
    screen.rerender(renderCardInput(false));

    expect(screen.UNSAFE_getByType(TextInput).props.accessibilityLabel).toBe(
      "en:flashcards.card.input.answerLabel",
    );
    expect(screen.UNSAFE_getByType(TextInput).props.accessibilityHint).toBe(
      "en:flashcards.card.input.answerHint",
    );
  });
});
