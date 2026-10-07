import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { CourseSettingsSection, type CourseSettingsSectionProps } from "../SettingsCourse";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("@/src/components/toggle/ToggleSwitch", () => {
  const { Pressable } = jest.requireActual<typeof import("react-native")>("react-native");
  return function MockToggleSwitch({ value, onPress, accessibilityLabel, disabled = false }: {
    value: boolean;
    onPress: () => void;
    accessibilityLabel: string;
    disabled?: boolean;
  }) {
    return (
      <Pressable
        accessibilityRole="switch"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ checked: value, disabled }}
        disabled={disabled}
        onPress={onPress}
      />
    );
  };
});

it("hides dependent options while disabled and preserves their selections across toggles", () => {
  const onSelect = jest.fn();
  const props: CourseSettingsSectionProps = {
    styles: {}, colors: {} as CourseSettingsSectionProps["colors"],
    switchColors: { thumb: "#fff", trackFalse: "#aaa", trackTrue: "#000" },
    boxZeroEnabled: false, onToggleBoxZero: jest.fn(),
    boxZeroAnswerSide: "front", onSelectBoxZeroAnswerSide: onSelect,
    autoflowEnabled: false, onToggleAutoflow: jest.fn(),
    reviewsEnabled: false, onToggleReviews: jest.fn(),
    showExplanationEnabled: false, onToggleShowExplanation: jest.fn(),
    explanationOnlyOnWrong: true, onToggleExplanationOnlyOnWrong: jest.fn(),
    skipCorrectionEnabled: false, onToggleSkipCorrection: jest.fn(),
    trueFalseButtonsVariant: "true_false", onSelectTrueFalseButtonsVariant: jest.fn(),
    cardSize: "large", onSelectCardSize: jest.fn(),
  };
  const screen = render(<CourseSettingsSection {...props} />);
  const label = "components.courseEditor.settingsCourse.boxZeroAnswerSide.";
  const explanationLabel = "components.courseEditor.settingsCourse.accessibilityLabel.przelaczWyjasnienieTylkoPoBlednej";
  expect(screen.queryByText(label + "title")).toBeNull();
  expect(screen.queryByRole("button", { name: new RegExp(label + "front") })).toBeNull();
  expect(screen.queryByRole("button", { name: new RegExp(label + "back") })).toBeNull();
  expect(screen.queryByRole("switch", { name: explanationLabel })).toBeNull();
  expect(onSelect).not.toHaveBeenCalled();
  expect(props.onToggleExplanationOnlyOnWrong).not.toHaveBeenCalled();
  screen.rerender(<CourseSettingsSection {...props} boxZeroEnabled showExplanationEnabled />);
  expect(screen.getByRole("button", { name: new RegExp(label + "front"), selected: true })).toBeEnabled();
  expect(screen.getByRole("switch", { name: explanationLabel, checked: true })).toBeEnabled();
  fireEvent.press(screen.getByRole("switch", { name: explanationLabel }));
  expect(props.onToggleExplanationOnlyOnWrong).toHaveBeenCalledWith(false);
  fireEvent.press(screen.getByText(label + "back"));
  expect(onSelect).toHaveBeenCalledWith("back");
  screen.rerender(<CourseSettingsSection {...props} boxZeroEnabled boxZeroAnswerSide="back" />);
  screen.rerender(<CourseSettingsSection {...props} boxZeroAnswerSide="back" />);
  expect(screen.queryByText(label + "title")).toBeNull();
  expect(screen.queryByRole("switch", { name: explanationLabel })).toBeNull();
  screen.rerender(<CourseSettingsSection {...props} boxZeroEnabled boxZeroAnswerSide="back" showExplanationEnabled />);
  expect(screen.getByRole("button", { name: new RegExp(label + "back"), selected: true })).toBeEnabled();
  expect(screen.getByRole("switch", { name: explanationLabel, checked: true })).toBeEnabled();
});
