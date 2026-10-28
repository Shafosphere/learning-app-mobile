import { LandscapeStudyContext, getLandscapeStudyLayout } from "../../landscapeStudyLayout";
import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { ScrollView, TextInput } from "react-native";

import { getResponsiveFlashcardMetrics } from "@/src/components/card/responsiveCardWidth";
import { CardCorrection } from "../CardCorrection";

jest.mock("@/src/components/card/card-styles", () => ({
  useStyles: () => ({ cardFont: { color: "#111111" } }),
}));
jest.mock("../PromptImage", () => ({ PromptImage: () => null }));
jest.mock("@expo/vector-icons/Octicons", () => () => null);
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("@/src/contexts/SettingsContext", () => ({
  useSettings: () => ({ colors: { my_green: "#00ebc7", font: "#00214d" } }),
}));

const toggleLabel = "flashcards.card.accessibilityLabel.przelaczStroneFiszki";

function renderCorrection(
  canToggleTranslations: boolean,
  input1 = "",
  input2 = "",
  inlineAction?: import("../../card-types").InlineCardAction,
  showRewersInput = true,
  audioActions: import("../../card-types").CardAudioActions = {},
  landscape = false,
) {
  const next = jest.fn();
  const setInput2LayoutWidth = jest.fn();
  const screen = render(
    <CardCorrection
      {...audioActions}
      inlineAction={inlineAction}
      correction={{
        cardId: 48,
        awers: "bird",
        rewers: "Jastrząb zwyczajny",
        input1,
        input2,
        mode: "demote",
      }}
      promptText="bird"
      promptImageUri="bird://image"
      correctionAwers="bird"
      correctionRewers="Jastrząb zwyczajny"
      answerOnly={false}
      showAwersInput={input1.length > 0}
      showRewersInput={showRewersInput}
      allowMultilinePrompt
      input1Ref={React.createRef<TextInput>()}
      input2Ref={React.createRef<TextInput>()}
      input1ScrollRef={React.createRef<ScrollView>()}
      input2ScrollRef={React.createRef<ScrollView>()}
      handleCorrectionInput1Change={jest.fn()}
      wrongInputChange={jest.fn()}
      suggestionProps={{}}
      isIntroMode={false}
      renderCorrectionGhostText={() => null}
      renderCorrectionErrorText={() => null}
      hasCorrectionMismatch={(value, expected) => value.length > 0 && value !== expected}
      input1ContentWidth={300}
      input2ContentWidth={300}
      setInput1LayoutWidth={jest.fn()}
      setInput2LayoutWidth={setInput2LayoutWidth}
      focusTarget="none"
      requestFocus={jest.fn()}
      onCorrection1Completed={jest.fn()}
      isCorrectionInput1Numeric={false}
      isCorrectionInput1Date={false}
      isCorrectionInput2Numeric={false}
      isCorrectionInput2Date={false}
      previousCorrectionInput2={{ current: "" }}
      canToggleTranslations={canToggleTranslations}
      next={next}
      input1LayoutWidth={300}
      input2LayoutWidth={300}
      imageSizeMode="dynamic"
      cardMetrics={getResponsiveFlashcardMetrics(390)}
    />,
    { wrapper: ({ children }) => (
      <LandscapeStudyContext.Provider value={landscape ? getLandscapeStudyLayout(960, 230) : null}>
        {children}
      </LandscapeStudyContext.Provider>
    ) },
  );
  return { screen, next, setInput2LayoutWidth };
}

