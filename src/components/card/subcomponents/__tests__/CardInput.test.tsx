import React from "react";
import { act, render } from "@testing-library/react-native";
import { TextInput } from "react-native";

import { useSettings } from "@/src/contexts/SettingsContext";
import { getResponsiveFlashcardMetrics } from "@/src/components/card/responsiveCardWidth";
import { CardInput } from "@/src/components/card/subcomponents/CardInput";

jest.mock("@/src/contexts/SettingsContext", () => ({
  useSettings: jest.fn(),
}));
jest.mock("@/src/components/card/card-styles", () => ({ useStyles: () => ({}) }));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockedUseSettings = useSettings as jest.Mock;
const cardMetrics = getResponsiveFlashcardMetrics(390);

function renderInput(emptyAnswerSubmitWarning: boolean) {
  return render(
    <CardInput
      emptyAnswerSubmitWarning={emptyAnswerSubmitWarning}
      promptText="question"
      allowMultilinePrompt={false}
      promptImageUri={null}
      answer=""
      setAnswer={jest.fn()}
      mainInputRef={React.createRef<TextInput>()}
      suggestionProps={{}}
      handleConfirm={jest.fn()}
      isMainAnswerNumeric={false}
      isMainAnswerDate={false}
      focusTarget="main"
      requestFocus={jest.fn()}
      canToggleTranslations={false}
      next={jest.fn()}
      typoDiff={null}
      imageSizeMode="dynamic"
      cardMetrics={cardMetrics}
    />,
  );
}

describe("CardInput empty submit warning", () => {
  beforeEach(() => {
    mockedUseSettings.mockReturnValue({ colors: { my_yellow: "#fde24f" } });
  });

  it("renders my_yellow border when warning is active", () => {
    const screen = renderInput(true);
    const input = screen.UNSAFE_getByType(TextInput);

    expect(input.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ borderColor: "#fde24f" }),
      ]),
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
  });
});
