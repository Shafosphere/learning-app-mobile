/* eslint-disable import/first */
let mockedKnownWordsCount = 0;

jest.mock("@/src/contexts/LearningStatsContext", () => ({
  useLearningStats: () => ({
    knownWordsCount: mockedKnownWordsCount,
  }),
}));

jest.mock("@/src/db/sqlite/db", () => ({
  countGlobalBoxPromotions: jest.fn(),
}));

jest.mock("@/src/services/streakProtection", () => ({
  getProtectedDailyStreakSnapshot: jest.fn(),
}));

import { act, renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

import {
  NavbarStatsProvider,
  useNavbarStats,
} from "@/src/contexts/NavbarStatsContext";
import { countGlobalBoxPromotions } from "@/src/db/sqlite/db";
import { getProtectedDailyStreakSnapshot } from "@/src/services/streakProtection";

const mockedCountGlobalBoxPromotions =
  countGlobalBoxPromotions as jest.MockedFunction<
    typeof countGlobalBoxPromotions
  >;
const mockedGetProtectedDailyStreakSnapshot =
  getProtectedDailyStreakSnapshot as jest.MockedFunction<
    typeof getProtectedDailyStreakSnapshot
  >;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NavbarStatsProvider>{children}</NavbarStatsProvider>
);

describe("NavbarStatsContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedKnownWordsCount = 0;
    mockedCountGlobalBoxPromotions.mockResolvedValue(0);
    mockedGetProtectedDailyStreakSnapshot.mockResolvedValue({
      streakDays: 0,
      shieldCount: 0,
    });
  });

  it("sets streak days from the database instead of incrementing by one", async () => {
    mockedGetProtectedDailyStreakSnapshot.mockResolvedValue({
      streakDays: 0,
      shieldCount: 0,
    });

    const { result } = renderHook(() => useNavbarStats(), { wrapper });

    await waitFor(() => {
      expect(mockedGetProtectedDailyStreakSnapshot).toHaveBeenCalled();
    });

    act(() => {
      result.current.applyStatBurst({
        masteredDelta: 0,
        promotionsDelta: 0,
        streakDelta: 1,
        streakDaysOverride: 3,
      });
    });

    expect(result.current.stats.streakDays).toBe(3);
  });

  it("does not increase streak on another same-day burst without streak growth", async () => {
    const { result } = renderHook(() => useNavbarStats(), { wrapper });

    await waitFor(() => {
      expect(mockedGetProtectedDailyStreakSnapshot).toHaveBeenCalled();
    });

    act(() => {
      result.current.applyStatBurst({
        masteredDelta: 0,
        promotionsDelta: 0,
        streakDelta: 1,
        streakDaysOverride: 3,
      });
    });

    act(() => {
      result.current.applyStatBurst({
        masteredDelta: 0,
        promotionsDelta: 1,
        streakDelta: 0,
      });
    });

    expect(result.current.stats.streakDays).toBe(3);
    expect(result.current.stats.promotionsCount).toBe(1);
  });

  it("preserves a local streak burst when an older provider refresh resolves later", async () => {
    let resolveStreakRead: (value: {
      streakDays: number;
      shieldCount: 0 | 1 | 2;
    }) => void = () => {};
    mockedGetProtectedDailyStreakSnapshot.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveStreakRead = resolve;
      }),
    );

    const { result } = renderHook(() => useNavbarStats(), { wrapper });

    await waitFor(() => {
      expect(mockedGetProtectedDailyStreakSnapshot).toHaveBeenCalled();
    });

    act(() => {
      result.current.applyStatBurst({
        masteredDelta: 0,
        promotionsDelta: 0,
        streakDelta: 1,
        streakDaysOverride: 1,
      });
    });

    expect(result.current.stats.streakDays).toBe(1);

    await act(async () => {
      resolveStreakRead({ streakDays: 0, shieldCount: 0 });
    });

    expect(result.current.stats.streakDays).toBe(1);
  });

  it("syncs expired streak back to zero on provider refresh", async () => {
    mockedKnownWordsCount = 1;
    mockedGetProtectedDailyStreakSnapshot.mockResolvedValueOnce({
      streakDays: 4,
      shieldCount: 0,
    });

    const { result, rerender } = renderHook(() => useNavbarStats(), { wrapper });

    await waitFor(() => {
      expect(result.current.stats.streakDays).toBe(4);
    });

    mockedKnownWordsCount = 2;
    mockedGetProtectedDailyStreakSnapshot.mockResolvedValueOnce({
      streakDays: 0,
      shieldCount: 0,
    });

    rerender(undefined);

    await waitFor(() => {
      expect(result.current.stats.streakDays).toBe(0);
    });
  });
});
