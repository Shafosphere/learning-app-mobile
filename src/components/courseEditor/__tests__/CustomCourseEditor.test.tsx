/* eslint-disable @typescript-eslint/no-require-imports */
import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import CustomCourseEditor from "../CustomCourseEditor";
import { useSettings } from "@/src/contexts/SettingsContext";
import { getCustomCourseById, getCustomFlashcards } from "@/src/db/sqlite/db";

const mockT = (key: string) => key;
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: mockT }) }));
jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (callback: () => void) => {
    const React = require("react");
    React.useEffect(callback, [callback]);
  },
}));
jest.mock("expo-router", () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock("@expo/vector-icons/Entypo", () => () => null);
jest.mock("@expo/vector-icons/Ionicons", () => () => null);
jest.mock("@/src/contexts/SettingsContext", () => ({ useSettings: jest.fn() }));
jest.mock("@/src/contexts/PopupContext", () => ({ usePopup: () => jest.fn() }));
jest.mock("@/src/hooks/useDeviceLayout", () => ({ useDeviceLayout: () => ({ isTabletLayout: false }) }));
jest.mock("../CustomCourseEditor-styles", () => ({ useStyles: () => ({}) }));
jest.mock("@/src/db/sqlite/db", () => ({
  getCustomCourseById: jest.fn(),
  getCustomCourseNameCandidates: jest.fn(async () => []),
  getCustomFlashcards: jest.fn(),
}));
jest.mock("@/src/hooks/useBoxesPersistenceSnapshot", () => ({ makeScopeId: () => "scope" }));
jest.mock("@/src/features/flashcards/courseCompletionRun", () => ({ clearCourseCompletionRun: jest.fn() }));
jest.mock("@/src/components/courseEditor/CardTypeSelector", () => ({ CardTypeSelector: () => null }));
jest.mock("@/src/components/button/button", () => {
  const { Pressable, Text } = require("react-native");
  return function MockButton({ onPress, accessibilityLabel, text, children }: any) {
    return (
    <Pressable onPress={onPress} accessibilityLabel={accessibilityLabel}><Text>{text}</Text>{children}</Pressable>
    );
  };
});
jest.mock("@/src/components/segmentedTabs/SegmentedTabs", () => {
  const { Pressable, Text } = require("react-native");
  return { SegmentedTabs: ({ options, onChange }: any) => options.map(({ key }: any) => (
    <Pressable key={key} onPress={() => onChange(key)}><Text>{key}</Text></Pressable>
  )) };
});
jest.mock("@/src/components/courseEditor/iconEdit/iconEdit", () => {
  const { TextInput } = require("react-native");
  return { CourseIconColorSelector: ({ courseName, onCourseNameChange }: any) => (
    <TextInput testID="name" value={courseName} onChangeText={onCourseNameChange} />
  ) };
});
jest.mock("@/src/components/courseEditor/editFlashcards/editFlashcards", () => {
  const { TextInput } = require("react-native");
  return { ManualCardsEditor: ({ manualCards, onCardFrontChange }: any) => manualCards.map((card: any) => (
    <TextInput key={card.id} testID="front" value={card.front} onChangeText={(value: string) => onCardFrontChange(card.id, value)} />
  )) };
});
jest.mock("@/src/components/courseEditor/CourseSettingsPanel", () => {
  const { Pressable, Text } = require("react-native");
  return { CourseSettingsPanel: ({ settingsProps }: any) => (
    <Pressable onPress={() => settingsProps.onSelectBoxZeroAnswerSide("back")}>
      <Text>answer-side:{settingsProps.boxZeroAnswerSide}</Text>
    </Pressable>
  ) };
});

it("preserves unsaved cards, course name and undo history when the answer-side getter changes", async () => {
  const settings: Record<string, any> = {
    colors: { background: "#fff", border: "#ccc", headline: "#000", my_green: "#0f0" },
    getCustomCourseBoxZeroAnswerSide: jest.fn(() => "front"),
    getCustomCourseTrueFalseButtonsVariant: jest.fn(() => "true_false"),
    letterHintSettingsHydrated: true,
    getCustomCourseLetterHintSettings: jest.fn(() => ({ enabled: false, profile: "standard", boxOneLimit: 2, boxTwoLimit: 1 })),
    setCustomCourseLetterHintSettings: jest.fn(),
    getCustomCourseCardSize: jest.fn(() => "large"),
    getCustomCourseImageSize: jest.fn(() => "medium"),
    setCustomCourseBoxZeroAnswerSide: jest.fn(async () => {}),
  };
  for (const option of ["BoxZeroEnabled", "AutoflowEnabled", "ShowExplanationEnabled", "ExplanationOnlyOnWrong", "SkipCorrectionEnabled", "ImageFrameEnabled"]) {
    settings[`getCustomCourse${option}`] = jest.fn(() => false);
    settings[`setCustomCourse${option}`] = jest.fn();
  }
  (useSettings as jest.Mock).mockImplementation(() => settings);
  (getCustomCourseById as jest.Mock).mockResolvedValue({
    id: 7, name: "Saved course", iconId: "book", iconColor: "#000", reviewsEnabled: true,
  });
  (getCustomFlashcards as jest.Mock).mockResolvedValue([
    { id: 42, frontText: "Saved front", backText: "answer", answers: ["answer"], flipped: false, type: "text" },
  ]);
  const props = { courseId: 7, initialName: "Saved course", lockAppearance: false };
  const screen = render(<CustomCourseEditor {...props} />);
  fireEvent.press(screen.getByText("content"));
  await waitFor(() => expect(screen.getByTestId("front").props.value).toBe("Saved front"));
  fireEvent.changeText(screen.getByTestId("front"), "Unsaved front");
  fireEvent.changeText(screen.getByTestId("name"), "Unsaved course");
  fireEvent.press(screen.getByText("options"));
  fireEvent.press(screen.getByText("answer-side:front"));
  expect(settings.setCustomCourseBoxZeroAnswerSide).toHaveBeenCalledWith(7, "back");

  // The context creates a new getter after persisting the override.
  settings.getCustomCourseBoxZeroAnswerSide = jest.fn(() => "back");
  screen.rerender(<CustomCourseEditor {...props} />);
  await waitFor(() => expect(screen.getByText("answer-side:back")).toBeTruthy());
  fireEvent.press(screen.getByText("content"));
  expect(screen.getByTestId("front").props.value).toBe("Unsaved front");
  expect(screen.getByTestId("name").props.value).toBe("Unsaved course");
  expect(getCustomCourseById).toHaveBeenCalledTimes(1);
  expect(getCustomFlashcards).toHaveBeenCalledTimes(1);
  fireEvent.press(screen.getByLabelText("courseCreator.customEditor.undoA11y"));
  expect(screen.getByTestId("front").props.value).toBe("Saved front");
});
