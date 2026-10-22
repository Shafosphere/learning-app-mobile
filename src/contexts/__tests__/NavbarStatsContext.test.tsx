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

import { act, render, renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

import {
  NavbarStatsProvider,
  useNavbarStats,
  useNavbarStatsActions,
  useNavbarStatsSnapshot,
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

// Plain consumers: context isolation must work without React.memo.
async function renderSubscriptions() {
  const snapshotRenders = jest.fn((value: ReturnType<typeof useNavbarStatsSnapshot>) => value);
  const actionRenders = jest.fn((value: ReturnType<typeof useNavbarStatsActions>) => value);
  const headerRenders = jest.fn((value: ReturnType<typeof useNavbarStats>) => value);

  function SnapshotConsumer() {
    snapshotRenders(useNavbarStatsSnapshot());
    return null;
  }

  function ActionConsumer() {
    actionRenders(useNavbarStatsActions());
    return null;
  }

  function HeaderConsumer() {
    headerRenders(useNavbarStats());
    return null;
  }

  const view = render(
    <NavbarStatsProvider>
      <SnapshotConsumer />
      <ActionConsumer />
      <HeaderConsumer />
    </NavbarStatsProvider>,
  );
  await act(async () => {});

  return {
    ...view,
    snapshotRenders,
    actionRenders,
    headerRenders,
    snapshot: () => snapshotRenders.mock.lastCall![0],
    actions: () => actionRenders.mock.lastCall![0],
    header: () => headerRenders.mock.lastCall![0],
  };
}

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

  afterEach(() => {
    jest.useRealTimers();
  });

  it("rotates every 6.4 seconds without rerendering snapshot or action consumers", async () => {
    jest.useFakeTimers();
    const app = await renderSubscriptions();
    const snapshot = app.snapshot();
    const snapshotRenderCount = app.snapshotRenders.mock.calls.length;
    const actionRenderCount = app.actionRenders.mock.calls.length;
    const headerRenderCount = app.headerRenders.mock.calls.length;

    act(() => jest.advanceTimersByTime(6399));
    expect(app.header().activeStatKey).toBe("mastered");
    expect(app.headerRenders).toHaveBeenCalledTimes(headerRenderCount);

    act(() => jest.advanceTimersByTime(1));
    expect(app.header().activeStatKey).toBe("streak");
    act(() => jest.advanceTimersByTime(6400));
    expect(app.header().activeStatKey).toBe("promotions");
    act(() => jest.advanceTimersByTime(6400));
    expect(app.header().activeStatKey).toBe("mastered");

    expect(app.headerRenders).toHaveBeenCalledTimes(headerRenderCount + 3);
    expect(app.snapshotRenders).toHaveBeenCalledTimes(snapshotRenderCount);
    expect(app.actionRenders).toHaveBeenCalledTimes(actionRenderCount);
    expect(app.header().stats).toBe(snapshot);
    expect(app.actions().getStatsSnapshot()).toBe(snapshot);
    app.unmount();
    expect(jest.getTimerCount()).toBe(0);
  });

  it("publishes database hydration and real bursts while keeping actions and snapshot getter live", async () => {
    jest.useFakeTimers();
    mockedKnownWordsCount = 7;
    mockedCountGlobalBoxPromotions.mockResolvedValue(11);
    mockedGetProtectedDailyStreakSnapshot.mockResolvedValue({
      streakDays: 4,
      shieldCount: 1,
    });
    const app = await renderSubscriptions();
    expect(app.snapshot()).toEqual({
      masteredCount: 7,
      streakDays: 4,
      shieldCount: 1,
      promotionsCount: 11,
    });
    const actions = app.actions();
    const snapshotRenderCount = app.snapshotRenders.mock.calls.length;
    const actionRenderCount = app.actionRenders.mock.calls.length;

    act(() => actions.applyStatBurst({
      masteredDelta: 1,
      streakDelta: 1,
      promotionsDelta: 1,
      streakDaysOverride: 8,
      shieldCountOverride: 2,
    }));

    expect(app.snapshot()).toEqual({
      masteredCount: 8,
      streakDays: 8,
      shieldCount: 2,
      promotionsCount: 12,
    });
    expect(app.snapshotRenders).toHaveBeenCalledTimes(snapshotRenderCount + 1);
    expect(actions.getStatsSnapshot()).toBe(app.snapshot());
    expect(app.header().stats).toBe(app.snapshot());
    expect(app.header().currentBurst).toMatchObject({
      id: 1,
      keys: ["mastered", "streak", "promotions"],
      comboCount: 3,
      pinKey: "mastered",
      pinDurationMs: 3350,
      sparkle: true,
    });

    act(() => actions.applyStatBurst({
      masteredDelta: 0,
      streakDelta: 0,
      promotionsDelta: 0,
      streakDaysOverride: 0,
      shieldCountOverride: 0,
    }));
    expect(app.snapshot()).toMatchObject({ streakDays: 0, shieldCount: 0 });
    expect(app.snapshotRenders).toHaveBeenCalledTimes(snapshotRenderCount + 2);
    expect(actions.getStatsSnapshot()).toBe(app.snapshot());
    expect(app.actionRenders).toHaveBeenCalledTimes(actionRenderCount);
    expect(app.actions()).toBe(actions);
    app.unmount();
    jest.runAllTicks();
    expect(jest.getTimerCount()).toBe(0);
  });

  it("keeps queue acknowledgments and pin transitions isolated from statistics subscribers", async () => {
    jest.useFakeTimers();
    const app = await renderSubscriptions();
    const actions = app.actions();
    const actionRenderCount = app.actionRenders.mock.calls.length;

    act(() => jest.advanceTimersByTime(6000));
    act(() => actions.applyStatBurst({
      masteredDelta: 0, streakDelta: 1, promotionsDelta: 1,
    }));
    expect(app.header().activeStatKey).toBe("streak");
    expect(app.header().currentBurst).toMatchObject({
      id: 1, comboCount: 2, pinKey: "streak", pinDurationMs: 3200, sparkle: false,
    });

    act(() => jest.advanceTimersByTime(400));
    expect(app.header().activeStatKey).toBe("streak");
    act(() => jest.advanceTimersByTime(200));
    act(() => actions.applyStatBurst({
      masteredDelta: 0, streakDelta: 0, promotionsDelta: 1,
    }));
    expect(app.header().activeStatKey).toBe("promotions");
    expect(app.header().currentBurst?.id).toBe(1);

    const snapshot = app.snapshot();
    const snapshotRenderCount = app.snapshotRenders.mock.calls.length;
    act(() => actions.acknowledgeCurrentBurst());
    expect(app.header().currentBurst).toMatchObject({
      id: 2, keys: ["promotions"], comboCount: 1, pinKey: "promotions",
      pinDurationMs: 2800, sparkle: false,
    });
    act(() => actions.acknowledgeCurrentBurst());
    expect(app.header().currentBurst).toBeNull();

    act(() => jest.advanceTimersByTime(2799));
    expect(app.header().activeStatKey).toBe("promotions");
    act(() => jest.advanceTimersByTime(1));
    expect(app.header().activeStatKey).toBe("mastered");
    act(() => jest.advanceTimersByTime(3400));
    expect(app.header().activeStatKey).toBe("streak");
    expect(app.snapshotRenders).toHaveBeenCalledTimes(snapshotRenderCount);
    expect(app.actionRenders).toHaveBeenCalledTimes(actionRenderCount);
    expect(actions.getStatsSnapshot()).toBe(snapshot);
    app.unmount();
    expect(jest.getTimerCount()).toBe(0);
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

  it("updates snapshot subscribers with known-word changes and expired streaks on refresh", async () => {
    mockedKnownWordsCount = 1;
    mockedGetProtectedDailyStreakSnapshot.mockResolvedValueOnce({
      streakDays: 4,
      shieldCount: 0,
    });

    const { result, rerender } = renderHook(() => useNavbarStatsSnapshot(), { wrapper });

    await waitFor(() => {
      expect(result.current.streakDays).toBe(4);
    });
    expect(result.current.masteredCount).toBe(1);

    mockedKnownWordsCount = 2;
    mockedGetProtectedDailyStreakSnapshot.mockResolvedValueOnce({
      streakDays: 0,
      shieldCount: 0,
    });

    rerender(undefined);

    await waitFor(() => {
      expect(result.current.streakDays).toBe(0);
    });
    expect(result.current.masteredCount).toBe(2);
  });
});