describe("CardCorrection translation toggle", () => {
  it("shows the switch beside the correction input when the prompt is an image", () => {
    const { screen, next } = renderCorrection(true);

    fireEvent.press(screen.getByRole("button", { name: toggleLabel }));
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("hides the switch when there is no alternative answer", () => {
    const { screen } = renderCorrection(false);
    expect(screen.queryByRole("button", { name: toggleLabel })).toBeNull();
  });
});

describe("CardCorrection accessibility", () => {
  it("names correction fields without exposing answers", () => {
    const { screen } = renderCorrection(true, "b", "J");
    const inputs = screen.UNSAFE_getAllByType(TextInput);

    expect(inputs[0].props.accessibilityLabel).toBe(
      "flashcards.card.input.frontCorrectionLabel",
    );
    expect(inputs[1].props.accessibilityLabel).toBe(
      "flashcards.card.input.backCorrectionLabel",
    );
    expect(inputs[0].props.accessibilityHint).toBe(
      "flashcards.card.input.correctionErrorHint",
    );
    expect(inputs[1].props.accessibilityHint).toBe(
      "flashcards.card.input.correctionErrorHint",
    );
  });

  it("clears correction status when no characters mismatch", () => {
    const { screen } = renderCorrection(true, "bird", "Jastrząb zwyczajny");
    const inputs = screen.UNSAFE_getAllByType(TextInput);

    expect(inputs[0].props.accessibilityHint).toBe(
      "flashcards.card.input.correctionHint",
    );
    expect(inputs[1].props.accessibilityHint).toBe(
      "flashcards.card.input.correctionHint",
    );
  });
});


describe("CardCorrection inline confirm", () => {
  it.each([false, true])("keeps switch and confirm independent with two inputs: %s", (twoInputs) => {
    const onCorrectionConfirm = jest.fn();
    const { screen, next } = renderCorrection(true, twoInputs ? "b" : "", "J", { disabled: false, label: "Confirm", onCorrectionConfirm });
    expect(screen.UNSAFE_getAllByType(TextInput)).toHaveLength(twoInputs ? 2 : 1);
    expect(screen.getAllByTestId("card-inline-confirm")).toHaveLength(1);
    fireEvent.press(screen.getByRole("button", { name: toggleLabel }));
    expect(next).toHaveBeenCalledTimes(1);
    expect(onCorrectionConfirm).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole("button", { name: "Confirm" }));
    expect(onCorrectionConfirm).toHaveBeenCalledTimes(1);
  });

  it("places confirm beside front-only correction and blocks disabled taps", () => {
    const onCorrectionConfirm = jest.fn();
    const { screen } = renderCorrection(false, "b", "", { disabled: true, label: "Confirm", onCorrectionConfirm }, false);
    expect(screen.UNSAFE_getAllByType(TextInput)).toHaveLength(1);
    fireEvent.press(screen.getByRole("button", { name: "Confirm" }));
    expect(onCorrectionConfirm).not.toHaveBeenCalled();
  });

  it("reports the reduced correction viewport width for caret scrolling", () => {
    const { screen, setInput2LayoutWidth } = renderCorrection(true, "", "J", { disabled: false, label: "Confirm", onCorrectionConfirm: jest.fn() });
    const viewport = screen.UNSAFE_getByType(ScrollView);
    fireEvent(viewport!, "layout", { nativeEvent: { layout: { width: 200, height: 52 } } });
    expect(setInput2LayoutWidth).toHaveBeenCalledWith(200);
    expect(viewport!.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ flex: 1, minWidth: 0 })]));
  });
});

describe("Box0 audio input gestures", () => {
  it("reads on each touch without using focus/change events or blocking editing", () => {
    const readFront = jest.fn(), readBack = jest.fn();
    const { screen } = renderCorrection(false, "b", "J", undefined, true,
      { onReadFrontInput: readFront, onReadBackInput: readBack });
    const [front, back] = screen.UNSAFE_getAllByType(TextInput);
    fireEvent(front, "focus"); fireEvent(front, "changeText", "bi");
    expect(readFront).not.toHaveBeenCalled(); expect(readBack).not.toHaveBeenCalled();
    fireEvent(front, "pressIn"); fireEvent(front, "pressIn"); fireEvent(back, "pressIn");
    expect(readFront).toHaveBeenCalledTimes(2); expect(readBack).toHaveBeenCalledTimes(1);
    expect(front.props.onFocus).toBeDefined(); expect(front.props.onChangeText).toBeDefined();
  });
});


it("keeps both correction fields and confirmation accessible beside the landscape prompt", () => {
  const confirm = jest.fn();
  const { screen } = renderCorrection(false, "b", "J", {
    disabled: false, label: "Confirm correction", onCorrectionConfirm: confirm,
  }, true, {}, true);
  expect(screen.getByTestId("landscape-study-card")).toBeTruthy();
  expect(screen.getByLabelText("flashcards.card.input.frontCorrectionLabel").props.value).toBe("b");
  expect(screen.getByLabelText("flashcards.card.input.backCorrectionLabel").props.value).toBe("J");
  fireEvent.press(screen.getByRole("button", { name: "Confirm correction" }));
  expect(confirm).toHaveBeenCalledTimes(1);
});
