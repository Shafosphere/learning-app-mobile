import { act, renderHook } from "@testing-library/react-native";
import { useNavbarStats } from "@/src/contexts/NavbarStatsContext";
import { registerProtectedDailyActivity } from "@/src/services/streakProtection";
import { useFlashcardsStatsBurst } from "../useFlashcardsStatsBurst";

jest.mock("@/src/contexts/NavbarStatsContext", () => ({
  useNavbarStats: jest.fn(),
}));
jest.mock("@/src/services/streakProtection", () => ({
  registerProtectedDailyActivity: jest.fn(),
}));

const applyStatBurst = jest.fn();
const getStatsSnapshot = jest.fn();
const registerActivity = jest.mocked(registerProtectedDailyActivity);
const errorMessage = "[Flashcards] Failed to refresh streak after answer";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useFlashcardsStatsBurst", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useNavbarStats).mockReturnValue({
      applyStatBurst,
      getStatsSnapshot,
      stats: { masteredCount: 0, promotionsCount: 0, streakDays: 4, shieldCount: 1 },
      activeStatKey: "mastered",
      currentBurst: null,
      acknowledgeCurrentBurst: jest.fn(),
    });
    getStatsSnapshot.mockReturnValue({ streakDays: 4, shieldCount: 1 });
    registerActivity.mockResolvedValue({ streakDays: 4, shieldCount: 1 });
  });

  afterEach(() => jest.restoreAllMocks());

  it("waits for the event write, then refreshes activity, reads the latest snapshot and applies the burst", async () => {
    const write = deferred<void>();
    const refresh = deferred<Awaited<ReturnType<typeof registerProtectedDailyActivity>>>();
    registerActivity.mockReturnValue(refresh.promise);
    const { result } = renderHook(() => useFlashcardsStatsBurst(errorMessage));
    const pending = result.current({
      logLearningEventPromise: write.promise,
      deltas: { masteredDelta: 1, promotionsDelta: 0 },
    });
    expect(registerActivity).not.toHaveBeenCalled();
    expect(getStatsSnapshot).not.toHaveBeenCalled();
    expect(applyStatBurst).not.toHaveBeenCalled();

    await act(async () => write.resolve());
    expect(registerActivity).toHaveBeenCalledTimes(1);
    expect(getStatsSnapshot).not.toHaveBeenCalled();
    expect(applyStatBurst).not.toHaveBeenCalled();

    getStatsSnapshot.mockReturnValue({ streakDays: 5, shieldCount: 2 });
    await act(async () => {
      refresh.resolve({ streakDays: 5, shieldCount: 2 });
      await pending;
    });
    expect(getStatsSnapshot).toHaveBeenCalledTimes(1);
    expect(applyStatBurst).toHaveBeenCalledWith({
      masteredDelta: 1, promotionsDelta: 0, streakDelta: 0,
    });
    expect(getStatsSnapshot.mock.invocationCallOrder[0]).toBeLessThan(
      applyStatBurst.mock.invocationCallOrder[0],
    );
  });

  it.each([
    { masteredDelta: 1 as const, promotionsDelta: 0 as const },
    { masteredDelta: 0 as const, promotionsDelta: 1 as const },
    { masteredDelta: 1 as const, promotionsDelta: 1 as const },
  ])("preserves supplied increments: %j", async (deltas) => {
    const { result } = renderHook(() => useFlashcardsStatsBurst(errorMessage));
    await act(async () => result.current({
      logLearningEventPromise: Promise.resolve(), deltas,
    }));
    expect(applyStatBurst).toHaveBeenCalledWith({ ...deltas, streakDelta: 0 });
  });

  it.each([
    [6, 2, { streakDelta: 1, streakDaysOverride: 6, shieldCountOverride: 2 }],
    [0, 0, { streakDelta: 0, streakDaysOverride: 0, shieldCountOverride: 0 }],
    [4, 2, { streakDelta: 0, shieldCountOverride: 2 }],
    [5, 1, { streakDelta: 1, streakDaysOverride: 5 }],
  ] as const)("updates streak %i and shields %i even without base increments", async (streakDays, shieldCount, overrides) => {
    registerActivity.mockResolvedValue({ streakDays, shieldCount });
    const { result } = renderHook(() => useFlashcardsStatsBurst(errorMessage));
    await act(async () => result.current({
      logLearningEventPromise: Promise.resolve(),
      deltas: { masteredDelta: 0, promotionsDelta: 0 },
    }));
    expect(applyStatBurst).toHaveBeenCalledWith({
      masteredDelta: 0, promotionsDelta: 0, ...overrides,
    });
  });

  it("skips an empty burst when snapshot is unchanged", async () => {
    const { result } = renderHook(() => useFlashcardsStatsBurst(errorMessage));
    await act(async () => result.current({
      logLearningEventPromise: Promise.resolve(),
      deltas: { masteredDelta: 0, promotionsDelta: 0 },
    }));
    expect(registerActivity).toHaveBeenCalledTimes(1);
    expect(applyStatBurst).not.toHaveBeenCalled();
  });

  it.each([
    ["[Flashcards] Failed to refresh streak after answer", 1, 0],
    ["[Review] Failed to refresh streak after answer", 0, 1],
    ["[Review] Failed to refresh streak after answer", 0, 0],
  ] as const)("warns with %s and preserves base increments %i/%i on refresh failure", async (message, masteredDelta, promotionsDelta) => {
    const error = new Error("refresh failed");
    registerActivity.mockRejectedValue(error);
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const { result } = renderHook(() => useFlashcardsStatsBurst(message));
    await act(async () => result.current({
      logLearningEventPromise: Promise.resolve(),
      deltas: { masteredDelta, promotionsDelta },
    }));
    expect(warn).toHaveBeenCalledWith(message, error);
    expect(getStatsSnapshot).not.toHaveBeenCalled();
    if (masteredDelta || promotionsDelta) {
      expect(applyStatBurst).toHaveBeenCalledWith({
        masteredDelta, promotionsDelta, streakDelta: 0,
      });
    } else {
      expect(applyStatBurst).not.toHaveBeenCalled();
    }
  });

  it("propagates a rejected event write without refreshing activity or applying stats", async () => {
    const write = deferred<void>();
    const error = new Error("write failed");
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const { result } = renderHook(() => useFlashcardsStatsBurst(errorMessage));
    const pending = result.current({
      logLearningEventPromise: write.promise,
      deltas: { masteredDelta: 1, promotionsDelta: 0 },
    });
    const rejection = expect(pending).rejects.toBe(error);
    write.reject(error);
    await rejection;
    expect(registerActivity).not.toHaveBeenCalled();
    expect(applyStatBurst).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });
});
