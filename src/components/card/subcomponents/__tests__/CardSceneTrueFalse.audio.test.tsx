import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { useSettings } from "@/src/contexts/SettingsContext";
import { resolveThemeColors } from "@/src/theme/theme";
import { getResponsiveFlashcardMetrics } from "../../responsiveCardWidth";
import { CardSceneTrueFalse } from "../CardSceneTrueFalse";

jest.mock("@/src/contexts/SettingsContext", () => ({
  useSettings: jest.fn(),
}));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string, params?: { text: string }) => params?.text ?? key }) }));

beforeEach(() => {
  (useSettings as jest.Mock).mockReturnValue({ colors: resolveThemeColors("light") });
});

it("reads true/false and self-assessment prompts on tap and removes the gesture when audio is off", () => {
  const onReadPrompt = jest.fn();
  const props = {
    promptText: "Visible statement", promptImageUri: null, allowMultilinePrompt: true,
    imageSizeMode: "dynamic" as const, cardMetrics: getResponsiveFlashcardMetrics(375),
  };
  const screen = render(<CardSceneTrueFalse {...props} onReadPrompt={onReadPrompt} />);
  fireEvent.press(screen.getByRole("button", { name: props.promptText }));
  expect(onReadPrompt).toHaveBeenCalledTimes(1);
  screen.rerender(<CardSceneTrueFalse {...props} />);
  expect(screen.queryByRole("button", { name: props.promptText })).toBeNull();
  expect(screen.getByText(props.promptText)).toBeTruthy();
});
