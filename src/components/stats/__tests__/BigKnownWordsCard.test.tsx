import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";
import { useIsFocused } from "@react-navigation/native";
import BoxSkin from "@/src/components/Box/Skin/BoxSkin";
import { AppState, type AppStateStatus, ImageBackground, StyleSheet, Text, View } from "react-native";

import BigKnownWordsCard from "@/src/components/stats/BigKnownWordsCard";
import { useNavbarStatsSnapshot } from "@/src/contexts/NavbarStatsContext";

jest.mock("@react-navigation/native", () => ({ useIsFocused: jest.fn(() => true) }));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("@/src/contexts/NavbarStatsContext", () => ({
  useNavbarStatsSnapshot: jest.fn(),
}));

jest.mock("@/src/components/Box/Skin/BoxSkin", () => jest.fn(() => null));

jest.mock("react-native-reanimated", () => ({
  ...jest.requireActual("react-native-reanimated/mock"),
  useReducedMotion: () => true,
}));

const mockedUseNavbarStatsSnapshot = jest.mocked(useNavbarStatsSnapshot);

describe("BigKnownWordsCard render boundary", () => {
  let changeAppState: (state: AppStateStatus) => void;
  const initialAppState = AppState.currentState;
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    AppState.currentState = "active";
    jest.mocked(useIsFocused).mockReturnValue(true);
    jest.spyOn(AppState, "addEventListener").mockImplementation((_event, listener) => {
      changeAppState = listener;
      return { remove: jest.fn() };
    });
    mockedUseNavbarStatsSnapshot.mockReturnValue({
      masteredCount: 12,
      streakDays: 3,
      shieldCount: 1,
      promotionsCount: 4,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
    AppState.currentState = initialAppState;
  });

  it("skips unrelated parent updates", () => {
    const Parent = ({ update }: { update: number }) => (
      <View>
        <Text>{update}</Text>
        <BigKnownWordsCard />
      </View>
    );
    const screen = render(<Parent update={1} />);
    const calls = mockedUseNavbarStatsSnapshot.mock.calls.length;
    screen.rerender(<Parent update={2} />);
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("12")).toBeTruthy();
    expect(mockedUseNavbarStatsSnapshot.mock.calls).toHaveLength(calls);
  });

  it("receives live snapshot updates and keeps layout state responsive", () => {
    const stats = mockedUseNavbarStatsSnapshot();
    const SnapshotContext = React.createContext(stats);
    mockedUseNavbarStatsSnapshot.mockImplementation(function useMockSnapshot() {
      return React.useContext(SnapshotContext);
    });
    const tree = (value: typeof stats) => (
      <SnapshotContext.Provider value={value}>
        <BigKnownWordsCard />
      </SnapshotContext.Provider>
    );
    const screen = render(tree(stats));
    screen.rerender(tree({ ...stats, masteredCount: 25 }));
    expect(screen.getByText("25")).toBeTruthy();
    expect(screen.queryByText("12")).toBeNull();

    fireEvent(screen.getByRole("button"), "layout", {
      nativeEvent: { layout: { width: 744, height: 360, x: 0, y: 0 } },
    });
    expect(StyleSheet.flatten(screen.UNSAFE_getByType(ImageBackground).props.style))
      .toEqual(expect.objectContaining({ transform: [{ scale: 2 }] }));
  });


  it("cycles facial expressions on taps and restores happy after the latest tap", () => {
    const screen = render(<BigKnownWordsCard />);
    const face = () => screen.UNSAFE_getByType(BoxSkin).props.face;
    expect(face()).toBe("happy");
    for (const expression of ["sparkle", "blink", "blushed", "xd", "ez", "love", "sparkle"]) {
      fireEvent.press(screen.getByRole("button"));
      expect(face()).toBe(expression);
      act(() => jest.advanceTimersByTime(1000));
    }
    act(() => jest.advanceTimersByTime(499));
    expect(face()).toBe("sparkle");
    act(() => jest.advanceTimersByTime(1));
    expect(face()).toBe("happy");
  });

  it("clears a facial reaction when the app enters the background", () => {
    const screen = render(<BigKnownWordsCard />);
    fireEvent.press(screen.getByRole("button"));
    act(() => changeAppState("background"));
    expect(screen.UNSAFE_getByType(BoxSkin).props.face).toBe("happy");
    act(() => changeAppState("active"));
    expect(screen.UNSAFE_getByType(BoxSkin).props.face).toBe("happy");
  });

  it("clears a facial reaction when leaving the screen", () => {
    const FocusContext = React.createContext(true);
    jest.mocked(useIsFocused).mockImplementation(function useMockFocus() {
      return React.useContext(FocusContext);
    });
    const tree = (focused: boolean) => (
      <FocusContext.Provider value={focused}><BigKnownWordsCard /></FocusContext.Provider>
    );
    const screen = render(tree(true));
    fireEvent.press(screen.getByRole("button"));
    screen.rerender(tree(false));
    expect(screen.UNSAFE_getByType(BoxSkin).props.face).toBe("happy");
  });
});
