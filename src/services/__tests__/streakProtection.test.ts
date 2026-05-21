import AsyncStorage from "@react-native-async-storage/async-storage";

const mockGetDB = jest.fn();

jest.mock("@/src/db/sqlite/db", () => ({
  getDB: () => mockGetDB(),
}));

import {
  getProtectedDailyStreakSnapshot,
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

async function setStoredState(state: StreakProtectionState) {
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
    });
  });
});
