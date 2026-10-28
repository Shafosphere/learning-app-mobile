import { completePagerSelection } from "@/src/components/settings/testing/completePagerSelection";
/* eslint-disable @typescript-eslint/no-require-imports */
import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import CustomCourseEditor from "../CustomCourseEditor";
import { useSettings } from "@/src/contexts/SettingsContext";
import { defaultValue } from "@/src/contexts/settings/defaults";
import { resolveCourseSettingsDefaults } from "@/src/contexts/settings/courseSettingsDefaults";
import { OFFICIAL_PACKS } from "@/src/constants/officialPacks";
import { getCustomCourseById, getCustomFlashcards, setCustomCourseReviewsEnabled } from "@/src/db/sqlite/db";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useHydratedPersistedState } from "@/src/hooks/usePersistedState";

let mockDeviceLayout = { isTabletLayout: false, width: 390, orientation: "portrait" };
beforeEach(() => {
  mockDeviceLayout = { isTabletLayout: false, width: 390, orientation: "portrait" };
});
const mockPopup = jest.fn();
const mockT = (key: string) => key;
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: mockT }) }));
jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useFocusEffect: (callback: () => void) => {
    const React = require("react");
    React.useEffect(callback, [callback]);
  },
}));
jest.mock("expo-router", () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock("@expo/vector-icons/Entypo", () => () => null);
jest.mock("@expo/vector-icons/Ionicons", () => () => null);
jest.mock("@/src/contexts/SettingsContext", () => { const useSettings = jest.fn(); return { useSettings, useThemeSettings: useSettings }; });
jest.mock("@/src/contexts/PopupContext", () => ({ usePopup: () => mockPopup }));
jest.mock("@/src/hooks/useDeviceLayout", () => ({ useDeviceLayout: () => mockDeviceLayout }));
jest.mock("../CustomCourseEditor-styles", () => ({ useStyles: () => ({}) }));
jest.mock("@/src/db/sqlite/db", () => ({
  getCustomCourseById: jest.fn(),
  getCustomCourseNameCandidates: jest.fn(async () => []),
  getCustomFlashcards: jest.fn(),
  setCustomCourseReviewsEnabled: jest.fn(async () => {}),
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
  return { CourseSettingsPanel: ({ settingsProps, activeTab, resetActions = [] }: any) => (
    <><Pressable onPress={() => settingsProps.onSelectBoxZeroAnswerSide("back")}>
      <Text>answer-side:{settingsProps.boxZeroAnswerSide}</Text>
      <Text>category:{activeTab}</Text>
    </Pressable>
    <Pressable onPress={() => settingsProps.onChangeAudioSettings({ enabled: true })}><Text>change-audio</Text><Text>audio-value:{String(settingsProps.audioSettings.enabled)}</Text></Pressable>
    <Pressable onPress={() => settingsProps.onChangeFrontImageRole("hint")}><Text>change-image-role</Text></Pressable>
    <Pressable onPress={() => settingsProps.onChangeLetterHintSettings({ enabled: true })}><Text>change-hints</Text></Pressable>
    {activeTab === "progress" ? resetActions.map((action: any) => <Pressable key={action.key} onPress={action.onPress} disabled={action.disabled}><Text>{action.ctaText}</Text></Pressable>) : null}</>
  ) };
});

it("preserves unsaved cards, course name and undo history when the answer-side getter changes", async () => {
  const settings: Record<string, any> = {
    getCustomCourseFrontImageRole: jest.fn(() => "standard"),
    setCustomCourseFrontImageRole: jest.fn(),
    courseFrontImageRoleHydrated: true,
    getCustomCourseAudioSettings: jest.fn(() => ({ enabled: false, frontLanguage: null, backLanguage: null })),
    setCustomCourseAudioSettings: jest.fn(),
    courseAudioSettingsHydrated: true,
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
  fireEvent.press(screen.getByRole("tab", { name: "courseSettingsGroups.appearance.title" }));
  completePagerSelection("appearance");
  expect(screen.getByText("category:appearance")).toBeTruthy();
  mockDeviceLayout = { isTabletLayout: true, width: 960, orientation: "landscape" };
  screen.rerender(<CustomCourseEditor {...props} />);
  expect(screen.getByText("courseSettingsGroups.appearance.title")).toBeTruthy();
  expect(screen.getByRole("tab", { name: "courseSettingsGroups.appearance.title", selected: true })).toBeTruthy();
  mockDeviceLayout = { isTabletLayout: true, width: 600, orientation: "portrait" };
  screen.rerender(<CustomCourseEditor {...props} />);
  expect(screen.queryByText("courseSettingsGroups.appearance.title")).toBeNull();
  expect(screen.getByRole("tab", { name: "courseSettingsGroups.appearance.title", selected: true })).toBeTruthy();
  expect(screen.getByLabelText("courseCreator.customEditor.saveA11y")).toBeTruthy();
  expect(screen.getByLabelText("repeats.a11y.backToCoursesPanel")).toBeTruthy();
  fireEvent.press(screen.getByText("content"));
  expect(screen.queryAllByRole("tab")).toHaveLength(0);
  fireEvent.press(screen.getByText("options"));
  expect(screen.getByRole("tab", { name: "courseSettingsGroups.appearance.title", selected: true })).toBeTruthy();
  fireEvent.press(screen.getByText("content"));
  expect(screen.getByTestId("front").props.value).toBe("Unsaved front");
  expect(screen.getByTestId("name").props.value).toBe("Unsaved course");
  expect(getCustomCourseById).toHaveBeenCalledTimes(1);
  expect(getCustomFlashcards).toHaveBeenCalledTimes(1);
  fireEvent.press(screen.getByLabelText("courseCreator.customEditor.undoA11y"));
  expect(screen.getByTestId("front").props.value).toBe("Saved front");
});


it.each([false, true])("resets persisted settings without reloading content (official: %s)", async (official) => {
  jest.clearAllMocks();
  const pack = OFFICIAL_PACKS.find((pack) => pack.slug === "eng_to_pl_first_50")!;
  const resetCustomCourseSettings = jest.fn(async () => {});
  const settings = { ...defaultValue, resetCustomCourseSettings, courseSettingsResetHydrated: true };
  (useSettings as jest.Mock).mockReturnValue(settings);
  (getCustomCourseById as jest.Mock).mockResolvedValue({
    id: 7, name: "Saved course", iconId: "book", iconColor: "#000", reviewsEnabled: true,
    isOfficial: official, slug: official ? pack.slug : null,
  });
  (getCustomFlashcards as jest.Mock).mockResolvedValue([
    { id: 42, frontText: "Saved front", backText: "answer", answers: ["answer"], flipped: false, type: "text" },
  ]);
  const screen = render(<CustomCourseEditor courseId={7} initialName="Saved course" lockAppearance={official} />);
  await waitFor(() => expect(getCustomFlashcards).toHaveBeenCalledTimes(1));
  if (!official) {
    fireEvent.press(screen.getByText("content"));
    await waitFor(() => expect(screen.getByTestId("front").props.value).toBe("Saved front"));
    fireEvent.changeText(screen.getByTestId("front"), "Unsaved front");
    fireEvent.changeText(screen.getByTestId("name"), "Unsaved name");
    fireEvent.press(screen.getByText("options"));
  }
  await waitFor(() => expect(screen.getByRole("tab", { name: "courseSettingsGroups.progress.title" })).toBeTruthy());
  fireEvent.press(screen.getByRole("tab", { name: "courseSettingsGroups.progress.title" }));
  completePagerSelection("progress");
  fireEvent.press(screen.getByText("courseSettingsReset.action"));
  expect(resetCustomCourseSettings).not.toHaveBeenCalled();
  fireEvent.press(screen.getAllByText("courseSettingsReset.action").slice(-1)[0]);
  await waitFor(() => expect(screen.getByText("courseSettingsReset.doneTitle")).toBeTruthy());
  const defaults = resolveCourseSettingsDefaults(official ? pack : undefined);
  expect(resetCustomCourseSettings).toHaveBeenCalledWith(7, defaults);
  expect(setCustomCourseReviewsEnabled).toHaveBeenCalledWith(7, defaults.reviewsEnabled, { seedCompletedReviews: false });
  expect(getCustomFlashcards).toHaveBeenCalledTimes(1);
  fireEvent.press(screen.getByText("courseSettingsReset.ok"));
  if (!official) {
    fireEvent.press(screen.getByText("content"));
    expect(screen.getByTestId("front").props.value).toBe("Unsaved front");
    expect(screen.getByTestId("name").props.value).toBe("Unsaved name");
    fireEvent.press(screen.getByLabelText("courseCreator.customEditor.undoA11y"));
    expect(screen.getByTestId("front").props.value).toBe("Saved front");
  }
});


it.each([
  ["change-audio", "setCustomCourseAudioSettings"],
  ["change-image-role", "setCustomCourseFrontImageRole"],
  ["change-hints", "setCustomCourseLetterHintSettings"],
])("handles a rejected %s write and reports the failure", async (action, setter) => {
  jest.clearAllMocks();
  const error = new Error("Disk full");
  const settings = { ...defaultValue, [setter]: jest.fn().mockRejectedValue(error) };
  (useSettings as jest.Mock).mockReturnValue(settings);
  (getCustomCourseById as jest.Mock).mockResolvedValue({ id: 7, name: "Course", reviewsEnabled: true });
  (getCustomFlashcards as jest.Mock).mockResolvedValue([]);
  const log = jest.spyOn(console, "error").mockImplementation(() => {});
  try {
    const screen = render(<CustomCourseEditor courseId={7} initialName="Course" lockAppearance={false} />);
    await waitFor(() => expect(getCustomFlashcards).toHaveBeenCalled());
    fireEvent.press(screen.getByText(action));
    await waitFor(() => expect(mockPopup).toHaveBeenCalledWith({
      message: "courseCreator.customEditor.popups.saveFailed", color: "angry", duration: 4000,
    }));
    expect(log).toHaveBeenCalledWith("Failed to save course setting", error);
  } finally {
    log.mockRestore();
  }
});


it("restores the displayed audio setting after a failed optimistic write", async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  let settings: any;
  (useSettings as jest.Mock).mockImplementation(() => settings);
  function Editor() {
    const [audio, setAudio, hydrated] = useHydratedPersistedState("editor-audio", { enabled: false }, true);
    settings = {
      ...defaultValue,
      getCustomCourseAudioSettings: () => audio,
      setCustomCourseAudioSettings: (_id: number, value: { enabled: boolean }) => setAudio(value),
      courseAudioSettingsHydrated: hydrated,
    };
    return <CustomCourseEditor courseId={7} initialName="Course" lockAppearance={false} />;
  }
  (getCustomCourseById as jest.Mock).mockResolvedValue({ id: 7, name: "Course", reviewsEnabled: true });
  (getCustomFlashcards as jest.Mock).mockResolvedValue([]);
  const screen = render(<Editor />);
  await waitFor(() => expect(settings.courseAudioSettingsHydrated).toBe(true));
  let reject!: (error: Error) => void;
  const originalWrite = (AsyncStorage.setItem as jest.Mock).getMockImplementation()!;
  const write = jest.spyOn(AsyncStorage, "setItem").mockImplementationOnce(() => new Promise<void>((_resolve, no) => { reject = no; }));
  const log = jest.spyOn(console, "error").mockImplementation(() => {});
  try {
    fireEvent.press(screen.getByText("change-audio"));
    await waitFor(() => expect(screen.getByText("audio-value:true")).toBeTruthy());
    await act(async () => { reject(new Error("Disk full")); });
    expect(screen.getByText("audio-value:false")).toBeTruthy();
    expect(mockPopup).toHaveBeenCalledWith(expect.objectContaining({ color: "angry" }));
  } finally {
    write.mockReset().mockImplementation(originalWrite);
    log.mockRestore();
  }
});
