import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";
import { StyleSheet, TextInput } from "react-native";

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

jest.mock("@expo/vector-icons/Octicons", () => () => null);

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


describe("CardInput inline confirm", () => {
  beforeEach(() => {
    mockedUseSettings.mockReturnValue({ colors: { my_green: "#00ebc7", font: "#00214d" } });
    jest.clearAllMocks();
  });

  it("submits through the main handler and exposes a localized accessible name", () => {
    const correctionConfirm = jest.fn();
    const screen = render(<CardInput {...stableInputProps} inlineAction={{ disabled: false, label: "Confirm", onCorrectionConfirm: correctionConfirm }} />);
    fireEvent.press(screen.getByRole("button", { name: "Confirm" }));
    expect(stableInputProps.handleConfirm).toHaveBeenCalledTimes(1);
    expect(correctionConfirm).not.toHaveBeenCalled();
  });

  it.each([320, 360, 375, 390, 430])("keeps the inline button within the existing input height on a %sdp phone", (width) => {
    const metrics = getResponsiveFlashcardMetrics(width);
    const screen = render(<CardInput {...stableInputProps} cardMetrics={metrics} />);
    const input = screen.UNSAFE_getByType(TextInput);
    const inputHeight = StyleSheet.flatten(input.props.style).height;
    screen.rerender(<CardInput {...stableInputProps} cardMetrics={metrics} inlineAction={{ disabled: false, label: "Confirm", onCorrectionConfirm: jest.fn() }} />);
    const buttonStyle = StyleSheet.flatten(screen.getByTestId("card-inline-confirm").props.style);
    expect(buttonStyle.height).toBeLessThanOrEqual(inputHeight);
    expect(StyleSheet.flatten(screen.UNSAFE_getByType(TextInput).props.style).height).toBe(inputHeight);
    expect(screen.UNSAFE_getByType(TextInput)).toBe(input);
  });

  it("blocks disabled taps and preserves the input when the action disappears", () => {
    const inlineAction = { disabled: true, label: "Confirm", onCorrectionConfirm: jest.fn() };
    const screen = render(<CardInput {...stableInputProps} inlineAction={inlineAction} />);
    const input = screen.UNSAFE_getByType(TextInput);
    fireEvent.press(screen.getByRole("button", { name: "Confirm" }));
    expect(stableInputProps.handleConfirm).not.toHaveBeenCalled();
    expect(screen.getByTestId("card-inline-confirm").props.accessibilityState).toEqual({ disabled: true });
    screen.rerender(<CardInput {...stableInputProps} />);
    expect(screen.queryByTestId("card-inline-confirm")).toBeNull();
    expect(screen.UNSAFE_getByType(TextInput)).toBe(input);
  });
});
