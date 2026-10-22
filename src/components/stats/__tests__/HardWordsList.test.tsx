/* eslint-disable @typescript-eslint/no-require-imports */
import { fireEvent, render, waitFor, within } from "@testing-library/react-native";
import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import HardWordsList from "@/src/components/stats/HardWordsList";
import { getHardFlashcards } from "@/src/db/sqlite/db";
import { useSettings } from "@/src/contexts/SettingsContext";

jest.mock("@expo/vector-icons/Ionicons", () => () => null);
jest.mock("@expo/vector-icons/MaterialCommunityIcons", () => () => null);

jest.mock("@/src/contexts/SettingsContext", () => {
  const useSettings = jest.fn();
  return { useSettings, useThemeSettings: useSettings };
});

jest.mock("@/src/db/sqlite/db", () => ({
  getHardFlashcards: jest.fn(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        "components.stats.hardWordsList.accessibilityLabel.wypelnienieBledowValue":
          `Wypełnienie błędów ${options?.value ?? ""}`.trim(),
        "components.stats.hardWordsList.textChild.ladowanie": "Ładowanie…",
        "components.stats.hardWordsList.textChild.brakDanychSprobujPogracDluzej":
          "Brak danych – spróbuj pograć dłużej.",
        "components.stats.hardWordsList.title.trudneFiszki": "Trudne fiszki",
        "components.stats.hardWordsList.subtitle.description": "Najczęściej mylone fiszki",
        "components.stats.hardWordsList.scope.activeCourse": "Aktywny kurs",
        "components.stats.hardWordsList.scope.global": "Wszystkie",
      };
      return translations[key] ?? key;
    },
  }),
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

  afterEach(() => {
    jest.restoreAllMocks();
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

    const { getByTestId, getByText, getByRole } = render(<HardWordsList />);
    layoutPager(getByTestId);

    await waitFor(() => {
      expect(getByText("Sierra Leone")).toBeTruthy();
    });

    expect(getByText("Najczęściej mylone fiszki")).toBeTruthy();
    expect(getByText("Wszystkie")).toBeTruthy();
    expect(mockedGetHardFlashcards).toHaveBeenCalledWith(undefined, 5);
    expect(mockedGetHardFlashcards).toHaveBeenCalledTimes(1);
    expect(getByRole("button", {
      name: "components.stats.hardWordsList.navigation.previousPage",
    })).toBeDisabled();
    expect(getByRole("button", {
      name: "components.stats.hardWordsList.navigation.nextPage",
    })).toBeDisabled();
  }, 10000);

  it("skips unrelated parent updates after hard words load", async () => {
    mockedGetHardFlashcards.mockResolvedValue([]);
    const Parent = ({ update }: { update: number }) => (
      <View>
        <Text>{update}</Text>
        <HardWordsList />
      </View>
    );
    const screen = render(<Parent update={1} />);
    layoutPager(screen.getByTestId);
    await waitFor(() => expect(screen.getByText("Brak danych – spróbuj pograć dłużej.")).toBeTruthy());
    const calls = mockedUseSettings.mock.calls.length;
    screen.rerender(<Parent update={2} />);
    expect(screen.getByText("2")).toBeTruthy();
    expect(mockedUseSettings.mock.calls).toHaveLength(calls);
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

    const scrollToOffset = jest.spyOn(FlatList.prototype, "scrollToOffset")
      .mockImplementation(() => {});
    const { getByTestId, getByText, getByRole, UNSAFE_getByType } = render(<HardWordsList />);
    layoutPager(getByTestId);

    await waitFor(() => {
      expect(getByText("Globalna fiszka")).toBeTruthy();
    });

    expect(getByText("Najczęściej mylone fiszki")).toBeTruthy();
    expect(getByText("Wszystkie")).toBeTruthy();
    expect(mockedGetHardFlashcards).toHaveBeenCalledWith(undefined, 5);
    expect(mockedGetHardFlashcards).toHaveBeenCalledWith(7, 5);
    const previousButton = () => getByRole("button", {
      name: "components.stats.hardWordsList.navigation.previousPage",
    });
    const nextButton = () => getByRole("button", {
      name: "components.stats.hardWordsList.navigation.nextPage",
    });
    expect(nextButton()).toBeDisabled();
    expect(previousButton()).toHaveStyle({ backgroundColor: colors.my_yellow });

    fireEvent.press(previousButton());
    expect(scrollToOffset).toHaveBeenLastCalledWith({ offset: 0, animated: true });
    expect(getByText("Aktywny kurs")).toBeTruthy();
    expect(previousButton()).toBeDisabled();

    fireEvent.press(nextButton());
    expect(scrollToOffset).toHaveBeenLastCalledWith({ offset: 320, animated: true });
    expect(getByText("Wszystkie")).toBeTruthy();
    expect(nextButton()).toBeDisabled();

    fireEvent(UNSAFE_getByType(FlatList), "momentumScrollEnd", {
      nativeEvent: { contentOffset: { x: 0 } },
    });
    expect(getByText("Aktywny kurs")).toBeTruthy();
    expect(getByText("Najczęściej mylone fiszki")).toBeTruthy();
    expect(previousButton()).toBeDisabled();
    expect(nextButton()).toBeEnabled();
  });

  it.each(["empty", "error"])("preserves loading and the %s fallback inside the analytical card", async (outcome) => {
    let resolve!: (value: []) => void;
    let reject!: (error: Error) => void;
    mockedGetHardFlashcards.mockReturnValue(new Promise((done, fail) => { resolve = done; reject = fail; }));
    const screen = render(<HardWordsList />);
    layoutPager(screen.getByTestId);
    expect(screen.getByText("Ładowanie…")).toBeTruthy();
    if (outcome === "error") reject(new Error("read failed"));
    else resolve([]);
    await waitFor(() => expect(screen.getByText("Brak danych – spróbuj pograć dłużej.")).toBeTruthy());
    expect(screen.queryByText("Ładowanie…")).toBeNull();
    expect(within(screen.getByTestId("hard-words-scope-label")).getByText("Wszystkie")).toBeTruthy();
  });

  it("synchronizes the plain scope label with arrows and swipes without fetching again", async () => {
    mockSettings(7);
    mockedGetHardFlashcards.mockResolvedValue([]);
    const scroll = jest.spyOn(FlatList.prototype, "scrollToOffset").mockImplementation(() => {});
    const screen = render(<HardWordsList />);
    layoutPager(screen.getByTestId);
    await waitFor(() => expect(mockedGetHardFlashcards).toHaveBeenCalledTimes(2));
    const scope = () => screen.getByTestId("hard-words-scope-label");
    expect(within(scope()).getByText("Wszystkie")).toBeTruthy();
    expect(screen.queryByTestId("hard-words-scope-button")).toBeNull();
    expect(screen.queryByRole("radio")).toBeNull();

    fireEvent.press(screen.getByRole("button", { name: "components.stats.hardWordsList.navigation.previousPage" }));
    expect(scroll).toHaveBeenLastCalledWith({ offset: 0, animated: true });
    expect(within(scope()).getByText("Aktywny kurs")).toBeTruthy();

    fireEvent.press(screen.getByRole("button", { name: "components.stats.hardWordsList.navigation.nextPage" }));
    expect(scroll).toHaveBeenLastCalledWith({ offset: 320, animated: true });
    expect(within(scope()).getByText("Wszystkie")).toBeTruthy();
    fireEvent(screen.UNSAFE_getByType(FlatList), "momentumScrollEnd", { nativeEvent: { contentOffset: { x: 0 } } });
    expect(within(scope()).getByText("Aktywny kurs")).toBeTruthy();
    expect(mockedGetHardFlashcards).toHaveBeenCalledTimes(2);
  });

  it("resets the scope label when the active course changes or is removed", async () => {
    mockSettings(7);
    const initialSettings = mockedUseSettings();
    const SettingsContext = React.createContext(initialSettings);
    mockedUseSettings.mockImplementation(function useMockSettings() {
      return React.useContext(SettingsContext);
    });
    const withCourse = (activeCustomCourseId: number | null) => (
      <SettingsContext.Provider value={{ ...initialSettings, activeCustomCourseId }}>
        <HardWordsList />
      </SettingsContext.Provider>
    );
    mockedGetHardFlashcards.mockResolvedValue([]);
    jest.spyOn(FlatList.prototype, "scrollToOffset").mockImplementation(() => {});
    const screen = render(withCourse(7));
    layoutPager(screen.getByTestId);
    await waitFor(() => expect(mockedGetHardFlashcards).toHaveBeenCalledWith(7, 5));
    const previous = () => screen.getByRole("button", { name: "components.stats.hardWordsList.navigation.previousPage" });
    const scope = () => screen.getByTestId("hard-words-scope-label");
    fireEvent.press(previous());
    expect(within(scope()).getByText("Aktywny kurs")).toBeTruthy();
    screen.rerender(withCourse(8));
    await waitFor(() => expect(mockedGetHardFlashcards).toHaveBeenCalledWith(8, 5));
    expect(within(scope()).getByText("Wszystkie")).toBeTruthy();
    fireEvent.press(previous());
    expect(within(scope()).getByText("Aktywny kurs")).toBeTruthy();
    screen.rerender(withCourse(null));
    expect(within(scope()).getByText("Wszystkie")).toBeTruthy();
    expect(previous()).toBeDisabled();
    expect(screen.getByRole("button", { name: "components.stats.hardWordsList.navigation.nextPage" })).toBeDisabled();
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
