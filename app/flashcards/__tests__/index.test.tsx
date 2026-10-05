import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import FlashcardsRoute from "@/app/flashcards";
import { useSettings } from "@/src/contexts/SettingsContext";

const mockReplace = jest.fn();
let mockIsFocused = true;

jest.mock("@react-navigation/native", () => ({
  useIsFocused: () => mockIsFocused,
}));

jest.mock("expo-router", () => ({
  useRouter: jest.fn(() => ({ replace: mockReplace })),
}));

jest.mock("@/src/contexts/SettingsContext", () => ({
  useSettings: jest.fn(),
}));

jest.mock("@/src/screens/flashcards/FlashcardsScreen/FlashcardsScreen", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { Text } = jest.requireActual<typeof import("react-native")>("react-native");
  return function MockFlashcardsScreen() {
    return React.createElement(Text, null, "Flashcards content");
  };
});

const mockedUseSettings = useSettings as jest.Mock;

describe("FlashcardsRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsFocused = true;
  });

  it("does not redirect from a background screen when the active course changes", () => {
    mockIsFocused = false;
    mockedUseSettings.mockReturnValue({
      activeCustomCourseId: 11,
      activeCustomCourseIdHydrated: true,
      customCourseEntrySettingsSeenHydrated: true,
      hasSeenCustomCourseEntrySettings: jest.fn(() => true),
    });
    const screen = render(<FlashcardsRoute />);
    mockedUseSettings.mockReturnValue({
      activeCustomCourseId: 12,
      activeCustomCourseIdHydrated: true,
      customCourseEntrySettingsSeenHydrated: true,
      hasSeenCustomCourseEntrySettings: jest.fn(() => false),
    });
    screen.rerender(<FlashcardsRoute />);
    expect(mockReplace).not.toHaveBeenCalled();

    mockIsFocused = true;
    screen.rerender(<FlashcardsRoute />);
    expect(mockReplace).toHaveBeenCalledWith("/course-entry-settings");
  });

  it("waits for settings hydration, then redirects an unconfigured course", async () => {
    mockedUseSettings.mockReturnValue({
      activeCustomCourseId: 11,
      activeCustomCourseIdHydrated: true,
      customCourseEntrySettingsSeenHydrated: false,
      hasSeenCustomCourseEntrySettings: jest.fn(() => false),
    });

    const screen = render(<FlashcardsRoute />);

    expect(screen.getByTestId("flashcards-route-loading")).toBeTruthy();
    expect(screen.queryByText("Flashcards content")).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();

    mockedUseSettings.mockReturnValue({
      activeCustomCourseId: 11,
      activeCustomCourseIdHydrated: true,
      customCourseEntrySettingsSeenHydrated: true,
      hasSeenCustomCourseEntrySettings: jest.fn(() => false),
    });
    screen.rerender(<FlashcardsRoute />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/course-entry-settings");
    });
    expect(screen.queryByText("Flashcards content")).toBeNull();
  });

  it("waits for the active course id before rendering flashcards", async () => {
    mockedUseSettings.mockReturnValue({
      activeCustomCourseId: null,
      activeCustomCourseIdHydrated: false,
      customCourseEntrySettingsSeenHydrated: true,
      hasSeenCustomCourseEntrySettings: jest.fn(() => false),
    });

    const screen = render(<FlashcardsRoute />);
    expect(screen.getByTestId("flashcards-route-loading")).toBeTruthy();
    expect(screen.queryByText("Flashcards content")).toBeNull();

    mockedUseSettings.mockReturnValue({
      activeCustomCourseId: 11,
      activeCustomCourseIdHydrated: true,
      customCourseEntrySettingsSeenHydrated: true,
      hasSeenCustomCourseEntrySettings: jest.fn(() => false),
    });
    screen.rerender(<FlashcardsRoute />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/course-entry-settings");
    });
    expect(screen.queryByText("Flashcards content")).toBeNull();
  });

  it("renders flashcards for a configured course", () => {
    mockedUseSettings.mockReturnValue({
      activeCustomCourseId: 11,
      activeCustomCourseIdHydrated: true,
      customCourseEntrySettingsSeenHydrated: true,
      hasSeenCustomCourseEntrySettings: jest.fn(() => true),
    });

    const screen = render(<FlashcardsRoute />);

    expect(screen.getByText("Flashcards content")).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
