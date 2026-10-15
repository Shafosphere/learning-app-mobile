import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import FlashcardsRoute from "@/app/flashcards";
import { useSettings } from "@/src/contexts/SettingsContext";

const mockReplace = jest.fn();
const mockInitialize = jest.fn();
const mockMount = jest.fn();
const mockUnmount = jest.fn();
const mockRender = jest.fn();
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
  const { Button, Text, View } =
    jest.requireActual<typeof import("react-native")>("react-native");
  const { useSettings } = jest.requireMock("@/src/contexts/SettingsContext");
  return function MockFlashcardsScreen() {
    const { activeCustomCourseId } = useSettings();
    const [initialCourseId] = React.useState(() => {
      mockInitialize(activeCustomCourseId);
      return activeCustomCourseId;
    });
    const [answers, setAnswers] = React.useState(0);
    mockRender(activeCustomCourseId);
    React.useEffect(() => {
      mockMount(initialCourseId);
      return () => {
        mockUnmount(initialCourseId);
      };
    }, [initialCourseId]);
    return React.createElement(
      View,
      null,
      React.createElement(Text, null, "Flashcards content"),
      React.createElement(Text, null, `Course ${activeCustomCourseId}`),
      React.createElement(Text, null, `Answers ${answers}`),
      React.createElement(Button, {
        title: "Answer",
        onPress: () => setAnswers((count) => count + 1),
      }),
    );
  };
});

const mockedUseSettings = useSettings as jest.Mock;

function setCourse(
  courseId: number | null,
  configured = true,
  settingsHydrated = true,
) {
  mockedUseSettings.mockReturnValue({
    activeCustomCourseId: courseId,
    activeCustomCourseIdHydrated: true,
    customCourseEntrySettingsSeenHydrated: settingsHydrated,
    hasSeenCustomCourseEntrySettings: jest.fn(() => configured),
  });
}

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

  it("never initializes an initially unfocused route while switching courses", () => {
    mockIsFocused = false;
    setCourse(11);
    const screen = render(<FlashcardsRoute />);

    for (const courseId of [12, 13, 14, 11]) {
      setCourse(courseId, courseId % 2 !== 0);
      screen.rerender(<FlashcardsRoute />);
      expect(screen.queryByText("Flashcards content")).toBeNull();
      expect(mockRender).not.toHaveBeenCalled();
      expect(mockInitialize).not.toHaveBeenCalled();
      expect(mockMount).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
    }

    mockIsFocused = true;
    screen.rerender(<FlashcardsRoute />);
    expect(screen.getByText("Course 11")).toBeTruthy();
    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(mockMount).toHaveBeenCalledTimes(1);
  });

  it.each([true, false])(
    "invalidates a background session until focus (return course configured: %s)",
    (configured) => {
      setCourse(11);
      const screen = render(<FlashcardsRoute />);
      expect(mockMount).toHaveBeenCalledTimes(1);

      mockIsFocused = false;
      screen.rerender(<FlashcardsRoute />);
      expect(mockUnmount).not.toHaveBeenCalled();
      mockRender.mockClear();

      for (const courseId of [12, 13, 14, 11]) {
        setCourse(courseId, courseId % 2 !== 0);
        screen.rerender(<FlashcardsRoute />);
        expect(screen.queryByText("Flashcards content")).toBeNull();
        expect(mockRender).not.toHaveBeenCalled();
        expect(mockInitialize).toHaveBeenCalledTimes(1);
        expect(mockMount).toHaveBeenCalledTimes(1);
        expect(mockUnmount).toHaveBeenCalledTimes(1);
        expect(mockReplace).not.toHaveBeenCalled();
      }

      setCourse(15, configured);
      screen.rerender(<FlashcardsRoute />);
      expect(mockInitialize).toHaveBeenCalledTimes(1);
      mockIsFocused = true;
      screen.rerender(<FlashcardsRoute />);

      if (configured) {
        expect(screen.getByText("Course 15")).toBeTruthy();
        expect(mockInitialize.mock.calls).toEqual([[11], [15]]);
        expect(mockMount.mock.calls).toEqual([[11], [15]]);
        expect(mockReplace).not.toHaveBeenCalled();
      } else {
        expect(screen.getByTestId("flashcards-route-loading")).toBeTruthy();
        expect(screen.queryByText("Flashcards content")).toBeNull();
        expect(mockInitialize).toHaveBeenCalledTimes(1);
        expect(mockMount).toHaveBeenCalledTimes(1);
        expect(mockReplace).toHaveBeenCalledWith("/course-entry-settings");
      }
    },
  );

  it.each([11, null])(
    "preserves the mounted session and study state across ordinary blur (course: %s)",
    (courseId) => {
      setCourse(courseId);
      const screen = render(<FlashcardsRoute />);
      fireEvent.press(screen.getByText("Answer"));
      expect(screen.getByText("Answers 1")).toBeTruthy();

      for (const focused of [false, true, false, true]) {
        mockIsFocused = focused;
        screen.rerender(<FlashcardsRoute />);
        expect(screen.getByText("Answers 1")).toBeTruthy();
        expect(mockInitialize).toHaveBeenCalledTimes(1);
        expect(mockMount).toHaveBeenCalledTimes(1);
        expect(mockUnmount).not.toHaveBeenCalled();
      }
    },
  );

  it("rechecks hydration before opening the new session on return", () => {
    setCourse(11);
    const screen = render(<FlashcardsRoute />);
    mockIsFocused = false;
    setCourse(12, true, false);
    screen.rerender(<FlashcardsRoute />);

    mockIsFocused = true;
    screen.rerender(<FlashcardsRoute />);
    expect(screen.getByTestId("flashcards-route-loading")).toBeTruthy();
    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(mockMount).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();

    setCourse(12);
    screen.rerender(<FlashcardsRoute />);
    expect(screen.getByText("Course 12")).toBeTruthy();
    expect(mockInitialize.mock.calls).toEqual([[11], [12]]);
    expect(mockMount.mock.calls).toEqual([[11], [12]]);
  });

  it.each([true, false])(
    "waits for focus when hydration finishes in the background (configured: %s)",
    (configured) => {
      mockIsFocused = false;
      mockedUseSettings.mockReturnValue({
        activeCustomCourseId: null,
        activeCustomCourseIdHydrated: false,
        customCourseEntrySettingsSeenHydrated: false,
        hasSeenCustomCourseEntrySettings: jest.fn(() => configured),
      });
      const screen = render(<FlashcardsRoute />);
      setCourse(11, configured);
      screen.rerender(<FlashcardsRoute />);
      expect(mockInitialize).not.toHaveBeenCalled();
      expect(mockMount).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();

      mockIsFocused = true;
      screen.rerender(<FlashcardsRoute />);
      if (configured) {
        expect(screen.getByText("Course 11")).toBeTruthy();
        expect(mockInitialize).toHaveBeenCalledTimes(1);
        expect(mockMount).toHaveBeenCalledTimes(1);
      } else {
        expect(screen.getByTestId("flashcards-route-loading")).toBeTruthy();
        expect(mockInitialize).not.toHaveBeenCalled();
        expect(mockMount).not.toHaveBeenCalled();
        expect(mockReplace).toHaveBeenCalledWith("/course-entry-settings");
      }
    },
  );

  it("keeps an active screen mounted when switching between configured courses", () => {
    setCourse(11);
    const screen = render(<FlashcardsRoute />);
    setCourse(12);
    screen.rerender(<FlashcardsRoute />);
    expect(screen.getByText("Course 12")).toBeTruthy();
    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(mockMount).toHaveBeenCalledTimes(1);
    expect(mockUnmount).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
