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

const toggleLabel = "flashcards.card.accessibilityLabel.przelaczStroneFiszki";

function renderCorrection(canToggleTranslations: boolean) {
  const next = jest.fn();
  const screen = render(
    <CardCorrection
      correction={{
        cardId: 48,
        awers: "bird",
        rewers: "Jastrząb zwyczajny",
        input1: "",
        input2: "",
        mode: "demote",
      }}
      promptText="bird"
      promptImageUri="bird://image"
      correctionAwers="bird"
      correctionRewers="Jastrząb zwyczajny"
      answerOnly={false}
      showAwersInput={false}
      showRewersInput
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
      input1ContentWidth={300}
      input2ContentWidth={300}
      setInput1LayoutWidth={jest.fn()}
      setInput2LayoutWidth={jest.fn()}
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
  );
  return { screen, next };
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
