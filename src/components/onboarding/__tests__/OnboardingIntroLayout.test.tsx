import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { Image, ScrollView } from "react-native";
import { OnboardingIntroLayout } from "../OnboardingIntroLayout";
import { useSettings } from "@/src/contexts/SettingsContext";

jest.mock("@/src/contexts/SettingsContext", () => ({ useSettings: jest.fn() }));
const mockedUseSettings = useSettings as jest.Mock;
const aspectRatio = 1179 / 879;
const props = {
  title: "Zapamiętuj więcej",
  description: "Opis działania pudełek.",
  buttonText: "Zaczynajmy",
  onContinue: jest.fn(),
  isSaving: false,
  illustration: { source: 1, aspectRatio, testID: "leitner-diagram" },
};
const settings = {
  colors: { background: "#eee", headline: "#123", paragraph: "#345", secondBackground: "#fff", my_green: "#0ca", border: "#aaa" },
  accessibilityPreferences: {},
  fontScaleMultiplier: 1,
};
function layout(element: Parameters<typeof fireEvent>[0], width: number, height: number) {
  fireEvent(element, "layout", { nativeEvent: { layout: { x: 0, y: 0, width, height } } });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedUseSettings.mockReturnValue(settings);
});

it("fits the illustration to measured space and updates after rotation and text growth", () => {
  const screen = render(<OnboardingIntroLayout {...props} />);
  layout(screen.getByTestId("onboarding-intro-content"), 360, 580);
  layout(screen.getByTestId("onboarding-intro-scroll"), 324, 504);
  layout(screen.getByTestId("onboarding-intro-body"), 324, 327);
  expect(screen.getByTestId("leitner-diagram")).toHaveStyle({ width: 150 * aspectRatio, aspectRatio });

  layout(screen.getByTestId("onboarding-intro-content"), 460, 300);
  layout(screen.getByTestId("onboarding-intro-scroll"), 424, 224);
  layout(screen.getByTestId("onboarding-intro-body"), 424, 300);
  expect(screen.getByTestId("leitner-diagram")).toHaveStyle({ width: 180 });

  layout(screen.getByTestId("onboarding-intro-content"), 390, 760);
  layout(screen.getByTestId("onboarding-intro-scroll"), 354, 684);
  layout(screen.getByTestId("onboarding-intro-body"), 354, 330);
  expect(screen.getByTestId("leitner-diagram")).toHaveStyle({ width: 283.2 });
  layout(screen.getByTestId("onboarding-intro-body"), 354, 620);
  expect(screen.getByTestId("leitner-diagram")).toHaveStyle({ width: 180 });
  const image = screen.getByTestId("leitner-diagram").findByType(Image);
  expect(image.props.resizeMode).toBe("contain");
});

it("keeps the entire body scrollable and the footer outside the scroll viewport", () => {
  const screen = render(<OnboardingIntroLayout {...props} />);
  const scroll = screen.UNSAFE_getByType(ScrollView);
  expect(scroll.findByProps({ testID: "onboarding-intro-body" })).toBeTruthy();
  expect(() => scroll.findByProps({ testID: "onboarding-intro-footer" })).toThrow();
  expect(scroll.props.showsVerticalScrollIndicator).toBe(true);
  const title = screen.getByText(props.title);
  expect(title.props.numberOfLines).toBeUndefined();
  expect(title.props.adjustsFontSizeToFit).toBeUndefined();
  expect(title.props.allowFontScaling).toBe(true);
  const button = screen.getByRole("button");
  expect(button).toHaveStyle({ minHeight: 56 });
  expect(button).not.toHaveStyle({ height: 56 });
  fireEvent.press(button);
  expect(props.onContinue).toHaveBeenCalledTimes(1);
});

it("respects app font scaling and disables continuation while saving", () => {
  mockedUseSettings.mockReturnValue({ ...settings, fontScaleMultiplier: 1.5 });
  const screen = render(<OnboardingIntroLayout {...props} isSaving />);
  expect(screen.getByText(props.title)).toHaveStyle({ fontSize: 42, lineHeight: 51 });
  expect(screen.getByText(props.buttonText)).toHaveStyle({ fontSize: 30 });
  expect(screen.getByRole("button")).toBeDisabled();
  fireEvent.press(screen.getByRole("button"));
  expect(props.onContinue).not.toHaveBeenCalled();
});
