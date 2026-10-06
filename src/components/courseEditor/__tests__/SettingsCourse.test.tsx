import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { CourseSettingsSection, type CourseSettingsSectionProps } from "../SettingsCourse";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("@/src/components/toggle/ToggleSwitch", () => () => null);

it("blocks answer-side selection with box 0 off and preserves selection across toggles", () => {
  const onSelect = jest.fn();
  const props: CourseSettingsSectionProps = {
    styles: {}, colors: {} as CourseSettingsSectionProps["colors"],
    switchColors: { thumb: "#fff", trackFalse: "#aaa", trackTrue: "#000" },
    boxZeroEnabled: false, onToggleBoxZero: jest.fn(),
    boxZeroAnswerSide: "front", onSelectBoxZeroAnswerSide: onSelect,
    autoflowEnabled: false, onToggleAutoflow: jest.fn(),
    reviewsEnabled: false, onToggleReviews: jest.fn(),
    showExplanationEnabled: false, onToggleShowExplanation: jest.fn(),
    explanationOnlyOnWrong: false, onToggleExplanationOnlyOnWrong: jest.fn(),
    skipCorrectionEnabled: false, onToggleSkipCorrection: jest.fn(),
    trueFalseButtonsVariant: "true_false", onSelectTrueFalseButtonsVariant: jest.fn(),
    cardSize: "large", onSelectCardSize: jest.fn(),
  };
  const screen = render(<CourseSettingsSection {...props} />);
  const label = "components.courseEditor.settingsCourse.boxZeroAnswerSide.";
  expect(screen.getByText(label + "disabledHint")).toBeTruthy();
  expect(screen.getByRole("button", { name: new RegExp(label + "front"), selected: true })).toBeDisabled();
  fireEvent.press(screen.getByText(label + "back"));
  expect(onSelect).not.toHaveBeenCalled();
  screen.rerender(<CourseSettingsSection {...props} boxZeroEnabled />);
  expect(screen.queryByText(label + "disabledHint")).toBeNull();
  fireEvent.press(screen.getByText(label + "back"));
  expect(onSelect).toHaveBeenCalledWith("back");
  screen.rerender(<CourseSettingsSection {...props} boxZeroEnabled boxZeroAnswerSide="back" />);
  screen.rerender(<CourseSettingsSection {...props} boxZeroAnswerSide="back" />);
  screen.rerender(<CourseSettingsSection {...props} boxZeroEnabled boxZeroAnswerSide="back" />);
  expect(screen.getByRole("button", { name: new RegExp(label + "back"), selected: true })).toBeEnabled();
});
