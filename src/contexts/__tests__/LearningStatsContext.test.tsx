import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

import {
  LearningStatsProvider,
  useLearningStats,
} from "@/src/contexts/LearningStatsContext";
import { countTotalLearnedWordsGlobal } from "@/src/db/sqlite/db";

jest.mock("@/src/db/sqlite/db", () => ({
  countTotalLearnedWordsGlobal: jest.fn(),
}));

const mockedCountTotalLearnedWordsGlobal =
  countTotalLearnedWordsGlobal as jest.MockedFunction<
    typeof countTotalLearnedWordsGlobal
  >;

describe("LearningStatsContext", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockedCountTotalLearnedWordsGlobal.mockResolvedValue(2);
  });

  it("refreshes in-memory stats after storage changes", async () => {
    await AsyncStorage.multiSet([
      ["knownWords", JSON.stringify({ ids: [1], lastLearnedDate: "2026-04-20" })],
      ["dailyProgress", JSON.stringify({ date: "2026-04-20", count: 1 })],
    ]);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LearningStatsProvider>{children}</LearningStatsProvider>
    );

    const { result } = renderHook(() => useLearningStats(), { wrapper });

    await waitFor(() => {
      expect(result.current.knownWordsCount).toBe(2);
      expect(result.current.dailyProgressCount).toBe(1);
      expect(result.current.dailyProgressDate).toBe("2026-04-20");
    });

    mockedCountTotalLearnedWordsGlobal.mockResolvedValue(5);
    await AsyncStorage.multiSet([
      ["knownWords", JSON.stringify({ ids: [3, 4, 5], lastLearnedDate: "2026-04-21" })],
      ["dailyProgress", JSON.stringify({ date: "2026-04-21", count: 9 })],
    ]);

    await act(async () => {
      await result.current.refreshStats();
    });

    await waitFor(() => {
      expect(result.current.knownWordsCount).toBe(5);
      expect(result.current.lastKnownWordDate).toBe("2026-04-21");
      expect(result.current.dailyProgressCount).toBe(9);
      expect(result.current.dailyProgressDate).toBe("2026-04-21");
    });
  });
});
