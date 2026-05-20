import AsyncStorage from "@react-native-async-storage/async-storage";

export const LOCAL_EXPORT_REMINDER_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

const FIRST_SEEN_AT_KEY = "localExportReminder.firstSeenAt";
const LAST_PROMPT_SHOWN_AT_KEY = "localExportReminder.lastPromptShownAt";
const LAST_SUCCESSFUL_EXPORT_AT_KEY = "localExportReminder.lastSuccessfulExportAt";

export type LocalExportReminderState = {
  firstSeenAt: number | null;
  lastPromptShownAt: number | null;
  lastSuccessfulExportAt: number | null;
};

function getSafeReminderTimestamp(
  timestamp: number | null,
  now: number
): number | null {
  if (timestamp == null || !Number.isFinite(timestamp) || timestamp < 0) {
    return null;
  }

  return Math.min(timestamp, now);
}

function normalizeTimestamp(value: string | null): number | null {
  if (value == null) return null;

  try {
    const parsed = JSON.parse(value) as unknown;
    return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : null;
  } catch {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}

async function setTimestamp(key: string, value: number): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function ensureLocalExportReminderFirstSeenAt(
  now: number = Date.now()
): Promise<number> {
  const existing = normalizeTimestamp(await AsyncStorage.getItem(FIRST_SEEN_AT_KEY));
  if (existing != null) {
    return existing;
  }

  await setTimestamp(FIRST_SEEN_AT_KEY, now);
  return now;
}

export async function getLocalExportReminderState(): Promise<LocalExportReminderState> {
  const [firstSeenAt, lastPromptShownAt, lastSuccessfulExportAt] =
    await Promise.all([
      AsyncStorage.getItem(FIRST_SEEN_AT_KEY),
      AsyncStorage.getItem(LAST_PROMPT_SHOWN_AT_KEY),
      AsyncStorage.getItem(LAST_SUCCESSFUL_EXPORT_AT_KEY),
    ]);

  return {
    firstSeenAt: normalizeTimestamp(firstSeenAt),
    lastPromptShownAt: normalizeTimestamp(lastPromptShownAt),
    lastSuccessfulExportAt: normalizeTimestamp(lastSuccessfulExportAt),
  };
}

export function shouldShowLocalExportReminder(
  state: LocalExportReminderState,
  now: number = Date.now()
): boolean {
  const exportReferenceAt = state.lastSuccessfulExportAt ?? state.firstSeenAt;
  const exportIsOldEnough =
    exportReferenceAt != null &&
    now - exportReferenceAt >= LOCAL_EXPORT_REMINDER_INTERVAL_MS;

  const promptCooldownPassed =
    state.lastPromptShownAt == null ||
    now - state.lastPromptShownAt >= LOCAL_EXPORT_REMINDER_INTERVAL_MS;

  return exportIsOldEnough && promptCooldownPassed;
}

export function getNextLocalExportReminderCheckAt(
  state: LocalExportReminderState,
  now: number = Date.now()
): number | null {
  const candidates: number[] = [];
  const firstSeenAt = getSafeReminderTimestamp(state.firstSeenAt, now);
  const lastSuccessfulExportAt = getSafeReminderTimestamp(
    state.lastSuccessfulExportAt,
    now
  );
  const lastPromptShownAt = getSafeReminderTimestamp(
    state.lastPromptShownAt,
    now
  );
  const exportReferenceAt = lastSuccessfulExportAt ?? firstSeenAt;

  if (exportReferenceAt != null) {
    candidates.push(exportReferenceAt + LOCAL_EXPORT_REMINDER_INTERVAL_MS);
  }

  if (lastPromptShownAt != null) {
    candidates.push(lastPromptShownAt + LOCAL_EXPORT_REMINDER_INTERVAL_MS);
  }

  if (candidates.length === 0) {
    return null;
  }

  const nextCheckAt = Math.max(...candidates);

  return nextCheckAt > now ? nextCheckAt : now;
}

export async function markLocalExportReminderShown(
  now: number = Date.now()
): Promise<void> {
  await setTimestamp(LAST_PROMPT_SHOWN_AT_KEY, now);
}

export async function markLocalExportCompleted(
  now: number = Date.now()
): Promise<void> {
  await setTimestamp(LAST_SUCCESSFUL_EXPORT_AT_KEY, now);
}
