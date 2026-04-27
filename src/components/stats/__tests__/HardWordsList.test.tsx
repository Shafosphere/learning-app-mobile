/* eslint-disable @typescript-eslint/no-require-imports */
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { StyleSheet } from "react-native";

import HardWordsList from "@/src/components/stats/HardWordsList";
import { getHardFlashcards } from "@/src/db/sqlite/db";
import { useSettings } from "@/src/contexts/SettingsContext";

jest.mock("@expo/vector-icons/Ionicons", () => () => null);
jest.mock("@expo/vector-icons/MaterialCommunityIcons", () => () => null);

jest.mock("@/src/contexts/SettingsContext", () => ({
  useSettings: jest.fn(),
}));

jest.mock("@/src/db/sqlite/db", () => ({
  getHardFlashcards: jest.fn(),
}));

jest.mock("expo-image", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    Image: ({ recyclingKey }: { recyclingKey?: string }) =>
      React.createElement(View, { testID: `expo-image-${recyclingKey}` }),
  };
});

jest.mock("react-native-svg", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    SvgUri: ({ uri }: { uri: string }) =>
      React.createElement(View, { testID: `svg-uri-${uri}` }),
    SvgXml: () => React.createElement(View, { testID: "svg-xml" }),
  };
});

const mockedUseSettings = useSettings as jest.Mock;
const mockedGetHardFlashcards = getHardFlashcards as jest.Mock;

const colors = {
  background: "#f2f4f6",
  secondBackground: "#fffffe",
  headline: "#00214d",
  paragraph: "#1b2d45",
  my_green: "#00ebc7",
  my_red: "#ff5470",
  my_yellow: "#fde24f",
  border: "#e9e9e9",
  font: "#00214d",
  darkbg: "#001534",
  lightbg: "#fffffe",
  variants: {
    highContrast: {},
    deuteranopia: {},
    protanopia: {},
    tritanopia: {},
  },
};

function mockSettings(activeCustomCourseId: number | null) {
  mockedUseSettings.mockReturnValue({
    activeCustomCourseId,
    colors,
    accessibilityPreferences: {},
    fontScaleMultiplier: 1,
  });
}

function layoutPager(getByTestId: ReturnType<typeof render>["getByTestId"]) {
  fireEvent(getByTestId("hard-words-pager-frame"), "layout", {
    nativeEvent: { layout: { width: 320, height: 180 } },
  });
}

describe("HardWordsList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSettings(null);
  });

  it("loads global hard flashcards by default", async () => {
    mockedGetHardFlashcards.mockResolvedValue([
      {
        id: 1,
        frontText: "Sierra Leone",
        backText: "Freetown",
        imageFront: null,
        imageBack: null,
        type: "text",
        wrongCount: 2,
      },
    ]);

    const { getByTestId, getByText } = render(<HardWordsList />);
    layoutPager(getByTestId);

    await waitFor(() => {
      expect(getByText("Sierra Leone")).toBeTruthy();
    });

    expect(getByText("Najczęściej mylone fiszki ogólnie")).toBeTruthy();
    expect(mockedGetHardFlashcards).toHaveBeenCalledWith(undefined, 5);
    expect(mockedGetHardFlashcards).toHaveBeenCalledTimes(1);
  });

  it("loads the active-course page when a course is active", async () => {
    mockSettings(7);
    mockedGetHardFlashcards.mockImplementation((courseId?: number | null) =>
      Promise.resolve(
        courseId === 7
          ? [
              {
                id: 3,
                frontText: "Aktywna fiszka",
                backText: "active",
                imageFront: null,
                imageBack: null,
                type: "text",
                wrongCount: 1,
              },
            ]
          : [
              {
                id: 2,
                frontText: "Globalna fiszka",
                backText: "global",
                imageFront: null,
                imageBack: null,
                type: "text",
                wrongCount: 4,
              },
            ]
      )
    );

    const { getByTestId, getByText } = render(<HardWordsList />);
    layoutPager(getByTestId);

    await waitFor(() => {
      expect(getByText("Globalna fiszka")).toBeTruthy();
    });

    expect(getByText("Najczęściej mylone fiszki ogólnie")).toBeTruthy();
    expect(mockedGetHardFlashcards).toHaveBeenCalledWith(undefined, 5);
    expect(mockedGetHardFlashcards).toHaveBeenCalledWith(7, 5);
  });

  it("scales error bars against the hardest flashcard on the page", async () => {
    mockedGetHardFlashcards.mockResolvedValue([
      {
        id: 10,
        frontText: "Tonga",
        backText: "Nuku'alofa",
        imageFront: null,
        imageBack: null,
        type: "text",
        wrongCount: 2,
      },
      {
        id: 11,
        frontText: "Monako",
        backText: "Monaco",
        imageFront: null,
        imageBack: null,
        type: "text",
        wrongCount: 1,
      },
    ]);

    const { getByTestId, getByText } = render(<HardWordsList />);
    layoutPager(getByTestId);

    await waitFor(() => {
      expect(getByText("Tonga")).toBeTruthy();
    });

    expect(StyleSheet.flatten(getByTestId("hard-word-fill-10").props.style).width).toBe(
      "100%"
    );
    expect(StyleSheet.flatten(getByTestId("hard-word-fill-11").props.style).width).toBe(
      "50%"
    );
    expect(getByText("2 błędy")).toBeTruthy();
    expect(getByText("1 błąd")).toBeTruthy();
  });

  it("renders a placeholder only when a flashcard has no image", async () => {
    mockedGetHardFlashcards.mockResolvedValue([
      {
        id: 20,
        frontText: "Bez obrazka",
        backText: "empty",
        imageFront: null,
        imageBack: null,
        type: "text",
        wrongCount: 1,
      },
      {
        id: 21,
        frontText: "Z obrazkiem",
        backText: "image",
        imageFront: "image://flag",
        imageBack: null,
        type: "text",
        wrongCount: 1,
      },
    ]);

    const { getByTestId, queryByTestId, getByText } = render(<HardWordsList />);
    layoutPager(getByTestId);

    await waitFor(() => {
      expect(getByText("Bez obrazka")).toBeTruthy();
    });

    expect(getByTestId("hard-word-placeholder-20")).toBeTruthy();
    expect(queryByTestId("hard-word-placeholder-21")).toBeNull();
    expect(getByTestId("hard-word-image-21")).toBeTruthy();
    expect(getByTestId("expo-image-image://flag")).toBeTruthy();
  });
});
