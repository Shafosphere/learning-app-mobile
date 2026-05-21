import AsyncStorage from "@react-native-async-storage/async-storage";

import { getDB } from "@/src/db/sqlite/db";

export const STREAK_PROTECTION_STORAGE_KEY = "stats.streakProtection";
export const MAX_STREAK_SHIELDS = 2;

export type StreakProtectionState = {
  streakDays: number;
  shieldCount: 0 | 1 | 2;
  lastActiveDate: string;
  coveredThroughDate: string;
};

export type ProtectedDailyStreakSnapshot = Pick<
  StreakProtectionState,
  "streakDays" | "shieldCount"
>;

const ACTIVE_BOXES_SQL =
  "'boxZero', 'boxOne', 'boxTwo', 'boxThree', 'boxFour', 'boxFive'";

let operationQueue: Promise<unknown> = Promise.resolve();

function withStreakProtectionLock<T>(operation: () => Promise<T>): Promise<T> {
  const run = operationQueue.then(operation, operation);
  operationQueue = run.catch(() => undefined);
  return run;
}

function formatLocalDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDateOnly(dateKey: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (formatLocalDateOnly(date) !== dateKey) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(dateKey: string, days: number): string {
  const date = parseLocalDateOnly(dateKey) ?? new Date();
  date.setDate(date.getDate() + days);
  return formatLocalDateOnly(date);
}

function getTodayKey(nowMs: number): string {
  const date = new Date(nowMs);
  date.setHours(0, 0, 0, 0);
  return formatLocalDateOnly(date);
}

function getYesterdayKey(nowMs: number): string {
  return addDays(getTodayKey(nowMs), -1);
}

function clampShieldCount(value: unknown): 0 | 1 | 2 {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(MAX_STREAK_SHIELDS, Math.floor(value))) as 0 | 1 | 2;
}

function normalizeDate(value: unknown): string {
  return typeof value === "string" && parseLocalDateOnly(value) ? value : "";
}

export function normalizeStreakProtectionState(
  value?: Partial<StreakProtectionState> | null
): StreakProtectionState {
  return {
    streakDays:
      typeof value?.streakDays === "number" && Number.isFinite(value.streakDays)
        ? Math.max(0, Math.floor(value.streakDays))
        : 0,
    shieldCount: clampShieldCount(value?.shieldCount),
    lastActiveDate: normalizeDate(value?.lastActiveDate),
    coveredThroughDate: normalizeDate(value?.coveredThroughDate),
  };
}

async function getActiveDateKeys(): Promise<string[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<{ d: string }>(
    `SELECT strftime('%Y-%m-%d', created_at/1000, 'unixepoch', 'localtime') AS d
     FROM custom_learning_events
     WHERE result = 'ok'
       AND box IN (${ACTIVE_BOXES_SQL})
     GROUP BY d
     ORDER BY d ASC;`
  );
  return rows.map((row) => row.d).filter((dateKey) => parseLocalDateOnly(dateKey));
}

