import AsyncStorage from "@react-native-async-storage/async-storage";

const mockGetDB = jest.fn();

jest.mock("@/src/db/sqlite/db", () => ({
  getDB: () => mockGetDB(),
}));

import {
  getProtectedDailyStreakSnapshot,
  getProtectedDailyStreakState,
  normalizeShieldUsedDates,
  registerProtectedDailyActivity,
  STREAK_PROTECTION_STORAGE_KEY,
  type StreakProtectionState,
} from "@/src/services/streakProtection";

const dateMs = (year: number, month: number, day: number) =>
  new Date(year, month - 1, day, 12).getTime();

function mockActiveDates(dates: string[]) {
  mockGetDB.mockResolvedValue({
    getAllAsync: jest.fn(() => Promise.resolve(dates.map((d) => ({ d })))),
  });
}

async function setStoredState(state: Partial<StreakProtectionState>) {
  await AsyncStorage.setItem(STREAK_PROTECTION_STORAGE_KEY, JSON.stringify(state));
}

async function getStoredState(): Promise<StreakProtectionState> {
  return JSON.parse(
    (await AsyncStorage.getItem(STREAK_PROTECTION_STORAGE_KEY)) ?? "null"
  ) as StreakProtectionState;
}

describe("streakProtection", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it("reconciles missed days before adding today's protected activity", async () => {
    mockActiveDates(["2026-05-01", "2026-05-04"]);
    await setStoredState({
      streakDays: 10,
      shieldCount: 2,
      lastActiveDate: "2026-05-01",
      coveredThroughDate: "2026-05-01",
    });

    const result = await registerProtectedDailyActivity(dateMs(2026, 5, 4));

    expect(result).toEqual({ streakDays: 11, shieldCount: 1 });
    expect(await getStoredState()).toEqual({
      streakDays: 11,
      shieldCount: 1,
      lastActiveDate: "2026-05-04",
      coveredThroughDate: "2026-05-04",
      shieldUsedDates: ["2026-05-02", "2026-05-03"],
    });
  });

  it("does not award another streak day or shield for a second same-day activity", async () => {
    mockActiveDates(["2026-05-04"]);
    await setStoredState({
      streakDays: 1,
      shieldCount: 1,
      lastActiveDate: "2026-05-04",
      coveredThroughDate: "2026-05-04",
    });

    await expect(
      registerProtectedDailyActivity(dateMs(2026, 5, 4))
    ).resolves.toEqual({ streakDays: 1, shieldCount: 1 });
  });

  it("awards the first shield when today's activity creates state for the first time", async () => {
    mockActiveDates(["2026-05-04"]);

    await expect(
      registerProtectedDailyActivity(dateMs(2026, 5, 4))
    ).resolves.toEqual({ streakDays: 1, shieldCount: 1 });
  });

  it("caps shields at two", async () => {
    mockActiveDates(["2026-05-03", "2026-05-04"]);
    await setStoredState({
      streakDays: 7,
      shieldCount: 2,
      lastActiveDate: "2026-05-03",
      coveredThroughDate: "2026-05-03",
    });

    await expect(
      registerProtectedDailyActivity(dateMs(2026, 5, 4))
    ).resolves.toEqual({ streakDays: 8, shieldCount: 2 });
  });

  it("resets when a missed day has no shield, then starts again on today's activity", async () => {
    mockActiveDates(["2026-05-01", "2026-05-04"]);
    await setStoredState({
      streakDays: 5,
      shieldCount: 0,
      lastActiveDate: "2026-05-01",
      coveredThroughDate: "2026-05-01",
    });

    await expect(
      registerProtectedDailyActivity(dateMs(2026, 5, 4))
    ).resolves.toEqual({ streakDays: 1, shieldCount: 1 });
  });

  it("only reconciles through yesterday when reading without today's activity", async () => {
    mockActiveDates(["2026-05-01"]);
    await setStoredState({
      streakDays: 10,
      shieldCount: 1,
      lastActiveDate: "2026-05-01",
      coveredThroughDate: "2026-05-01",
    });

    await expect(
      getProtectedDailyStreakSnapshot(dateMs(2026, 5, 3))
    ).resolves.toEqual({ streakDays: 10, shieldCount: 0 });
    expect(await getStoredState()).toEqual({
      streakDays: 10,
      shieldCount: 0,
      lastActiveDate: "2026-05-01",
      coveredThroughDate: "2026-05-02",
      shieldUsedDates: ["2026-05-02"],
    });
  });

  it("normalizes legacy stored states without shield usage dates", async () => {
    mockActiveDates(["2026-05-01"]);
    await setStoredState({
      streakDays: 3,
      shieldCount: 0,
      lastActiveDate: "2026-05-01",
      coveredThroughDate: "2026-05-01",
    });

    await expect(
      getProtectedDailyStreakState(dateMs(2026, 5, 2))
    ).resolves.toEqual({
      streakDays: 3,
      shieldCount: 0,
      lastActiveDate: "2026-05-01",
      coveredThroughDate: "2026-05-01",
      shieldUsedDates: [],
    });
  });

  it("does not duplicate shield usage dates when reconciling again", async () => {
    mockActiveDates(["2026-05-01"]);
    await setStoredState({
      streakDays: 10,
      shieldCount: 1,
      lastActiveDate: "2026-05-01",
      coveredThroughDate: "2026-05-01",
      shieldUsedDates: ["2026-05-02"],
    });

    await getProtectedDailyStreakState(dateMs(2026, 5, 3));
    await getProtectedDailyStreakState(dateMs(2026, 5, 3));

    expect((await getStoredState()).shieldUsedDates).toEqual(["2026-05-02"]);
  });

  it("normalizes shield usage dates by sorting, deduplicating, and trimming", () => {
    const oldDates = Array.from({ length: 402 }, (_, index) =>
      `2025-01-${String((index % 28) + 1).padStart(2, "0")}`
    );
    const uniqueDates = Array.from({ length: 405 }, (_, index) => {
      const date = new Date(2025, 0, 1);
      date.setDate(date.getDate() + index);
      return date.toISOString().slice(0, 10);
    });

    const result = normalizeShieldUsedDates([
      "not-a-date",
      "2026-05-03",
      "2026-05-02",
      "2026-05-03",
      ...oldDates,
      ...uniqueDates,
    ]);

    expect(result).toHaveLength(400);
    expect(result).toEqual([...new Set(result)].sort());
    expect(result).not.toContain("not-a-date");
    expect(result).not.toContain("2025-01-01");
    expect(result).toContain("2026-05-02");
    expect(result).toContain("2026-05-03");
  });
});
