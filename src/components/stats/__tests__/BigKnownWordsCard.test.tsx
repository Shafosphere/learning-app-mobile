import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { ImageBackground, StyleSheet, Text, View } from "react-native";

import BigKnownWordsCard from "@/src/components/stats/BigKnownWordsCard";
import { useNavbarStatsSnapshot } from "@/src/contexts/NavbarStatsContext";

jest.mock("@/src/contexts/NavbarStatsContext", () => ({
  useNavbarStatsSnapshot: jest.fn(),
}));

jest.mock("@/src/components/Box/Skin/BoxSkin", () => () => null);

jest.mock("react-native-reanimated", () => ({
  ...jest.requireActual("react-native-reanimated/mock"),
  useReducedMotion: () => true,
}));

const mockedUseNavbarStatsSnapshot = jest.mocked(useNavbarStatsSnapshot);

describe("BigKnownWordsCard render boundary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseNavbarStatsSnapshot.mockReturnValue({
      masteredCount: 12,
      streakDays: 3,
      shieldCount: 1,
      promotionsCount: 4,
    });
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

    fireEvent(screen.UNSAFE_getAllByType(View)[0], "layout", {
      nativeEvent: { layout: { width: 744, height: 360, x: 0, y: 0 } },
    });
    expect(StyleSheet.flatten(screen.UNSAFE_getByType(ImageBackground).props.style))
      .toEqual(expect.objectContaining({ transform: [{ scale: 2 }] }));
  });
});