function countRawStreak(activeDates: Set<string>, nowMs: number): number {
  if (activeDates.size === 0) {
    return 0;
  }

  const cursor = new Date(nowMs);
  cursor.setHours(0, 0, 0, 0);
  const todayKey = formatLocalDateOnly(cursor);
  if (!activeDates.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
    const yesterdayKey = formatLocalDateOnly(cursor);
    if (!activeDates.has(yesterdayKey)) {
      return 0;
    }
  }

  let streak = 0;
  while (activeDates.has(formatLocalDateOnly(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function buildInitialState(activeDateKeys: string[], nowMs: number): StreakProtectionState {
  const activeDates = new Set(activeDateKeys);
  const todayKey = getTodayKey(nowMs);
  const lastActiveDate = activeDateKeys[activeDateKeys.length - 1] ?? "";
  return {
    streakDays: countRawStreak(activeDates, nowMs),
    shieldCount: 0,
    lastActiveDate,
    coveredThroughDate: lastActiveDate === todayKey ? todayKey : getYesterdayKey(nowMs),
  };
}

async function readStoredState(
  activeDateKeys: string[],
  nowMs: number,
  options?: { excludeTodayFromInitialState?: boolean }
): Promise<StreakProtectionState> {
  const initialActiveDateKeys = options?.excludeTodayFromInitialState
    ? activeDateKeys.filter((dateKey) => dateKey !== getTodayKey(nowMs))
    : activeDateKeys;
  const raw = await AsyncStorage.getItem(STREAK_PROTECTION_STORAGE_KEY);
  if (!raw) {
    return buildInitialState(initialActiveDateKeys, nowMs);
  }
  try {
    const parsed = JSON.parse(raw) as Partial<StreakProtectionState>;
    const normalized = normalizeStreakProtectionState(parsed);
    if (!normalized.coveredThroughDate) {
      return buildInitialState(initialActiveDateKeys, nowMs);
    }
    return normalized;
  } catch {
    return buildInitialState(initialActiveDateKeys, nowMs);
  }
}

async function persistState(state: StreakProtectionState): Promise<void> {
  await AsyncStorage.setItem(
    STREAK_PROTECTION_STORAGE_KEY,
    JSON.stringify(normalizeStreakProtectionState(state))
  );
}

function reconcileThroughDate(
  state: StreakProtectionState,
  activeDates: Set<string>,
  throughDate: string
): StreakProtectionState {
  if (!throughDate) return state;
  let next = normalizeStreakProtectionState(state);
  if (!next.coveredThroughDate) {
    next.coveredThroughDate = addDays(throughDate, -1);
  }

  let cursor = addDays(next.coveredThroughDate, 1);
  while (cursor <= throughDate) {
    if (activeDates.has(cursor)) {
      if (next.lastActiveDate !== cursor) {
        next = {
          ...next,
          streakDays: next.streakDays + 1,
          shieldCount: clampShieldCount(next.shieldCount + 1),
          lastActiveDate: cursor,
        };
      }
    } else if (next.streakDays > 0) {
      if (next.shieldCount > 0) {
        next = {
          ...next,
          shieldCount: clampShieldCount(next.shieldCount - 1),
        };
      } else {
        next = {
          ...next,
          streakDays: 0,
          shieldCount: 0,
        };
      }
    }

    next.coveredThroughDate = cursor;
    cursor = addDays(cursor, 1);
  }

  return next;
}

async function getReconciledState(nowMs: number): Promise<StreakProtectionState> {
  const activeDateKeys = await getActiveDateKeys();
  const activeDates = new Set(activeDateKeys);
  const state = await readStoredState(activeDateKeys, nowMs);
  return reconcileThroughDate(state, activeDates, getYesterdayKey(nowMs));
}

export async function getProtectedDailyStreakState(
  nowMs: number = Date.now()
): Promise<StreakProtectionState> {
  return withStreakProtectionLock(async () => {
    const state = await getReconciledState(nowMs);
    await persistState(state);
    return state;
  });
}

export async function getProtectedDailyStreakSnapshot(
  nowMs: number = Date.now()
): Promise<ProtectedDailyStreakSnapshot> {
  const state = await getProtectedDailyStreakState(nowMs);
  return {
    streakDays: state.streakDays,
    shieldCount: state.shieldCount,
  };
}

export async function registerProtectedDailyActivity(
  nowMs: number = Date.now()
): Promise<ProtectedDailyStreakSnapshot> {
  return withStreakProtectionLock(async () => {
    const activeDateKeys = await getActiveDateKeys();
    const activeDates = new Set(activeDateKeys);
    const todayKey = getTodayKey(nowMs);
    let state = await readStoredState(activeDateKeys, nowMs, {
      excludeTodayFromInitialState: true,
    });

    state = reconcileThroughDate(state, activeDates, getYesterdayKey(nowMs));

    if (activeDates.has(todayKey) && state.lastActiveDate !== todayKey) {
      state = {
        ...state,
        streakDays: state.streakDays + 1,
        shieldCount: clampShieldCount(state.shieldCount + 1),
        lastActiveDate: todayKey,
        coveredThroughDate: todayKey,
      };
    }

    await persistState(state);
    return {
      streakDays: state.streakDays,
      shieldCount: state.shieldCount,
    };
  });
}

export async function initializeStreakProtectionFromHistory(
  nowMs: number = Date.now()
): Promise<StreakProtectionState> {
  return withStreakProtectionLock(async () => {
    const state = buildInitialState(await getActiveDateKeys(), nowMs);
    await persistState(state);
    return state;
  });
}
