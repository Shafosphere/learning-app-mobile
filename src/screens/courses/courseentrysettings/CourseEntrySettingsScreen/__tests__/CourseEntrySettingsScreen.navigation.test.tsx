import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import CourseEntrySettingsScreen from "../CourseEntrySettingsScreen";
import { getCustomCourseById, updateCustomCourse } from "@/src/db/sqlite/db";

const mockReplace = jest.fn();
const mockPopup = jest.fn();
const mockRouter = { replace: mockReplace };
const mockTranslate = (key: string) => key;
let mockIsFocused = true;
let mockCourseId: number | null = 11;
let mockHasSeen = true;
const mockSettings = {
  colors: { headline: "#111" },
  activeCustomCourseIdHydrated: true,
  customCourseEntrySettingsSeenHydrated: true,
  hasSeenCustomCourseEntrySettings: () => mockHasSeen,
  getCustomCourseAutoflowEnabled: () => true,
  getCustomCourseShowExplanationEnabled: () => true,
  setCustomCourseAutoflowEnabled: jest.fn(),
  setCustomCourseShowExplanationEnabled: jest.fn(),
  markCustomCourseEntrySettingsSeen: jest.fn(),
};

jest.mock("expo-router", () => ({ useRouter: () => mockRouter }));
jest.mock("@react-navigation/native", () => ({ useIsFocused: () => mockIsFocused }));
jest.mock("@/src/contexts/SettingsContext", () => ({
  useSettings: () => ({ ...mockSettings, activeCustomCourseId: mockCourseId }),
}));
jest.mock("@/src/contexts/PopupContext", () => ({ usePopup: () => mockPopup }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: mockTranslate }) }));
jest.mock("@/src/db/sqlite/db", () => ({ getCustomCourseById: jest.fn(), updateCustomCourse: jest.fn() }));
jest.mock("@/src/services/onboardingCheckpoint", () => ({
  getOnboardingCheckpoint: () => Promise.resolve("done"),
  subscribeOnboardingCheckpoint: () => () => {},
  setOnboardingCheckpoint: jest.fn(),
}));
jest.mock("@/src/hooks/useCoachmarkFlow", () => ({
  useCoachmarkFlow: () => ({ isActive: false, currentStep: null }),
}));
jest.mock("@/src/components/onboarding/CoachmarkLayerPortal", () => ({ useCoachmarkLayerPortal: jest.fn() }));
jest.mock("@edwardloopez/react-native-coachmark", () => ({
  CoachmarkAnchor: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@/src/components/button/button", () => {
  const { Pressable } = jest.requireActual("react-native");
  return function MockButton(props: object) {
    return <Pressable {...props} accessibilityRole="button" />;
  };
});
jest.mock("@/src/components/toggle/ToggleSwitch", () => {
  const { Pressable } = jest.requireActual("react-native");
  return function MockToggle({ value, ...props }: { value: boolean }) {
    return <Pressable {...props} accessibilityRole="switch" accessibilityState={{ checked: value }} />;
  };
});
jest.mock("../CourseEntrySettingsScreen-styles", () => ({ useStyles: () => ({}) }));

describe("Course entry settings navigation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsFocused = true;
    mockCourseId = 11;
    mockHasSeen = true;
    (getCustomCourseById as jest.Mock).mockResolvedValue({
      id: 11,
      name: "Course",
      iconId: "book",
      iconColor: "#111",
      colorId: null,
      reviewsEnabled: true,
    });
  });

  it("redirects a configured course when this screen is visible", async () => {
    render(<CourseEntrySettingsScreen />);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/flashcards");
    });
  });

  it("does not navigate when a course is activated while this screen is in the background", async () => {
    mockIsFocused = false;
    mockCourseId = null;
    const screen = render(<CourseEntrySettingsScreen />);
    mockCourseId = 11;
    await act(async () => { screen.rerender(<CourseEntrySettingsScreen />); });
    expect(mockReplace).not.toHaveBeenCalled();
    expect(getCustomCourseById).not.toHaveBeenCalled();

    mockIsFocused = true;
    await act(async () => { screen.rerender(<CourseEntrySettingsScreen />); });
    expect(mockReplace).toHaveBeenCalledWith("/flashcards");
  });

  it("ignores a pending load failure after leaving the screen", async () => {
    mockHasSeen = false;
    let rejectLoad!: (error: Error) => void;
    (getCustomCourseById as jest.Mock).mockReturnValue(new Promise((_, reject) => { rejectLoad = reject; }));
    const screen = render(<CourseEntrySettingsScreen />);
    mockIsFocused = false;
    await act(async () => { screen.rerender(<CourseEntrySettingsScreen />); });
    await act(async () => { rejectLoad(new Error("load failed")); });
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockPopup).not.toHaveBeenCalled();
  });

  it("preserves and saves all unsaved choices after returning from Settings", async () => {
    mockHasSeen = false;
    const screen = render(<CourseEntrySettingsScreen />);
    await waitFor(() => expect(screen.getAllByRole("switch")).toHaveLength(3));
    screen.getAllByRole("switch").forEach((toggle) => fireEvent.press(toggle));

    mockIsFocused = false;
    await act(async () => { screen.rerender(<CourseEntrySettingsScreen />); });
    mockIsFocused = true;
    await act(async () => { screen.rerender(<CourseEntrySettingsScreen />); });

    screen.getAllByRole("switch").forEach((toggle) => {
      expect(toggle.props.accessibilityState.checked).toBe(false);
    });
    expect(getCustomCourseById).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByRole("button"));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/flashcards"));
    expect(mockSettings.setCustomCourseAutoflowEnabled).toHaveBeenCalledWith(11, false);
    expect(mockSettings.setCustomCourseShowExplanationEnabled).toHaveBeenCalledWith(11, false);
    expect(updateCustomCourse).toHaveBeenCalledWith(11, expect.objectContaining({ reviewsEnabled: false }));
  });

  it("initializes a different course when returning to the screen", async () => {
    mockHasSeen = false;
    const screen = render(<CourseEntrySettingsScreen />);
    await waitFor(() => expect(screen.getAllByRole("switch")).toHaveLength(3));
    screen.getAllByRole("switch").forEach((toggle) => fireEvent.press(toggle));

    mockIsFocused = false;
    await act(async () => { screen.rerender(<CourseEntrySettingsScreen />); });
    mockCourseId = 22;
    (getCustomCourseById as jest.Mock).mockResolvedValue({
      id: 22, name: "Other course", iconId: "book", iconColor: "#111", reviewsEnabled: true,
    });
    await act(async () => { screen.rerender(<CourseEntrySettingsScreen />); });
    expect(getCustomCourseById).toHaveBeenCalledTimes(1);

    mockIsFocused = true;
    await act(async () => { screen.rerender(<CourseEntrySettingsScreen />); });
    expect(getCustomCourseById).toHaveBeenLastCalledWith(22);
    screen.getAllByRole("switch").forEach((toggle) => {
      expect(toggle.props.accessibilityState.checked).toBe(true);
    });
  });
});
